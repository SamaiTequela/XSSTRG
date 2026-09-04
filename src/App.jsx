import React, { useState, useEffect, useCallback } from 'react';
import ParlourLobby, { CURATED_MOTIONS } from './components/debate/ParlourLobby';
import RoomWaitingLobby from './components/debate/RoomWaitingLobby';
import VersusTransition from './components/debate/VersusTransition';
import DebateStage from './components/debate/DebateStage';
import JuryScoringStage from './components/debate/JuryScoringStage';
import DeliberationLoadingScreen from './components/debate/DeliberationLoadingScreen';
import VerdictStage from './components/debate/VerdictStage';
import { useRoomSync, createOnlineRoom, joinOnlineRoom } from './services/roomSync';
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

function generateFallbackVerdict({ motion, nameFor, nameAgainst, transcript = [] }) {
  const forRemarks = transcript.filter((t) => t.side === 'for');
  const againstRemarks = transcript.filter((t) => t.side === 'against');
  const forWords = forRemarks.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);
  const againstWords = againstRemarks.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);

  let winner = 'draw';
  if (forRemarks.length > 0 && againstRemarks.length === 0) winner = 'for';
  else if (againstRemarks.length > 0 && forRemarks.length === 0) winner = 'against';
  else if (forWords > againstWords * 1.2) winner = 'for';
  else if (againstWords > forWords * 1.2) winner = 'against';

  const winnerName = winner === 'for' ? nameFor : winner === 'against' ? nameAgainst : 'Draw';
  const scoreFor = winner === 'for' ? 8 : winner === 'draw' ? 7 : 6;
  const scoreAgainst = winner === 'against' ? 8 : winner === 'draw' ? 7 : 6;

  return {
    winner,
    winnerName,
    headline: winner === 'draw' ? 'The chamber concludes in a deadlock.' : `${winnerName} carries the motion.`,
    rationale: `The debate featured extensive clash over "${motion}". On the balance of substantive rebuttal and argumentation, ${winner === 'draw' ? 'both benches presented equally balanced cases.' : `${winnerName} demonstrated superior framing and sustained clash on the central resolution.`}`,
    scores: { for: scoreFor, against: scoreAgainst },
    for: {
      score: scoreFor,
      strengths: [
        { point: 'Structured affirmative case points', citationQuote: forRemarks[0]?.text?.slice(0, 80) || 'Opening address', turnNo: 1 }
      ],
      weaknesses: [
        { point: 'Could extend comparative impact weighing', citationQuote: forRemarks[forRemarks.length - 1]?.text?.slice(0, 80) || 'Closing remarks', turnNo: forRemarks.length || 1 }
      ]
    },
    against: {
      score: scoreAgainst,
      strengths: [
        { point: 'Targeted rebuttal of proposition claims', citationQuote: againstRemarks[0]?.text?.slice(0, 80) || 'First rebuttal', turnNo: 2 }
      ],
      weaknesses: [
        { point: 'Deepen empirical backing for counterarguments', citationQuote: againstRemarks[againstRemarks.length - 1]?.text?.slice(0, 80) || 'Floor defense', turnNo: againstRemarks.length || 2 }
      ]
    },
    individualScores: [
      { judgeLabel: 'Judge 1', scoreFor, scoreAgainst, remarks: 'Strong argumentation across both benches.' },
      { judgeLabel: 'Judge 2', scoreFor: scoreFor - 1, scoreAgainst: scoreAgainst + (winner === 'draw' ? 0 : 1), remarks: 'Rhetorically persuasive exchanges.' },
      { judgeLabel: 'Judge 3', scoreFor: scoreFor + (winner === 'for' ? 1 : 0), scoreAgainst: scoreAgainst - (winner === 'against' ? 1 : 0), remarks: 'Decision turned on direct clash resolution.' }
    ]
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
    return userRole === 'for' ? 'Alex' : (userRole === 'against' ? 'Sam' : 'Judge 1');
  });

  const [motionText, setMotionText] = useState(CURATED_MOTIONS[0]);

  // Phases: 'lobby' | 'room_lobby' | 'transition' | 'debate' | 'deliberating' | 'scoring' | 'verdict'
  const [phase, setPhase] = useState('lobby');

  const [nameFor, setNameFor] = useState('Alex');
  const [nameAgainst, setNameAgainst] = useState('Sam');
  const [hideRoomCode, setHideRoomCode] = useState(false);
  const [gameMode, setGameMode] = useState('offline'); // 'offline' | 'online' | 'crowd_jury'
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

  const isOnlineMode = gameMode === 'online' || gameMode === 'crowd_jury';

  // Hybrid Room Synchronization Hook
  const roomSync = useRoomSync({
    roomId: roomCode,
    userProfile: { name: userName, role: userRole },
    initialTurns: [],
    isOnline: isOnlineMode
  });

  // Sync backend server view updates into debater names and stages
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
    }
  }, [roomSync.serverView]);

  // Sync remote phase changes
  useEffect(() => {
    const remotePhase = roomSync.roomState?.phase;
    if (remotePhase && remotePhase !== phase) {
      if (remotePhase === 'debate' && phase === 'room_lobby') {
        // Trigger transition screen
        setPhase('transition');
      } else if (remotePhase === 'verdict') {
        setPhase('verdict');
      }
    }
    if (roomSync.roomState?.verdict) {
      setVerdict(roomSync.roomState.verdict);
    }
  }, [roomSync.roomState?.phase, roomSync.roomState?.verdict, phase]);

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
      setPhase('transition');
    } else {
      // Online Chamber or Crowd Jury: Create or Join backend room and enter waiting lobby
      try {
        if (chosenAction === 'join') {
          const view = await joinOnlineRoom({
            code: chosenCode,
            name,
            role: mode === 'crowd_jury' ? (role === 'spectator' || role === 'judge' ? 'spectator' : 'player') : 'player',
            seat: role === 'for' || role === 'against' ? role : null
          });
          if (view) roomSync.syncServerView?.(view);
        } else {
          const view = await createOnlineRoom({
            code: chosenCode,
            name,
            motion,
            perSecs: secs,
            judgeMode: mode === 'crowd_jury',
            role: mode === 'crowd_jury' ? (role === 'spectator' || role === 'judge' ? 'spectator' : 'for') : role
          });
          if (view) roomSync.syncServerView?.(view);
        }
      } catch (err) {
        console.warn('Room enter API call warning:', err);
      }

      setPhase('room_lobby');
    }
  };

  // Automated AI Adjudication Deliberation
  const handleTriggerAdjudication = useCallback(async () => {
    if (gameMode === 'crowd_jury') {
      setPhase('scoring');
      return;
    }

    setPhase('deliberating');
    setIsAdjudicating(true);

    try {
      const activeTurns = roomSync.roomState.transcript || [];
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
      handleSubmitJudgement(aiVerdict);
    } catch (err) {
      console.warn('Falling back to local adjudication synthesis:', err);
      const activeTurns = roomSync.roomState.transcript || [];
      const fallback = generateFallbackVerdict({
        motion: motionText,
        nameFor,
        nameAgainst,
        transcript: activeTurns
      });
      handleSubmitJudgement(fallback);
    } finally {
      setIsAdjudicating(false);
    }
  }, [gameMode, roomSync.roomState.transcript, motionText, nameFor, nameAgainst]);

  const handleSubmitJudgement = (judgementVerdict) => {
    setVerdict(judgementVerdict);
    setPhase('verdict');
    try {
      playGavel();
    } catch {}
    roomSync.broadcastVerdict?.(judgementVerdict);
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
          onLaunchDebate={() => setPhase('transition')}
          onLeaveChamber={() => setPhase('lobby')}
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
          onComplete={() => setPhase('debate')}
        />
      )}

      {phase === 'debate' && (
        <DebateStage
          motionText={motionText}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onTriggerDeliberation={handleTriggerAdjudication}
          onReturnLobby={() => setPhase('lobby')}
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
          onBackToDebate={() => setPhase('debate')}
          onSubmitJudgement={handleSubmitJudgement}
          turns={roomSync.roomState.transcript || []}
          gameMode={gameMode}
        />
      )}

      {phase === 'verdict' && (
        <VerdictStage
          motionText={motionText}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          roomCode={roomCode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNewDebate={() => setPhase('lobby')}
          onRematch={() => {
            roomSync.resetDebateState?.({
              remainingFor: initialSeconds,
              remainingAgainst: initialSeconds,
              turnNo: 1,
              activeSpeaker: 'for',
              prepSeconds: 0,
              transcript: []
            });
            setPhase('debate');
          }}
          turns={roomSync.roomState.transcript || []}
          verdict={verdict}
          gameMode={gameMode}
        />
      )}
    </main>
  );
}
