import React, { useState, useEffect, useCallback } from 'react';
import ParlourLobby, { CURATED_MOTIONS } from './components/debate/ParlourLobby';
import RoomWaitingLobby from './components/debate/RoomWaitingLobby';
import VersusTransition from './components/debate/VersusTransition';
import DebateStage from './components/debate/DebateStage';
import JuryScoringStage from './components/debate/JuryScoringStage';
import DeliberationLoadingScreen from './components/debate/DeliberationLoadingScreen';
import VerdictStage from './components/debate/VerdictStage';
import { useRoomSync, createOnlineRoom, joinOnlineRoom, fetchRoomView } from './services/roomSync';
import { playGavel } from './utils/soundEffects';
import { 
  Flame, 
  Scale, 
  Trophy, 
  Swords, 
  UserCheck, 
  Layers,
  ChevronUp,
  ChevronDown,
  Home
} from 'lucide-react';

const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || Boolean(import.meta.env?.DEV);

const COMMON_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us','should','social','media','government','argue','argument','motion','point','against','agree','disagree','believe','evidence','reason','claim','rebuttal','policy','right','law','state','world','public','country','problem','need'
]);

function isSubstantiveSpeech(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.trim();
  if (cleaned.length < 3) return false;

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1 && words[0].length > 14) return false;

  let recognized = 0;
  for (const w of words) {
    const s = w.replace(/[^a-z]/g, '');
    if (COMMON_WORDS.has(s)) {
      recognized++;
    } else if (s.length >= 3 && s.length <= 13 && /[aeiouy]/.test(s) && !/([a-z])\1{2,}/.test(s)) {
      recognized++;
    }
  }

  return words.length >= 2
    ? (recognized / words.length >= 0.35 && recognized >= 2)
    : (recognized === 1 && COMMON_WORDS.has(words[0]));
}

function generateFallbackVerdict({ motion, nameFor, nameAgainst, transcript = [] }) {
  const forRemarks = transcript.filter((t) => t.side === 'for');
  const againstRemarks = transcript.filter((t) => t.side === 'against');

  const forSubstantive = forRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));
  const againstSubstantive = againstRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));

  // Case 1: Both entered gibberish or empty speeches
  if (!forSubstantive && !againstSubstantive) {
    return {
      winner: 'draw',
      winnerName: 'Draw',
      headline: 'No substantive debate took place.',
      rationale: `Neither speaker placed coherent, substantive arguments on the record regarding "${motion}". Without intelligible claims or reasoned clash, no points can be awarded.`,
      scores: { for: 0, against: 0 },
      for: {
        score: 0,
        strengths: [],
        weaknesses: ['Delivered unintelligible or nonsensical remarks', 'Did not advance arguments on the motion'],
        advice: 'Open with a clear proposition claim and provide at least one supporting reason.'
      },
      against: {
        score: 0,
        strengths: [],
        weaknesses: ['Delivered unintelligible or nonsensical remarks', 'Did not advance counterarguments on the motion'],
        advice: 'Deliver a structured speech directly countering the opposing claims.'
      }
    };
  }

  // Case 2: Only Proposition gave a substantive speech
  if (forSubstantive && !againstSubstantive) {
    return {
      winner: 'for',
      winnerName: nameFor,
      headline: `${nameFor} carries the motion uncontested.`,
      rationale: `${nameFor} put forward an intelligible case on the motion, while ${nameAgainst} failed to provide coherent counter-arguments or clash.`,
      scores: { for: 8, against: 0 },
      for: {
        score: 8,
        strengths: ['Delivered an intelligible constructive argument on the motion'],
        weaknesses: ['Could develop deeper impact analysis'],
        advice: 'Continue establishing clear constructive points.'
      },
      against: {
        score: 0,
        strengths: [],
        weaknesses: ['Failed to present coherent arguments or rebuttal'],
        advice: 'Provide structured counter-arguments directly engaging with the motion.'
      }
    };
  }

  // Case 3: Only Opposition gave a substantive speech
  if (!forSubstantive && againstSubstantive) {
    return {
      winner: 'against',
      winnerName: nameAgainst,
      headline: `${nameAgainst} carries the debate uncontested.`,
      rationale: `${nameAgainst} presented coherent points against the motion, while ${nameFor} failed to put forward an intelligible constructive case.`,
      scores: { for: 0, against: 8 },
      for: {
        score: 0,
        strengths: [],
        weaknesses: ['Failed to present coherent proposition arguments'],
        advice: 'Open with a clear claim explaining why the motion should be adopted.'
      },
      against: {
        score: 8,
        strengths: ['Delivered substantive counterarguments on the floor'],
        weaknesses: ['Could expand comparative impacts'],
        advice: 'Continue pressing on practical and empirical objections.'
      }
    };
  }

  // Case 4: Both gave substantive speeches
  const forWords = forRemarks.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);
  const againstWords = againstRemarks.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);

  let winner = 'draw';
  if (forWords > againstWords * 1.3) winner = 'for';
  else if (againstWords > forWords * 1.3) winner = 'against';

  const winnerName = winner === 'for' ? nameFor : winner === 'against' ? nameAgainst : 'Draw';
  const scoreFor = winner === 'for' ? 8 : winner === 'draw' ? 7 : 6;
  const scoreAgainst = winner === 'against' ? 8 : winner === 'draw' ? 7 : 6;

  return {
    winner,
    winnerName,
    headline: winner === 'draw' ? 'A dead heat on the central clash.' : `${winnerName} carries the motion on argument impact.`,
    rationale: `The debate produced meaningful engagement on "${motion}". ${winner === 'draw' ? 'Both sides presented equally strong foundational cases.' : `${winnerName} offered stronger rebuttal and impact weighing on key points.`}`,
    scores: { for: scoreFor, against: scoreAgainst },
    for: {
      score: scoreFor,
      strengths: ['Constructive argumentation on core motion', 'Engagement with opposing claims'],
      weaknesses: ['Could extend long-term impact analysis'],
      advice: 'Open with your strongest empirical example early in constructive speeches.'
    },
    against: {
      score: scoreAgainst,
      strengths: ['Focused counter-rebuttal', 'Pushed on practical feasibility'],
      weaknesses: ['Could provide broader comparative weighing'],
      advice: 'Structure counter-points with explicit signposting against affirmative claims.'
    }
  };
}

export default function App() {
  const [roomCode, setRoomCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('code') || params.get('room') || '').toUpperCase();
    } catch {
      return '';
    }
  });

  const [userRole, setUserRole] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      if (urlRole && ['for', 'against', 'judge', 'spectator'].includes(urlRole)) {
        return urlRole;
      }
      return sessionStorage.getItem('point_of_order_tab_role') || 'for';
    } catch {
      return 'for';
    }
  });

  const [userName, setUserName] = useState(() => {
    try {
      const stored = localStorage.getItem('point_of_order_username');
      if (stored && stored.trim()) return stored.trim();
    } catch {}
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('code')) {
        return '';
      }
    } catch {}
    return userRole === 'for' ? 'Alex' : (userRole === 'against' ? 'Sam' : 'Judge 1');
  });

  const [motionText, setMotionText] = useState(CURATED_MOTIONS[0]);

  // Phases: 'lobby' | 'room_lobby' | 'transition' | 'debate' | 'deliberating' | 'scoring' | 'verdict'
  const [phase, setPhase] = useState('lobby');

  const [nameFor, setNameFor] = useState('Alex');
  const [nameAgainst, setNameAgainst] = useState('Sam');
  const [hideRoomCode, setHideRoomCode] = useState(false);
  const [gameMode, setGameMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('code')) return 'online';
    } catch {}
    return 'offline';
  });
  const [initialSeconds, setInitialSeconds] = useState(600);
  const [verdict, setVerdict] = useState(null);
  const [devOverlayCollapsed, setDevOverlayCollapsed] = useState(false);
  const [isAdjudicating, setIsAdjudicating] = useState(false);

  // Theme Management
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('point_of_order_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('point_of_order_theme', theme);
    } catch {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Sync tab role with session storage
  useEffect(() => {
    try {
      sessionStorage.setItem('point_of_order_tab_role', userRole);
    } catch {}
  }, [userRole]);

  // Persist user name
  useEffect(() => {
    if (userName && userName.trim()) {
      try {
        localStorage.setItem('point_of_order_username', userName.trim());
      } catch {}
    }
  }, [userName]);

  const isOnlineMode = gameMode === 'online' || gameMode === 'crowd_jury';

  // Hybrid Room Synchronization Hook
  const roomSync = useRoomSync({
    roomId: roomCode,
    userProfile: { name: userName, role: userRole },
    initialTurns: [],
    isOnline: isOnlineMode
  });

  // Sync backend server view updates into debater names, roles, and stages
  useEffect(() => {
    if (roomSync.serverView) {
      const sv = roomSync.serverView;
      if (sv.seats?.for?.name) {
        setNameFor(sv.seats.for.name);
      }
      if (sv.seats?.against?.name) {
        setNameAgainst(sv.seats.against.name);
      }
      if (sv.config?.motion) {
        setMotionText(sv.config.motion);
      }
      if (sv.config?.perSecs) {
        setInitialSeconds(sv.config.perSecs);
      }

      // CRITICAL MULTIPLAYER FIX:
      // Authoritatively synchronize the user's role and name from the server view
      if (sv.you) {
        if (sv.you.side === 'for' || sv.you.side === 'against') {
          setUserRole(sv.you.side);
          const assignedName = sv.you.side === 'for' ? sv.seats?.for?.name : sv.seats?.against?.name;
          if (assignedName && assignedName.trim()) {
            setUserName(assignedName);
          }
        } else if (sv.you.isSpectator) {
          setUserRole('judge');
          if (sv.you.spectatorName && sv.you.spectatorName.trim()) {
            setUserName(sv.you.spectatorName);
          }
        }
      }
    }
  }, [roomSync.serverView]);

  // Browser History & Page Navigation Sync
  const transitionToPhase = useCallback((nextPhase, replace = false) => {
    setPhase(nextPhase);
    try {
      const url = new URL(window.location.href);
      if (nextPhase === 'lobby') {
        url.searchParams.delete('phase');
        if (gameMode === 'offline') url.searchParams.delete('room');
      } else {
        url.searchParams.set('phase', nextPhase);
      }
      if (replace) {
        window.history.replaceState({ phase: nextPhase, gameMode, roomCode }, '', url.toString());
      } else {
        window.history.pushState({ phase: nextPhase, gameMode, roomCode }, '', url.toString());
      }
    } catch {}
  }, [gameMode, roomCode]);

  // Listen to browser Back and Forward navigation buttons
  useEffect(() => {
    // Initialize history state on mount
    try {
      const currentUrl = new URL(window.location.href);
      const urlPhase = currentUrl.searchParams.get('phase');
      const validPhases = ['lobby', 'room_lobby', 'transition', 'debate', 'scoring', 'verdict'];
      const initialPhase = validPhases.includes(urlPhase) ? urlPhase : 'lobby';
      window.history.replaceState({ phase: initialPhase, gameMode, roomCode }, '', currentUrl.toString());
    } catch {}

    const handlePopState = (event) => {
      const state = event.state;
      if (state && state.phase) {
        setPhase(state.phase);
        if (state.gameMode) setGameMode(state.gameMode);
        if (state.roomCode) setRoomCode(state.roomCode);
      } else {
        try {
          const params = new URLSearchParams(window.location.search);
          const p = params.get('phase');
          if (p && ['lobby', 'room_lobby', 'transition', 'debate', 'scoring', 'verdict'].includes(p)) {
            setPhase(p);
          } else {
            setPhase('lobby');
          }
        } catch {
          setPhase('lobby');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [gameMode, roomCode]);

  // Clean exit from any chamber to Parlour Lobby
  const handleLeaveChamber = useCallback(async () => {
    try {
      if (roomSync?.leaveChamber) {
        await roomSync.leaveChamber();
      }
    } catch {}
    setVerdict(null);
    setRoomCode('');
    setGameMode('offline');
    // Drop the room from the URL as well. transitionToPhase only strips it when
    // its own `gameMode` closure already reads 'offline', which it does not on
    // the render that leaves an online chamber -- so the dead code survived in
    // the address bar and pushed the lobby back into "join" on that old room.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('code');
      window.history.replaceState({ phase: 'lobby', gameMode: 'offline', roomCode: '' }, '', url.toString());
    } catch {}
    transitionToPhase('lobby');
  }, [roomSync, transitionToPhase]);

  // Rematch handler across online and offline modes
  const handleRematch = useCallback(async () => {
    setVerdict(null);
    if (isOnlineMode && roomCode) {
      try {
        if (roomSync?.broadcastRematch) {
          await roomSync.broadcastRematch();
        }
      } catch {}
      transitionToPhase('room_lobby');
    } else {
      // Offline rematch: swap seats
      const prevFor = nameFor;
      const prevAgainst = nameAgainst;
      setNameFor(prevAgainst);
      setNameAgainst(prevFor);
      roomSync.resetDebateState?.({
        remainingFor: initialSeconds,
        remainingAgainst: initialSeconds,
        turnNo: 1,
        activeSpeaker: 'for',
        prepSeconds: 0,
        transcript: []
      });
      transitionToPhase('transition');
    }
  }, [isOnlineMode, roomCode, roomSync, nameFor, nameAgainst, initialSeconds, transitionToPhase]);

  const handleSubmitJudgement = useCallback((judgementVerdict) => {
    setVerdict(judgementVerdict);
    transitionToPhase('verdict');
    try {
      playGavel();
    } catch {}
    roomSync.broadcastVerdict?.(judgementVerdict);
  }, [transitionToPhase, roomSync]);

  // Automated AI Adjudication Deliberation
  const handleTriggerAdjudication = useCallback(async () => {
    if (gameMode === 'crowd_jury') {
      transitionToPhase('scoring');
      return;
    }

    transitionToPhase('deliberating');
    setIsAdjudicating(true);

    try {
      const activeTurns = roomSync.roomState?.transcript || [];

      // Guard: if nobody actually typed anything, skip the AI entirely.
      // Sending an empty transcript causes the model to hallucinate speeches.
      const hasRealContent = activeTurns.some(t => t.text && t.text.trim().length > 0);
      if (!hasRealContent) {
        await new Promise(resolve => setTimeout(resolve, 1800)); // brief deliberation delay
        handleSubmitJudgement({
          winner: 'draw',
          headline: 'No speeches were delivered.',
          rationale: null,
          scores: null,
          for: { score: null, strengths: [], weaknesses: [] },
          against: { score: null, strengths: [], weaknesses: [] },
          individualScores: []
        });
        return;
      }

      const fetchPromise = fetch('/api/adjudicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motion: motionText,
          nameFor,
          nameAgainst,
          transcript: activeTurns
        })
      });

      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2600));
      const [res] = await Promise.all([fetchPromise, minDelayPromise]);

      if (!res.ok) {
        throw new Error(`Adjudication service returned status ${res.status}`);
      }

      const aiVerdict = await res.json();
      handleSubmitJudgement(aiVerdict?.verdict || aiVerdict);
    } catch (err) {
      console.warn('Falling back to local adjudication synthesis:', err);
      const activeTurns = roomSync.roomState?.transcript || [];
      const fallback = generateFallbackVerdict({
        motion: motionText,
        nameFor,
        nameAgainst,
        transcript: activeTurns
      });
      // The synthesised verdict decides the winner on word count. It must never
      // be presented as the adjudicator's reasoning -- the screen reads the
      // flag and labels itself accordingly.
      handleSubmitJudgement({
        ...fallback,
        isFallback: true,
        notice: 'The adjudicator could not be reached, so this result was settled locally on the record alone. It is not an AI judgement.'
      });
    } finally {
      setIsAdjudicating(false);
    }
  }, [gameMode, roomSync.roomState?.transcript, motionText, nameFor, nameAgainst, transitionToPhase, handleSubmitJudgement]);

  // Sent once per review phase, not once per poll.
  const readySentRef = React.useRef(false);

  // Sync remote phase changes — ONLY in active online rooms.
  useEffect(() => {
    if (!isOnlineMode || !roomCode || phase === 'lobby') return;
    const remotePhase = roomSync.roomState?.phase;
    if (!remotePhase) return; // null = not yet initialised, ignore
    if (remotePhase !== 'review') readySentRef.current = false;

    if (remotePhase !== phase) {
      if (remotePhase === 'debate' && (phase === 'room_lobby' || phase === 'lobby')) {
        transitionToPhase('transition');
      } else if (remotePhase === 'verdict') {
        transitionToPhase('verdict');
      } else if (remotePhase === 'scoring') {
        transitionToPhase('scoring');
      } else if (remotePhase === 'review') {
        // The room waits here until both speakers confirm they are done with
        // the record. Nothing ever sent that confirmation, so the room stayed
        // in review: the adjudicator was never opened, the verdict could not be
        // stored (setVerdict only applies while judging), and the opponent --
        // on a device that could not see the host's local copy -- was left
        // waiting for a result that never arrived. Jury rooms stalled the same
        // way, with scoring never opening for the panel.
        if (!roomSync.serverView?.you?.isSpectator && !readySentRef.current) {
          readySentRef.current = true;
          roomSync.signalReady?.();
        }
        if (phase !== 'deliberating' && !verdict) transitionToPhase('deliberating');
      } else if (remotePhase === 'judging') {
        const isHost = roomSync.serverView?.you?.isHost ?? (userRole === 'for');
        if (isHost && !isAdjudicating && !verdict) {
          handleTriggerAdjudication();
        } else if (!isHost && phase !== 'deliberating' && !verdict) {
          transitionToPhase('deliberating');
        }
      } else if (remotePhase === 'lobby' && phase !== 'room_lobby' && phase !== 'lobby') {
        // The room was reset (rematch or a new motion). Drop the finished
        // verdict, or the block below drags this client straight back to it.
        setVerdict(null);
        transitionToPhase('room_lobby');
      }
    }
    if (roomSync.roomState?.verdict) {
      setVerdict(roomSync.roomState.verdict);
      if (phase !== 'verdict') {
        transitionToPhase('verdict');
      }
    }
  }, [roomSync.roomState?.phase, roomSync.roomState?.verdict, phase, isOnlineMode, roomCode, transitionToPhase, gameMode, isAdjudicating, verdict, handleTriggerAdjudication, roomSync.serverView?.you?.isHost, userRole]);

  const handlePhaseChange = (nextPhase) => {
    setPhase(nextPhase);
    roomSync.broadcastPhase?.(nextPhase);
  };

  // Enter Chamber from Parlour Lobby
  const handleEnterChamberFromLobby = async ({
    motion,
    role,
    name,
    nameFor: chosenNameFor,
    nameAgainst: chosenNameAgainst,
    roomCode: chosenCode,
    mode: chosenMode,
    action: chosenAction,
    remainingSeconds,
    hideRoomCode: chosenHideCode
  }) => {
    setMotionText(motion);
    setUserRole(role);
    setUserName(name);
    if (chosenNameFor) setNameFor(chosenNameFor);
    if (chosenNameAgainst) setNameAgainst(chosenNameAgainst);
    setRoomCode(chosenCode);
    setHideRoomCode(!!chosenHideCode);
    const mode = chosenMode === 'jury' ? 'crowd_jury' : (chosenMode || 'offline');
    setGameMode(mode);
    const secs = remainingSeconds || 600;
    setInitialSeconds(secs);

    if (mode === 'offline') {
      // Offline mode: proceed straight to Versus transition -> Debate Floor
      roomSync.resetDebateState?.({
        remainingFor: secs,
        remainingAgainst: secs,
        turnNo: 1,
        activeSpeaker: 'for',
        prepSeconds: 0,
        transcript: []
      });
      transitionToPhase('transition');
    } else {
      // Online Chamber or Crowd Jury: Create or Join backend room and enter waiting lobby
      if (chosenAction === 'join') {
        // Look at the room before joining it. An invite link carries only a
        // code, so the joiner's lobby had no idea whether the room was an
        // ordinary chamber or a Crowd Jury, and always tried to take a bench:
        // the third person to open a jury link was turned away with "This room
        // already has two speakers", which made the jury -- the entire point of
        // the mode -- unreachable by link. The room itself is the authority on
        // what it is and what seats are left.
        const preview = await fetchRoomView(chosenCode).catch(() => null);
        const isJuryRoom = !!preview?.config?.judgeMode;
        const benchesFull = !!(preview?.seats?.for?.filled && preview?.seats?.against?.filled);
        const wantsJury = role === 'spectator' || role === 'judge';
        const joinAsJuror = isJuryRoom && (wantsJury || benchesFull);

        if (isJuryRoom) setGameMode('crowd_jury');

        const view = await joinOnlineRoom({
          code: chosenCode,
          name,
          role: joinAsJuror ? 'spectator' : 'player',
          seat: !joinAsJuror && (role === 'for' || role === 'against') ? role : null
        });
        if (!view) {
          throw new Error('Could not join room. Please check the room code.');
        }
        // Trust the room over the lobby's guess for the mode as well.
        setGameMode(view.config?.judgeMode ? 'crowd_jury' : 'online');
        if (view.config?.perSecs) setInitialSeconds(view.config.perSecs);
        if (view.config?.motion) setMotionText(view.config.motion);
        // The server normalises the code; take its word for it, never the input.
        if (view.code) setRoomCode(view.code);
        roomSync.syncServerView?.(view);
        if (view.you?.side) {
          setUserRole(view.you.side);
          const myAssignedName = view.you.side === 'for' ? view.seats?.for?.name : view.seats?.against?.name;
          if (myAssignedName) setUserName(myAssignedName);
        } else if (view.you?.isSpectator) {
          setUserRole('judge');
          if (view.you.spectatorName) setUserName(view.you.spectatorName);
        }
      } else {
        const view = await createOnlineRoom({
          code: chosenCode,
          name,
          motion,
          perSecs: secs,
          judgeMode: mode === 'crowd_jury',
          role: mode === 'crowd_jury' ? (role === 'spectator' || role === 'judge' ? 'spectator' : 'for') : role
        });
        if (!view) {
          throw new Error('Could not create room. Please try again.');
        }
        // The requested code is only a suggestion: if it is already taken the
        // server allocates a different one. Showing the requested code anyway
        // sent invitees to a room the host was not in -- reliably so, because
        // the lobby seeded the next create with the previous room's code, and
        // that room stays alive for six hours. Always adopt the real code.
        if (view.code) setRoomCode(view.code);
        roomSync.syncServerView?.(view);
        if (view.you?.side) {
          setUserRole(view.you.side);
          const myAssignedName = view.you.side === 'for' ? view.seats?.for?.name : view.seats?.against?.name;
          if (myAssignedName) setUserName(myAssignedName);
        } else if (view.you?.isSpectator) {
          setUserRole('judge');
        }
      }

      transitionToPhase('room_lobby');
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dev toolbar (stripped in production) */}
      {isDev && (
        <aside
          aria-label="Development Simulation Toolbar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 90,
            background: 'var(--chamber)',
            borderBottom: '1px solid var(--line-strong)',
            padding: devOverlayCollapsed ? '4px 16px' : '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap'
          }}
        >
          {devOverlayCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span className="eyebrow" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                DEV TOOLBAR • ROLE: {userRole.toUpperCase()} • STAGE: {phase.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setDevOverlayCollapsed(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brass)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Expand <ChevronDown size={12} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="eyebrow" style={{ color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <UserCheck size={14} color="var(--brass)" />
                  TAB ROLE:
                </span>
                <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: '2px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line-strong)' }}>
                  <button
                    type="button"
                    onClick={() => setUserRole('for')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'for' ? 'var(--for)' : 'transparent',
                      color: userRole === 'for' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'for' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Prop (Alex)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('against')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'against' ? 'var(--against)' : 'transparent',
                      color: userRole === 'against' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'against' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Opp (Sam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('judge')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'judge' ? 'var(--brass)' : 'transparent',
                      color: userRole === 'judge' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'judge' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Judge
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDevOverlayCollapsed(true)}
                  title="Collapse toolbar"
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </>
          )}
        </aside>
      )}

      {/* Screen Render */}
      {phase === 'lobby' && (
        <ParlourLobby
          initialMotion={motionText}
          initialRole={userRole}
          initialName={userName}
          initialRoomCode={roomCode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onEnterChamber={handleEnterChamberFromLobby}
        />
      )}

      {phase === 'room_lobby' && (
        <RoomWaitingLobby
          roomCode={roomCode}
          motionText={motionText}
          initialSeconds={initialSeconds}
          gameMode={gameMode}
          userName={userName}
          userRole={userRole}
          roomSync={roomSync}
          onLaunchDebate={() => transitionToPhase('transition')}
          onLeaveChamber={handleLeaveChamber}
          onRoleChange={(newRole) => setUserRole(newRole)}
        />
      )}

      {phase === 'transition' && (
        <VersusTransition
          motionText={motionText}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          initialSeconds={initialSeconds}
          gameMode={gameMode}
          onComplete={() => transitionToPhase('debate')}
        />
      )}

      {phase === 'debate' && (
        <DebateStage
          motionText={motionText}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onTriggerDeliberation={handleTriggerAdjudication}
          onReturnLobby={handleLeaveChamber}
          userRole={userRole}
          userName={userName}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          roomCode={roomCode}
          roomSync={roomSync}
          gameMode={gameMode}
          initialSeconds={initialSeconds}
          initialHideCode={hideRoomCode}
          onConcedeVerdict={handleSubmitJudgement}
        />
      )}

      {phase === 'deliberating' && (
        <DeliberationLoadingScreen isOpen={true} />
      )}

      {phase === 'scoring' && (
        <JuryScoringStage
          motionText={motionText}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          roomCode={roomCode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onBackToDebate={() => transitionToPhase('debate')}
          onSubmitJudgement={handleSubmitJudgement}
          onReturnToMain={handleLeaveChamber}
          turns={roomSync.roomState.transcript || []}
          gameMode={gameMode}
          isOnlineJury={isOnlineMode && gameMode === 'crowd_jury'}
          isJuror={!!roomSync.serverView?.you?.isSpectator}
          hasCastBallot={!!roomSync.serverView?.you?.hasScored}
          jurorsTotal={roomSync.serverView?.spectators?.length || 0}
          jurorsScored={(roomSync.serverView?.spectators || []).filter((s) => s.hasScored).length}
          scoringRemainingMs={roomSync.serverView?.scoringRemainingMs ?? null}
          onCastBallot={roomSync.castJuryBallot}
        />
      )}

      {phase === 'verdict' && verdict && (
        <VerdictStage
          initialSeconds={initialSeconds}
          motionText={motionText}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          roomCode={roomCode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNewDebate={handleLeaveChamber}
          onReturnToMain={handleLeaveChamber}
          onRematch={handleRematch}
          turns={roomSync.roomState.transcript || []}
          judgeCount={gameMode === 'crowd_jury' ? (roomSync.serverView?.spectators?.length || 0) : 0}
          verdict={verdict}
          gameMode={gameMode}
        />
      )}
    </main>
  );
}
