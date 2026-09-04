import React, { useState, useEffect } from 'react';
import ParlourLobby, { CURATED_MOTIONS } from './components/debate/ParlourLobby';
import DebateStage from './components/debate/DebateStage';
import JuryScoringStage from './components/debate/JuryScoringStage';
import VerdictStage from './components/debate/VerdictStage';
import { useRoomSync } from './services/roomSync';
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

// Clean slate: no hardcoded mock speeches
const INITIAL_TURNS = [];

// Check whether running in development environment
const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || Boolean(import.meta.env?.DEV);

export default function App() {
  // Read room code, role, and stage from URL parameters
  const [roomCode, setRoomCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('code') || params.get('room') || 'HY7X').toUpperCase();
    } catch {
      return 'HY7X';
    }
  });

  const [userRole, setUserRole] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      if (urlRole && ['for', 'against', 'judge'].includes(urlRole)) {
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

  // Support phases: 'lobby' | 'debate' | 'scoring' | 'verdict'
  // DEFAULT FLOW: Normal visits to root '/' start on the clean Parlour lobby!
  const [phase, setPhase] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stageParam = params.get('stage');
      if (stageParam && ['lobby', 'debate', 'scoring', 'verdict'].includes(stageParam)) {
        return stageParam;
      }
      // If code was explicitly passed in URL, skip lobby straight into debate
      if (params.get('code') || params.get('room')) {
        return 'debate';
      }
      return 'lobby';
    } catch {
      return 'lobby';
    }
  });

  const [gameMode, setGameMode] = useState('offline'); // 'offline' | 'online' | 'jury'
  const [initialSeconds, setInitialSeconds] = useState(600); // 600s = 10 min
  const [nameFor, setNameFor] = useState('Alex');
  const [nameAgainst, setNameAgainst] = useState('Sam');
  const [hideRoomCode, setHideRoomCode] = useState(false);

  const [verdict, setVerdict] = useState(null);
  const [devOverlayCollapsed, setDevOverlayCollapsed] = useState(false);

  // Persistent theme in localStorage
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('point_of_order_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('point_of_order_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      sessionStorage.setItem('point_of_order_tab_role', userRole);
    } catch {}
  }, [userRole]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initialize dual-layer real-time room sync
  const roomSync = useRoomSync({
    roomId: roomCode,
    userProfile: { name: userName, role: userRole },
    initialTurns: INITIAL_TURNS
  });

  // Sync phase changes broadcast from peer tabs
  useEffect(() => {
    if (roomSync.roomState?.phase && roomSync.roomState.phase !== phase && phase !== 'lobby') {
      setPhase(roomSync.roomState.phase);
    }
    if (roomSync.roomState?.verdict) {
      setVerdict(roomSync.roomState.verdict);
    }
  }, [roomSync.roomState?.phase, roomSync.roomState?.verdict, phase]);

  const handlePhaseChange = (nextPhase) => {
    setPhase(nextPhase);
    roomSync.broadcastPhase(nextPhase);
  };

  const handleEnterChamberFromLobby = ({
    motion,
    role,
    name,
    nameFor: chosenNameFor,
    nameAgainst: chosenNameAgainst,
    roomCode: chosenCode,
    mode: chosenMode,
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
    const mode = chosenMode || 'offline';
    setGameMode(mode);
    const secs = remainingSeconds || 600;
    setInitialSeconds(secs);

    // Clean slate: Turn 1, Proposition holds opening floor, clocks full, transcript empty
    roomSync.resetDebateState?.({
      remainingFor: secs,
      remainingAgainst: secs,
      turnNo: 1,
      activeSpeaker: 'for',
      prepSeconds: 0,
      transcript: []
    });

    setPhase('debate');
    roomSync.broadcastPhase('debate');
  };

  const handleSubmitJudgement = (judgementVerdict) => {
    setVerdict(judgementVerdict);
    setPhase('verdict');
    roomSync.broadcastVerdict(judgementVerdict);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* DEVELOPMENT OVERLAY:
          Strip out the top simulation bars in production mode (behind isDev flag)
          so normal users enter cleanly via the Parlour lobby and room code flow. */}
      {isDev && (
        <aside
          aria-label="Development Simulation & Role Switcher"
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
            flexWrap: 'wrap',
            transition: 'padding 0.2s ease'
          }}
        >
          {devOverlayCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span className="eyebrow" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                DEV TOOLBAR (STRIPPED IN PRODUCTION) • ROLE: {userRole.toUpperCase()} • STAGE: {phase.toUpperCase()}
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
                Expand Toolbar <ChevronDown size={12} />
              </button>
            </div>
          ) : (
            <>
              {/* Left: Quick Multi-Tab Role Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="eyebrow" style={{ color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <UserCheck size={14} color="var(--brass)" />
                  TAB IDENTITY:
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    background: 'var(--surface)',
                    padding: '2px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--line-strong)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setUserRole('for')}
                    id="role-tab-prop-btn"
                    title="Speak as Proposition (Alex)"
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'for' ? 'var(--for)' : 'transparent',
                      color: userRole === 'for' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'for' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Alex (Prop)
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('against')}
                    id="role-tab-opp-btn"
                    title="Speak as Opposition (Sam)"
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'against' ? 'var(--against)' : 'transparent',
                      color: userRole === 'against' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'against' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Sam (Opp)
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('judge')}
                    id="role-tab-judge-btn"
                    title="Observe with live keystroke draft feed"
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: userRole === 'judge' ? 'var(--brass)' : 'transparent',
                      color: userRole === 'judge' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: userRole === 'judge' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    👁️ Judge (Observer)
                  </button>
                </div>
              </div>

              {/* Center: Stage Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="eyebrow" style={{ color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Layers size={13} color="var(--brass)" />
                  STAGE:
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    background: 'var(--surface)',
                    padding: '2px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--line-strong)'
                  }}
                >
                  <button
                    onClick={() => handlePhaseChange('lobby')}
                    id="sim-phase-lobby-btn"
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: phase === 'lobby' ? 'var(--ink)' : 'transparent',
                      color: phase === 'lobby' ? 'var(--ground)' : 'var(--ink-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Home size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    0. Lobby
                  </button>
                  <button
                    onClick={() => handlePhaseChange('debate')}
                    id="sim-phase-debate-btn"
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: phase === 'debate' ? 'var(--ink)' : 'transparent',
                      color: phase === 'debate' ? 'var(--ground)' : 'var(--ink-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Swords size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    1. Floor
                  </button>
                  <button
                    onClick={() => handlePhaseChange('scoring')}
                    id="sim-phase-scoring-btn"
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: phase === 'scoring' ? 'var(--brass)' : 'transparent',
                      color: phase === 'scoring' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Scale size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    2. Jury
                  </button>
                  <button
                    onClick={() => handlePhaseChange('verdict')}
                    id="sim-phase-verdict-btn"
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-pill)',
                      border: 'none',
                      background: phase === 'verdict' ? 'var(--for)' : 'transparent',
                      color: phase === 'verdict' ? '#ffffff' : 'var(--ink-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Trophy size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    3. Reveal
                  </button>
                </div>
              </div>

              {/* Right: Sync Status & Collapse button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    fontFamily: 'Space Mono, monospace'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--for)' }} />
                  ROOM {roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => setDevOverlayCollapsed(true)}
                  title="Collapse development toolbar"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
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

      {phase === 'debate' && (
        <DebateStage
          motionText={motionText}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onTriggerDeliberation={() => handlePhaseChange('scoring')}
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

      {phase === 'scoring' && (
        <JuryScoringStage
          motionText={motionText}
          nameFor={nameFor}
          nameAgainst={nameAgainst}
          roomCode={roomCode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onBackToDebate={() => handlePhaseChange('debate')}
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
