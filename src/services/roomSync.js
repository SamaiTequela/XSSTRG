import { useState, useEffect, useRef, useCallback } from 'react';

// Generates a unique client ID per tab session
const CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 9);

export function useRoomSync({
  roomId = 'HY7X',
  userProfile = { name: 'Alex', role: 'for' },
  initialTurns = [],
  wsUrl = null
}) {
  const [participants, setParticipants] = useState([]);
  const [roomState, setRoomState] = useState({
    phase: 'debate',
    activeSpeaker: 'for',
    turnNo: 1,
    remainingFor: 300,
    remainingAgainst: 300,
    prepSeconds: 0,
    transcript: initialTurns || [],
    verdict: null
  });

  // Typing status states
  // OPPONENT RECEIVES ONLY: { isTyping: boolean, wordCount: number, speaker: string }
  const [opponentTyping, setOpponentTyping] = useState({ isTyping: false, wordCount: 0, speaker: '' });
  // JUDGE RECEIVES: { isTyping: boolean, text: string, wordCount: number, speaker: string }
  const [judgeLiveDraft, setJudgeLiveDraft] = useState({ isTyping: false, text: '', wordCount: 0, speaker: '' });

  const generalChannelRef = useRef(null);
  const judgeChannelRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastDraftTextRef = useRef('');

  // Keep an authoritative reference to the latest roomState for event listeners
  const roomStateRef = useRef(roomState);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const isJudge = userProfile.role === 'judge';

  // 1. Initialize Transport Channels (BroadcastChannel + WebSocket dual layer)
  useEffect(() => {
    const generalChannelName = `point-of-order-room-${roomId}`;
    const judgeChannelName = `point-of-order-judge-${roomId}`;

    // A. General BroadcastChannel (State, Turns, Blinded Typing Indicator)
    const generalChannel = new BroadcastChannel(generalChannelName);
    generalChannelRef.current = generalChannel;

    // B. Judge BroadcastChannel (Live Keystroke Draft Stream)
    // Both active speakers (to send) and judges (to receive) need a handle
    const judgeChannel = new BroadcastChannel(judgeChannelName);
    judgeChannelRef.current = judgeChannel;

    // Handle messages on the general channel
    generalChannel.onmessage = (event) => {
      const { type, payload, senderId } = event.data || {};
      if (senderId === CLIENT_ID) return; // Discard own messages

      switch (type) {
        case 'JOIN_ROOM':
          setParticipants((prev) => {
            const exists = prev.find((p) => p.clientId === payload.clientId);
            if (exists) return prev;
            return [...prev, payload];
          });
          // Reply with presence
          generalChannel.postMessage({
            type: 'PRESENCE_ANNOUNCE',
            payload: { clientId: CLIENT_ID, name: userProfile.name, role: userProfile.role },
            senderId: CLIENT_ID
          });
          // Also broadcast current room state if we have turns
          setRoomState((current) => {
            if (current.transcript.length > 0) {
              generalChannel.postMessage({
                type: 'SYNC_STATE',
                payload: current,
                senderId: CLIENT_ID
              });
            }
            return current;
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
            // Adopt whichever state has more recent turns or higher turn number
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
            prepSeconds: payload.prepSeconds ?? 15,
            remainingFor: payload.remainingFor ?? prev.remainingFor,
            remainingAgainst: payload.remainingAgainst ?? prev.remainingAgainst
          }));
          // Reset typing indicators
          setOpponentTyping({ isTyping: false, wordCount: 0, speaker: '' });
          setJudgeLiveDraft({ isTyping: false, text: '', wordCount: 0, speaker: '' });
          break;

        case 'OPPONENT_TYPING_UPDATE':
          // SECURITY GUARANTEE:
          // The general channel payload contains strictly { isTyping, wordCount, speaker }
          // Raw text is strictly forbidden here
          setOpponentTyping({
            isTyping: !!payload.isTyping,
            wordCount: payload.wordCount || 0,
            speaker: payload.speaker || ''
          });
          break;

        case 'SKIP_PREP':
          // SERVER/HOOK GUARD:
          // Ignore any SKIP_PREP socket/broadcast events that do not originate from the authorized active speaker!
          if (payload?.speakerRole && payload.speakerRole === roomStateRef.current.activeSpeaker) {
            setRoomState((prev) => ({
              ...prev,
              prepSeconds: 0
            }));
          } else {
            console.warn(`[SECURITY GUARD] Ignored unauthorized SKIP_PREP broadcast from '${payload?.speakerRole}'. Current authorized speaker is '${roomStateRef.current.activeSpeaker}'.`);
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

    // SECURITY ENFORCEMENT:
    // Only subscribe to the judge channel if this client is VERIFIED as a judge.
    // Opponent clients (role !== 'judge') NEVER register a listener for draft text payloads.
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

    // C. Optional WebSocket Connection (Layer 2 Fallback)
    const targetWsUrl = wsUrl || (typeof window !== 'undefined' && window.__WS_URL__);
    if (targetWsUrl) {
      try {
        const ws = new WebSocket(targetWsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Route message into generalChannel listener
            if (generalChannel.onmessage) {
              generalChannel.onmessage({ data });
            }
          } catch (e) {
            console.warn('WS message parse error:', e);
          }
        };
      } catch (err) {
        console.warn('WebSocket connection not active, using BroadcastChannel:', err);
      }
    }

    // Announce join to peer tabs
    generalChannel.postMessage({
      type: 'JOIN_ROOM',
      payload: { clientId: CLIENT_ID, name: userProfile.name, role: userProfile.role },
      senderId: CLIENT_ID
    });

    return () => {
      generalChannel.close();
      judgeChannel.close();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId, userProfile.name, userProfile.role, isJudge, wsUrl]);

  // Helper to send message over both BroadcastChannel and WebSocket if open
  const dispatchMessage = useCallback((channel, msg) => {
    channel?.postMessage(msg);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch {}
    }
  }, []);

  // 2. Debounced Typing Broadcaster with Security Partitioning
  const broadcastTyping = useCallback((text) => {
    lastDraftTextRef.current = text;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = text.trim() === '' ? 0 : words.length;
    const isTyping = text.trim().length > 0;

    // Send immediately to general channel (strictly sanitized metadata)
    dispatchMessage(generalChannelRef.current, {
      type: 'OPPONENT_TYPING_UPDATE',
      payload: {
        isTyping,
        wordCount,
        speaker: userProfile.role === 'for' ? 'Alex' : 'Sam'
      },
      senderId: CLIENT_ID
    });

    // Send full raw text payload STRICTLY to Judge channel
    dispatchMessage(judgeChannelRef.current, {
      type: 'JUDGE_DRAFT_STREAM',
      payload: {
        isTyping,
        text,
        wordCount,
        speaker: userProfile.role === 'for' ? 'Alex' : 'Sam'
      },
      senderId: CLIENT_ID
    });

    // Reset inactivity timer: if user stops typing for 2.8 seconds, mark as not typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        dispatchMessage(generalChannelRef.current, {
          type: 'OPPONENT_TYPING_UPDATE',
          payload: {
            isTyping: false,
            wordCount,
            speaker: userProfile.role === 'for' ? 'Alex' : 'Sam'
          },
          senderId: CLIENT_ID
        });

        dispatchMessage(judgeChannelRef.current, {
          type: 'JUDGE_DRAFT_STREAM',
          payload: {
            isTyping: false,
            text: lastDraftTextRef.current,
            wordCount,
            speaker: userProfile.role === 'for' ? 'Alex' : 'Sam'
          },
          senderId: CLIENT_ID
        });
      }, 2800);
    }
  }, [userProfile.role, dispatchMessage]);

  // 3. Submit Turn across all tabs
  const broadcastTurn = useCallback((turn, nextSpeaker, nextTurnNo, clocks = {}) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast turn to general channel
    dispatchMessage(generalChannelRef.current, {
      type: 'TURN_SUBMITTED',
      payload: {
        turn,
        nextSpeaker,
        turnNo: nextTurnNo,
        prepSeconds: 15,
        remainingFor: clocks.remainingFor,
        remainingAgainst: clocks.remainingAgainst
      },
      senderId: CLIENT_ID
    });

    // Clear judge draft
    dispatchMessage(judgeChannelRef.current, {
      type: 'JUDGE_DRAFT_STREAM',
      payload: { isTyping: false, text: '', wordCount: 0, speaker: '' },
      senderId: CLIENT_ID
    });
  }, [dispatchMessage]);

  // 3b. Skip Prep Time (Strict active speaker authorization guard)
  const broadcastSkipPrep = useCallback(() => {
    const currentActive = roomStateRef.current.activeSpeaker;
    if (userProfile.role !== currentActive) {
      console.warn(`[SECURITY GUARD] Rejected attempt by '${userProfile.role}' to skip prep. Authorized speaker is '${currentActive}'.`);
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

    return true;
  }, [userProfile.role, dispatchMessage]);

  // 4. Phase Changes (Debate -> Deliberation -> Verdict)
  const broadcastPhase = useCallback((phase, verdict = null) => {
    dispatchMessage(generalChannelRef.current, {
      type: 'PHASE_CHANGE',
      payload: { phase, verdict },
      senderId: CLIENT_ID
    });
  }, [dispatchMessage]);

  // 5. Verdict Reveal
  // 6. Reset Debate State (for starting new clean room)
  const resetDebateState = useCallback((newState = {}) => {
    const fresh = {
      phase: 'debate',
      activeSpeaker: 'for',
      turnNo: 1,
      remainingFor: newState.remainingFor || 300,
      remainingAgainst: newState.remainingAgainst || 300,
      prepSeconds: newState.prepSeconds ?? 0,
      transcript: [],
      verdict: null,
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
    roomState,
    setRoomState,
    opponentTyping,
    judgeLiveDraft,
    broadcastTyping,
    broadcastTurn,
    broadcastSkipPrep,
    broadcastPhase,
    broadcastVerdict,
    resetDebateState
  };
}
