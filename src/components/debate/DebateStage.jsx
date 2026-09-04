import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Handshake, Check, X } from 'lucide-react';
import DebateHeader from './DebateHeader';
import ChessClocks from './ChessClocks';
import PrepTimeBanner from './PrepTimeBanner';
import SpeakingDispatch from './SpeakingDispatch';
import TranscriptRecord from './TranscriptRecord';
import MobileControlBar from './MobileControlBar';
import TurnHandoffModal from './TurnHandoffModal';
import { playClick, playLowTimeTick, playClockFlagged } from '../../utils/soundEffects';

export function DebateStage({
  userRole = 'for', // 'for' | 'against' | 'judge'
  userName = 'Alex',
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  roomCode = 'HY7X',
  motionText,
  theme = 'light',
  onToggleTheme,
  onTriggerDeliberation,
  onReturnLobby,
  roomSync,
  gameMode = 'offline', // 'offline' | 'online' | 'jury' | 'hotseat'
  initialSeconds = 600,
  initialHideCode = false,
  onConcedeVerdict
}) {
  // Extract state from synchronized room hook if available
  const roomState = roomSync?.roomState || {};
  const turns = roomState.transcript || [];
  const activeSpeaker = roomState.activeSpeaker || 'for';
  const turnNo = roomState.turnNo || (turns.length + 1);

  // In offline mode, the active player on the single device takes the floor
  const isOffline = gameMode === 'offline' || gameMode === 'hotseat';

  // CRITICAL MULTIPLAYER FIX:
  // In online mode, ALWAYS prioritize authoritative seat assignment from the server view.
  // This completely stops debaters from swapping roles or becoming blinded on their own turns.
  const authoritativeRole = !isOffline && roomSync?.serverView?.you
    ? (roomSync.serverView.you.side || (roomSync.serverView.you.isSpectator ? 'judge' : userRole))
    : userRole;
  const effectiveRole = isOffline ? (userRole === 'judge' ? 'judge' : activeSpeaker) : authoritativeRole;

  // Local chess clocks (initialized to full match time, e.g. 600 = 10:00)
  const [remainingFor, setRemainingFor] = useState(roomState.remainingFor ?? initialSeconds);
  const [remainingAgainst, setRemainingAgainst] = useState(roomState.remainingAgainst ?? initialSeconds);
  const [prepSeconds, setPrepSeconds] = useState(roomState.prepSeconds ?? 0);
  const [mobileTab, setMobileTab] = useState('floor'); // 'floor' | 'record'
  const [handoffOpen, setHandoffOpen] = useState(false);

  // Determine if it is currently this tab's turn to speak
  const isMyTurn = effectiveRole === 'judge' ? false : (effectiveRole === activeSpeaker);

  // Accurate debater count for header
  const participantCount = !isOffline && roomSync?.onlineParticipantCount
    ? roomSync.onlineParticipantCount
    : (roomSync?.participants?.length || 1);

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

  // Chess clock countdown for active speaker with low-time audio warnings
  useEffect(() => {
    const timer = setInterval(() => {
      if (prepSeconds > 0) {
        setPrepSeconds((prev) => Math.max(0, prev - 1));
      } else if (activeSpeaker === 'for') {
        setRemainingFor((prev) => {
          if (prev <= 1) {
            playClockFlagged();
            return 0;
          }
          if (prev <= 30 && prev % 2 === 0) {
            playLowTimeTick();
          }
          return prev - 1;
        });
      } else if (activeSpeaker === 'against') {
        setRemainingAgainst((prev) => {
          if (prev <= 1) {
            playClockFlagged();
            return 0;
          }
          if (prev <= 30 && prev % 2 === 0) {
            playLowTimeTick();
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSpeaker, prepSeconds]);

  // Submitting a turn
  const handleSubmitTurn = (text) => {
    const currentName = activeSpeaker === 'for' ? nameFor : nameAgainst;
    const nextSide = activeSpeaker === 'for' ? 'against' : 'for';
    const currentTurnNo = turns.length + 1;
    const nextTurnNo = currentTurnNo + 1;

    const newTurn = {
      id: `turn-${Date.now()}`,
      turnNo: currentTurnNo,
      speaker: currentName,
      side: activeSpeaker,
      text: text,
      isConcession: false
    };

    const nextTranscript = [...turns, newTurn];

    if (roomSync) {
      roomSync.broadcastTurn(newTurn, nextSide, nextTurnNo, {
        remainingFor,
        remainingAgainst
      });
      // Optimistic update for responsive local UI
      roomSync.setRoomState((prev) => ({
        ...prev,
        transcript: nextTranscript,
        activeSpeaker: nextSide,
        turnNo: nextTurnNo,
        prepSeconds: 15,
        remainingFor,
        remainingAgainst
      }));
    }
    if (isOffline) {
      setHandoffOpen(true);
    }
    setPrepSeconds(15);
  };

  const handleSkipPrep = () => {
    playClick();
    // Strict permission check: only active speaker can skip prep and force-start turn
    if (effectiveRole !== activeSpeaker) {
      console.warn(`[SECURITY GUARD] Rejected unauthorized prep skip attempt by '${effectiveRole}'. Active speaker is '${activeSpeaker}'.`);
      return;
    }
    setPrepSeconds(0);
    if (roomSync?.broadcastSkipPrep) {
      roomSync.broadcastSkipPrep();
    } else if (roomSync) {
      roomSync.setRoomState((prev) => ({ ...prev, prepSeconds: 0 }));
    }
  };

  const handleRequestEnd = async () => {
    playClick();
    if (!isOffline && roomSync?.broadcastRequestEnd) {
      await roomSync.broadcastRequestEnd();
      return;
    }
    if (onTriggerDeliberation) {
      onTriggerDeliberation();
    }
  };

  const handleConcede = async () => {
    if (!isOffline && roomSync?.broadcastConcede) {
      const v = await roomSync.broadcastConcede();
      if (v && onConcedeVerdict) {
        onConcedeVerdict(v);
        return;
      }
    }

    const winner = activeSpeaker === 'for' ? 'against' : 'for';
    const winnerName = winner === 'for' ? nameFor : nameAgainst;
    const loserName = activeSpeaker === 'for' ? nameFor : nameAgainst;
    const currentTurnNo = turns.length + 1;

    const concessionVerdict = {
      winner,
      winnerName,
      headline: `${winnerName} wins by concession.`,
      rationale: `${loserName} conceded the debate, bringing the match to an immediate conclusion and awarding victory to ${winnerName}.`,
      scores: { for: winner === 'for' ? 10 : 0, against: winner === 'against' ? 10 : 0 },
      for: {
        score: winner === 'for' ? 10 : 0,
        strengths: winner === 'for' ? [{ point: 'Held the floor until opponent conceded', citationQuote: 'Match concluded by concession', turnNo: currentTurnNo }] : [],
        weaknesses: winner === 'for' ? [] : [{ point: 'Conceded the debate', citationQuote: 'Formal concession', turnNo: currentTurnNo }]
      },
      against: {
        score: winner === 'against' ? 10 : 0,
        strengths: winner === 'against' ? [{ point: 'Held the floor until opponent conceded', citationQuote: 'Match concluded by concession', turnNo: currentTurnNo }] : [],
        weaknesses: winner === 'against' ? [] : [{ point: 'Conceded the debate', citationQuote: 'Formal concession', turnNo: currentTurnNo }]
      },
      individualScores: [
        { judgeLabel: 'Chief Adjudicator', scoreFor: winner === 'for' ? 10 : 0, scoreAgainst: winner === 'against' ? 10 : 0, remarks: `${loserName} conceded the match.` }
      ]
    };

    if (onConcedeVerdict) {
      onConcedeVerdict(concessionVerdict);
    } else if (onTriggerDeliberation) {
      onTriggerDeliberation();
    }
  };

  // Mutual end request from opponent
  const endRequest = roomState.endRequest || roomSync?.serverView?.endRequest;
  const isEndRequestFromOpponent = endRequest && endRequest.from !== effectiveRole;
  const opponentName = effectiveRole === 'for' ? nameAgainst : nameFor;

  return (
    <div className="debate-container debate-stage-fullwidth">
      {/* 1. Masthead & Motion Banner */}
      <DebateHeader
        roomCode={roomCode}
        turnNo={turnNo}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onReturnLobby={onReturnLobby}
        gameMode={gameMode}
        participantCount={participantCount}
        judgeCount={roomSync?.participants?.filter(p => p.role === 'judge').length || 0}
        motionText={motionText}
        initialSeconds={initialSeconds}
        initialHideCode={initialHideCode}
      />

      {/* Incoming Mutual End Proposal Banner */}
      <AnimatePresence>
        {isEndRequestFromOpponent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brass-subtle)',
              border: '1px solid var(--brass-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Handshake size={18} color="var(--brass)" />
              <span style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>
                <strong>{opponentName}</strong> has proposed to conclude the debate early and proceed to adjudication.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => roomSync?.broadcastRespondEnd?.(true)}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--brass)' }}
              >
                <Check size={14} /> Accept & Conclude
              </button>
              <button
                type="button"
                onClick={() => roomSync?.broadcastRespondEnd?.(false)}
                className="btn-ghost"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <X size={14} /> Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Dual Chess Clocks Arena */}
      <ChessClocks
        nameFor={nameFor}
        nameAgainst={nameAgainst}
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
            speakerName={activeSpeaker === 'for' ? nameFor : nameAgainst}
            side={activeSpeaker}
            userRole={effectiveRole}
            onSkipPrep={handleSkipPrep}
          />
        )}
      </AnimatePresence>

      {/* 4. Main Debate Arena: Full-width Split on Desktop, Tabbed on Mobile */}
      <div
        className="debate-workspace"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
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
            height: '100%',
            minWidth: 0
          }}
        >
          <SpeakingDispatch
            currentSpeaker={activeSpeaker === 'for' ? nameFor : nameAgainst}
            side={activeSpeaker}
            isMyTurn={isMyTurn}
            onSubmitTurn={handleSubmitTurn}
            onRequestEnd={handleRequestEnd}
            onConcede={handleConcede}
            disabled={remainingFor === 0 && remainingAgainst === 0}
            onTyping={roomSync?.broadcastTyping}
            opponentTyping={roomSync?.opponentTyping}
            userRole={effectiveRole}
            judgeLiveDraft={roomSync?.judgeLiveDraft}
            gameMode={gameMode}
          />
        </div>

        {/* Right Column: Live Transcript Record */}
        <div
          className="workspace-record"
          style={{
            display: mobileTab === 'record' ? 'flex' : 'block',
            flexDirection: 'column',
            height: '100%',
            minWidth: 0
          }}
        >
          <TranscriptRecord turns={turns} nameFor={nameFor} nameAgainst={nameAgainst} />
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
        nextSpeaker={activeSpeaker === 'for' ? nameFor : nameAgainst}
        side={activeSpeaker}
        remainingTime={activeSpeaker === 'for' ? remainingFor : remainingAgainst}
        onDismiss={() => setHandoffOpen(false)}
      />

      {/* Responsive CSS Overrides for Mobile Dock & Full-Width Workspace */}
      <style>{`
        @media (min-width: 860px) {
          .debate-workspace {
            grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) !important;
            align-items: stretch !important;
          }
          .workspace-floor {
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
          }
          .workspace-record {
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
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

