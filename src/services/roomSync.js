import { useState, useEffect, useRef, useCallback } from 'react';

// Generates and persists a unique client ID per browser session
export function getSessionClientId() {
  if (typeof window === 'undefined') return 'client_' + Math.random().toString(36).substring(2, 9);
  try {
    let id = sessionStorage.getItem('poo_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('poo_client_id', id);
    }
    return id;
  } catch {
    return 'client_' + Math.random().toString(36).substring(2, 9);
  }
}

export const CLIENT_ID = getSessionClientId();

// API Helpers for /api/room
export async function createOnlineRoom({ code, name, motion, perSecs, judgeMode, role }) {
  const res = await fetch('/api/room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      code,
      name: (name || 'Speaker').trim(),
      motion,
      perSecs: Number(perSecs) || 600,
      judgeMode: !!judgeMode,
      role: role || 'for',
      clientId: CLIENT_ID
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to create chamber (${res.status})`);
  }
  return data.view;
}

export async function joinOnlineRoom({ code, name, role, seat }) {
  const res = await fetch('/api/room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'join',
      code: (code || '').toUpperCase().trim(),
      name: (name || 'Speaker').trim(),
      role: role === 'spectator' ? 'spectator' : 'player',
      seat: seat || null,
      clientId: CLIENT_ID
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to join chamber (${res.status})`);
  }
  return data.view;
}

export async function fetchRoomView(code) {
  if (!code) return null;
  const res = await fetch(`/api/room?code=${encodeURIComponent(code)}&clientId=${encodeURIComponent(CLIENT_ID)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Room not found`);
  }
  return data.view;
}

export async function sendRoomAction(action, code, body = {}) {
  if (!code) return null;
  const res = await fetch('/api/room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      code: (code || '').toUpperCase().trim(),
      clientId: CLIENT_ID,
      ...body
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Action '${action}' failed`);
  }
  return data.view;
}

export function generateInviteLink(code) {
  if (typeof window === 'undefined') return `?room=${code}`;
  return `${window.location.origin}/?room=${encodeURIComponent(code)}`;
}

export function useRoomSync({
  roomId = 'HY7X',
  userProfile = { name: 'Alex', role: 'for' },
  initialTurns = [],
  isOnline = false,
  wsUrl = null
}) {
  const [participants, setParticipants] = useState([]);
  const [serverView, setServerView] = useState(null);
  const [roomState, setRoomState] = useState({
    phase: null, // null = not yet in a debate phase; set explicitly by App
    activeSpeaker: 'for',
    turnNo: 1,
    remainingFor: 600,
    remainingAgainst: 600,
    prepSeconds: 0,
    transcript: initialTurns || [],
    verdict: null,
    endRequest: null,
    concededBy: null
  });

  // Typing status states
  // OPPONENT RECEIVES ONLY: { isTyping: boolean, wordCount: number, speaker: string }
  const [opponentTyping, setOpponentTyping] = useState({ isTyping: false, wordCount: 0, speaker: '' });
  // JUDGE RECEIVES: { isTyping: boolean, text: string, wordCount: number, speaker: string }
  const [judgeLiveDraft, setJudgeLiveDraft] = useState({ isTyping: false, text: '', wordCount: 0, speaker: '' });

  const generalChannelRef = useRef(null);
  const judgeChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastDraftTextRef = useRef('');
  const pollTimerRef = useRef(null);

  // Keep an authoritative reference to the latest roomState for event listeners
  const roomStateRef = useRef(roomState);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const isJudge = userProfile.role === 'judge' || userProfile.role === 'spectator';

  // 1. Initialize Transport Channels (BroadcastChannel for local tabs)
  useEffect(() => {
    if (!roomId) return;
    const generalChannelName = `point-of-order-room-${roomId}`;
    const judgeChannelName = `point-of-order-judge-${roomId}`;

    const generalChannel = new BroadcastChannel(generalChannelName);
    generalChannelRef.current = generalChannel;

    const judgeChannel = new BroadcastChannel(judgeChannelName);
    judgeChannelRef.current = judgeChannel;

    generalChannel.onmessage = (event) => {
      const { type, payload, senderId } = event.data || {};
      if (senderId === CLIENT_ID) return;

      switch (type) {
        case 'JOIN_ROOM':
          setParticipants((prev) => {
            const exists = prev.find((p) => p.clientId === payload.clientId);
            if (exists) return prev;
            return [...prev, payload];
          });
          generalChannel.postMessage({
            type: 'PRESENCE_ANNOUNCE',
            payload: { clientId: CLIENT_ID, name: userProfile.name, role: userProfile.role },
            senderId: CLIENT_ID
          });
          break;

        case 'PRESENCE_ANNOUNCE':
          setParticipants((prev) => {
            const exists = prev.find((p) => p.clientId === payload.clientId);
            if (exists) return prev;
            return [...prev, payload];
          });
          break;

        case 'SYNC_STATE':
          setRoomState((prev) => {
            if ((payload.transcript?.length || 0) >= prev.transcript.length) {
              return { ...prev, ...payload };
            }
            return prev;
          });
          break;

        case 'TURN_SUBMITTED':
          setRoomState((prev) => ({
            ...prev,
            transcript: [...prev.transcript, payload.turn],
            activeSpeaker: payload.nextSpeaker,
            turnNo: payload.turnNo,
            prepSeconds: payload.prepSeconds ?? 0,
            remainingFor: payload.remainingFor ?? prev.remainingFor,
            remainingAgainst: payload.remainingAgainst ?? prev.remainingAgainst
          }));
          setOpponentTyping({ isTyping: false, wordCount: 0, speaker: '' });
          setJudgeLiveDraft({ isTyping: false, text: '', wordCount: 0, speaker: '' });
          break;

        case 'OPPONENT_TYPING_UPDATE':
          setOpponentTyping({
            isTyping: !!payload.isTyping,
            wordCount: payload.wordCount || 0,
            speaker: payload.speaker || ''
          });
          break;

        case 'SKIP_PREP':
          if (payload?.speakerRole && payload.speakerRole === roomStateRef.current.activeSpeaker) {
            setRoomState((prev) => ({
              ...prev,
              prepSeconds: 0
            }));
          }
          break;

        case 'PHASE_CHANGE':
          setRoomState((prev) => ({
            ...prev,
            phase: payload.phase,
            verdict: payload.verdict || prev.verdict
          }));
          break;

        case 'VERDICT_REVEAL':
          setRoomState((prev) => ({
            ...prev,
            phase: 'verdict',
            verdict: payload.verdict
          }));
          break;

        default:
          break;
      }
    };

    if (isJudge) {
      judgeChannel.onmessage = (event) => {
        const { type, payload, senderId } = event.data || {};
        if (senderId === CLIENT_ID) return;

        if (type === 'JUDGE_DRAFT_STREAM') {
          setJudgeLiveDraft({
            isTyping: !!payload.isTyping,
            text: payload.text || '',
            wordCount: payload.wordCount || 0,
            speaker: payload.speaker || ''
          });
        }
      };
    } else {
      judgeChannel.onmessage = null;
    }

    generalChannel.postMessage({
      type: 'JOIN_ROOM',
      payload: { clientId: CLIENT_ID, name: userProfile.name, role: userProfile.role },
      senderId: CLIENT_ID
    });

    return () => {
      generalChannel.close();
      judgeChannel.close();
    };
  }, [roomId, userProfile.name, userProfile.role, isJudge]);

  const syncServerView = useCallback((v) => {
    if (!v) return;
    setServerView(v);

    setRoomState((prev) => {
      const remainingFor = Math.round((v.clock?.remaining?.for ?? 0) / 1000);
      const remainingAgainst = Math.round((v.clock?.remaining?.against ?? 0) / 1000);
      const prepSeconds = v.clock?.prepUntil
        ? Math.max(0, Math.round((v.clock.prepUntil - (v.serverNow || Date.now())) / 1000))
        : 0;

      return {
        ...prev,
        phase: v.phase,
        activeSpeaker: v.clock?.active || prev.activeSpeaker,
        turnNo: v.turnNo || prev.turnNo,
        remainingFor: typeof remainingFor === 'number' && !isNaN(remainingFor) ? remainingFor : prev.remainingFor,
        remainingAgainst: typeof remainingAgainst === 'number' && !isNaN(remainingAgainst) ? remainingAgainst : prev.remainingAgainst,
        prepSeconds,
        transcript: v.transcript || prev.transcript,
        verdict: v.verdict || prev.verdict,
        endRequest: v.endRequest || null,
        concededBy: v.concededBy || null
      };
    });
  }, []);

  useEffect(() => {
    if (!isOnline || !roomId) return;

    let active = true;

    const poll = async () => {
      try {
        const view = await fetchRoomView(roomId);
        if (active && view) {
          syncServerView(view);
        }
      } catch (err) {
        // Silently tolerate transient polling error
      } finally {
        if (active) {
          pollTimerRef.current = setTimeout(poll, 1500);
        }
      }
    };

    poll();

    return () => {
      active = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [isOnline, roomId, syncServerView]);

  // Helper to send message over BroadcastChannel
  const dispatchMessage = useCallback((channel, msg) => {
    channel?.postMessage(msg);
  }, []);

  // 3. Debounced Typing Broadcaster with Security Partitioning
  const broadcastTyping = useCallback((text) => {
    lastDraftTextRef.current = text;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = text.trim() === '' ? 0 : words.length;
    const isTyping = text.trim().length > 0;

    dispatchMessage(generalChannelRef.current, {
      type: 'OPPONENT_TYPING_UPDATE',
      payload: {
        isTyping,
        wordCount,
        speaker: userProfile.role
      },
      senderId: CLIENT_ID
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      dispatchMessage(judgeChannelRef.current, {
        type: 'JUDGE_DRAFT_STREAM',
        payload: {
          isTyping,
          text,
          wordCount,
          speaker: userProfile.role
        },
        senderId: CLIENT_ID
      });
    }, 150);
  }, [dispatchMessage, userProfile.role]);

  // 4. Submit Turn across all tabs & online API
  const broadcastTurn = useCallback(async (turn, nextSpeaker, nextTurnNo, clocks = {}) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    dispatchMessage(generalChannelRef.current, {
      type: 'TURN_SUBMITTED',
      payload: {
        turn,
        nextSpeaker,
        turnNo: nextTurnNo,
        prepSeconds: 0,
        remainingFor: clocks.remainingFor,
        remainingAgainst: clocks.remainingAgainst
      },
      senderId: CLIENT_ID
    });

    dispatchMessage(judgeChannelRef.current, {
      type: 'JUDGE_DRAFT_STREAM',
      payload: { isTyping: false, text: '', wordCount: 0, speaker: '' },
      senderId: CLIENT_ID
    });

    if (isOnline && roomId) {
      try {
        const v = await sendRoomAction('turn', roomId, {
          text: turn.text,
          passed: !!turn.passed,
          flagged: !!turn.flagged
        });
        if (v) syncServerView(v);
      } catch (err) {
        console.warn('Online submit turn error:', err);
      }
    }
  }, [dispatchMessage, isOnline, roomId, syncServerView]);

  // 5. Skip Prep Time
  const broadcastSkipPrep = useCallback(async () => {
    const currentActive = roomStateRef.current.activeSpeaker;
    if (userProfile.role !== currentActive) {
      return false;
    }

    dispatchMessage(generalChannelRef.current, {
      type: 'SKIP_PREP',
      payload: {
        speakerRole: userProfile.role,
        clientId: CLIENT_ID
      },
      senderId: CLIENT_ID
    });

    setRoomState((prev) => ({
      ...prev,
      prepSeconds: 0
    }));

    if (isOnline && roomId) {
      try {
        const v = await sendRoomAction('speak', roomId);
        if (v) syncServerView(v);
      } catch (err) {
        console.warn('Online skip prep error:', err);
      }
    }

    return true;
  }, [userProfile.role, dispatchMessage, isOnline, roomId, syncServerView]);

  // 6. Concede
  const broadcastConcede = useCallback(async () => {
    if (isOnline && roomId) {
      try {
        const v = await sendRoomAction('concede', roomId);
        if (v) {
          syncServerView(v);
          return v.verdict;
        }
      } catch (err) {
        console.warn('Online concede error:', err);
      }
    }
    return null;
  }, [isOnline, roomId, syncServerView]);

  // 7. Request End & Mutual End
  const broadcastRequestEnd = useCallback(async () => {
    if (isOnline && roomId) {
      try {
        const v = await sendRoomAction('requestEnd', roomId);
        if (v) syncServerView(v);
      } catch (err) {
        console.warn('Online requestEnd error:', err);
      }
    }
  }, [isOnline, roomId, syncServerView]);

  const broadcastRespondEnd = useCallback(async (accept) => {
    if (isOnline && roomId) {
      try {
        const v = await sendRoomAction('respondEnd', roomId, { accept });
        if (v) syncServerView(v);
      } catch (err) {
        console.warn('Online respondEnd error:', err);
      }
    }
  }, [isOnline, roomId, syncServerView]);

  // 8. Switch Seat in Lobby
  const switchSeat = useCallback(async (targetSeat, name) => {
    if (isOnline && roomId) {
      const v = await sendRoomAction('switchSeat', roomId, { seat: targetSeat, name });
      if (v) syncServerView(v);
      return v;
    }
    return null;
  }, [isOnline, roomId, syncServerView]);

  // 9. Start Debate
  const startDebate = useCallback(async () => {
    if (isOnline && roomId) {
      const v = await sendRoomAction('start', roomId);
      if (v) syncServerView(v);
      return v;
    }
    return null;
  }, [isOnline, roomId, syncServerView]);

  // 10. Verdict Broadcast
  const broadcastVerdict = useCallback(async (verdict) => {
    dispatchMessage(generalChannelRef.current, {
      type: 'VERDICT_REVEAL',
      payload: { verdict },
      senderId: CLIENT_ID
    });
    setRoomState((prev) => ({
      ...prev,
      phase: 'verdict',
      verdict
    }));

    if (isOnline && roomId) {
      try {
        await sendRoomAction('setVerdict', roomId, { verdict, notice: null });
      } catch (err) {
        console.warn('Online setVerdict error:', err);
      }
    }
  }, [dispatchMessage, isOnline, roomId]);

  // 11. Reset State (used for new game / rematch)
  const resetDebateState = useCallback((newState = {}) => {
    const fresh = {
      phase: 'debate',       // always reset to active debate phase
      activeSpeaker: 'for',
      turnNo: 1,
      remainingFor: newState.remainingFor || 600,
      remainingAgainst: newState.remainingAgainst || 600,
      prepSeconds: newState.prepSeconds ?? 0,
      transcript: [],
      verdict: null,         // clear any previous verdict
      endRequest: null,
      concededBy: null,
      ...newState
    };
    setRoomState(fresh);
    dispatchMessage(generalChannelRef.current, {
      type: 'SYNC_STATE',
      payload: fresh,
      senderId: CLIENT_ID
    });
  }, [dispatchMessage]);

  return {
    clientId: CLIENT_ID,
    participants,
    serverView,
    roomState,
    setRoomState,
    opponentTyping,
    judgeLiveDraft,
    broadcastTyping,
    broadcastTurn,
    broadcastSkipPrep,
    broadcastConcede,
    broadcastRequestEnd,
    broadcastRespondEnd,
    broadcastVerdict,
    onlineParticipantCount: serverView ? (
      (serverView.seats?.for?.filled ? 1 : 0) +
      (serverView.seats?.against?.filled ? 1 : 0) +
      (serverView.spectators?.length || 0)
    ) : (participants.length || 1),
    switchSeat,
    startDebate,
    resetDebateState,
    syncServerView
  };
}
