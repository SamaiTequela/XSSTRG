import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DebateHeader from './DebateHeader';
import ChessClocks from './ChessClocks';
import PrepTimeBanner from './PrepTimeBanner';
import SpeakingDispatch from './SpeakingDispatch';
import TranscriptRecord from './TranscriptRecord';
import MobileControlBar from './MobileControlBar';
import TurnHandoffModal from './TurnHandoffModal';

export function DebateStage({
  userRole = 'for', // 'for' | 'against' | 'judge'
  userName = 'Alex',
  roomCode = 'HY7X',
  motionText,
  theme = 'light',
  onToggleTheme,
  onTriggerDeliberation,
  onReturnLobby,
  roomSync
}) {
  // Extract state from synchronized room hook if available
  const roomState = roomSync?.roomState || {};
  const turns = roomState.transcript || [];
  const activeSpeaker = roomState.activeSpeaker || 'for';
  const turnNo = roomState.turnNo || (turns.length + 1);

  // Local chess clocks (or synced via roomState)
  const [remainingFor, setRemainingFor] = useState(roomState.remainingFor ?? 262);
  const [remainingAgainst, setRemainingAgainst] = useState(roomState.remainingAgainst ?? 238);
  const [prepSeconds, setPrepSeconds] = useState(roomState.prepSeconds ?? 0);
  const [mobileTab, setMobileTab] = useState('floor'); // 'floor' | 'record'
  const [handoffOpen, setHandoffOpen] = useState(false);

  // Determine if it is currently this tab's turn to speak
  const isMyTurn = userRole === 'judge' ? false : (userRole === activeSpeaker);

  // Synchronize incoming roomState clocks
  useEffect(() => {
    if (typeof roomState.remainingFor === 'number') {
      setRemainingFor(roomState.remainingFor);
    }
    if (typeof roomState.remainingAgainst === 'number') {
      setRemainingAgainst(roomState.remainingAgainst);
    }
    if (typeof roomState.prepSeconds === 'number') {
      setPrepSeconds(roomState.prepSeconds);
    }
  }, [roomState.remainingFor, roomState.remainingAgainst, roomState.prepSeconds]);

  // Chess clock countdown for active speaker
  useEffect(() => {
    const timer = setInterval(() => {
      if (prepSeconds > 0) {
        setPrepSeconds((prev) => Math.max(0, prev - 1));
      } else if (activeSpeaker === 'for') {
        setRemainingFor((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (activeSpeaker === 'against') {
        setRemainingAgainst((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSpeaker, prepSeconds]);

  // Submitting a turn
  const handleSubmitTurn = (text) => {
    const currentName = activeSpeaker === 'for' ? 'Alex' : 'Sam';
    const nextSide = activeSpeaker === 'for' ? 'against' : 'for';
    const nextTurnNo = turnNo + 1;

    const newTurn = {
      id: `turn-${Date.now()}`,
      turnNo: turnNo,
      speaker: currentName,
      side: activeSpeaker,
      text: text,
      isConcession: false
    };

    if (roomSync) {
      roomSync.broadcastTurn(newTurn, nextSide, nextTurnNo, {
        remainingFor,
        remainingAgainst
      });
      // Also update local state
      roomSync.setRoomState((prev) => ({
        ...prev,
        transcript: [...prev.transcript, newTurn],
        activeSpeaker: nextSide,
        turnNo: nextTurnNo,
        prepSeconds: 15,
        remainingFor,
        remainingAgainst
      }));
    }
  };

  const handleSkipPrep = () => {
    // Strict permission check: only active speaker can skip prep and force-start turn
    if (userRole !== activeSpeaker) {
      console.warn(`[SECURITY GUARD] Rejected unauthorized prep skip attempt by '${userRole}'. Active speaker is '${activeSpeaker}'.`);
      return;
    }
    setPrepSeconds(0);
    if (roomSync?.broadcastSkipPrep) {
      roomSync.broadcastSkipPrep();
    } else if (roomSync) {
      roomSync.setRoomState((prev) => ({ ...prev, prepSeconds: 0 }));
    }
  };

  const handleRequestEnd = () => {
    if (onTriggerDeliberation) {
      onTriggerDeliberation();
    }
  };

  const handleConcede = () => {
    const currentName = activeSpeaker === 'for' ? 'Alex' : 'Sam';
    const nextSide = activeSpeaker === 'for' ? 'against' : 'for';
    const nextTurnNo = turnNo + 1;

    const newTurn = {
      id: `turn-${Date.now()}`,
      turnNo: turnNo,
      speaker: currentName,
      side: activeSpeaker,
      text: "[Conceded this exchange]",
      isConcession: true
    };

    if (roomSync) {
      roomSync.broadcastTurn(newTurn, nextSide, nextTurnNo, {
        remainingFor,
        remainingAgainst
      });
      roomSync.setRoomState((prev) => ({
        ...prev,
        transcript: [...prev.transcript, newTurn],
        activeSpeaker: nextSide,
        turnNo: nextTurnNo,
        prepSeconds: 10,
        remainingFor,
        remainingAgainst
      }));
    }
  };

  return (
    <div className="debate-container">
      {/* 1. Masthead & Motion Banner */}
      <DebateHeader
        roomCode={roomCode}
        turnNo={turnNo}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onReturnLobby={onReturnLobby}
        judgeCount={3}
        motionText={motionText}
      />

      {/* 2. Dual Chess Clocks Arena */}
      <ChessClocks
        nameFor="Alex"
        nameAgainst="Sam"
        remainingFor={remainingFor}
        remainingAgainst={remainingAgainst}
        activeSpeaker={activeSpeaker}
        turnNo={turnNo}
        prepUntil={prepSeconds > 0}
        isFlaggedFor={remainingFor === 0}
        isFlaggedAgainst={remainingAgainst === 0}
      />

      {/* 3. Prep Time Banner (Conditional with strict role authorization) */}
      <AnimatePresence>
        {prepSeconds > 0 && (
          <PrepTimeBanner
            prepSecondsLeft={prepSeconds}
            speakerName={activeSpeaker === 'for' ? 'Alex' : 'Sam'}
            side={activeSpeaker}
            userRole={userRole}
            onSkipPrep={handleSkipPrep}
          />
        )}
      </AnimatePresence>

      {/* 4. Main Debate Arena: Split on Desktop, Tabbed on Mobile */}
      <div
        className="debate-workspace"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'clamp(16px, 2vw, 24px)',
          alignItems: 'stretch'
        }}
      >
        {/* Left/Center Column: Speaking Dispatch Floor */}
        <div
          className="workspace-floor"
          style={{
            display: mobileTab === 'floor' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <SpeakingDispatch
            currentSpeaker={activeSpeaker === 'for' ? 'Alex' : 'Sam'}
            side={activeSpeaker}
            isMyTurn={isMyTurn}
            onSubmitTurn={handleSubmitTurn}
            onRequestEnd={handleRequestEnd}
            onConcede={handleConcede}
            disabled={remainingFor === 0 && remainingAgainst === 0}
            onTyping={roomSync?.broadcastTyping}
            opponentTyping={roomSync?.opponentTyping}
            userRole={userRole}
            judgeLiveDraft={roomSync?.judgeLiveDraft}
          />
        </div>

        {/* Right Column: Live Transcript Record */}
        <div
          className="workspace-record"
          style={{
            display: mobileTab === 'record' ? 'flex' : 'block',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <TranscriptRecord turns={turns} />
        </div>
      </div>

      {/* Mobile Fixed Control Bar */}
      <div className="mobile-only-dock">
        <MobileControlBar
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          turnCount={turns.length}
          isMyTurn={isMyTurn}
          canSubmit={isMyTurn}
          onSubmitTurn={() => {
            const textarea = document.getElementById('speech');
            if (textarea && textarea.value.trim()) {
              handleSubmitTurn(textarea.value);
              textarea.value = '';
            }
          }}
        />
      </div>

      {/* Turn Handoff Modal (Single device hotseat fallback) */}
      <TurnHandoffModal
        isOpen={handoffOpen}
        nextSpeaker={activeSpeaker === 'for' ? 'Alex' : 'Sam'}
        side={activeSpeaker}
        remainingTime={activeSpeaker === 'for' ? remainingFor : remainingAgainst}
        onDismiss={() => setHandoffOpen(false)}
      />

      {/* Responsive CSS Overrides for Mobile Dock & Workspace */}
      <style>{`
        @media (min-width: 860px) {
          .debate-workspace {
            grid-template-columns: 1.15fr 1fr !important;
          }
          .workspace-floor {
            display: block !important;
          }
          .workspace-record {
            display: block !important;
          }
          .mobile-only-dock {
            display: none !important;
          }
        }
        @media (max-width: 859px) {
          .mobile-only-dock {
            display: block !important;
          }
          .debate-workspace {
            margin-bottom: 70px;
          }
        }
      `}</style>
    </div>
  );
}

export default DebateStage;
