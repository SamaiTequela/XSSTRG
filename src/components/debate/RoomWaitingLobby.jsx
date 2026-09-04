import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Scale,
  Shield,
  Swords,
  Play,
  ArrowLeft,
  Clock,
  Shuffle,
  AlertCircle
} from 'lucide-react';
import { playClick, playTurnSubmit } from '../../utils/soundEffects';

export function RoomWaitingLobby({
  roomCode,
  motionText,
  initialSeconds = 600,
  gameMode = 'online',
  userName = 'Speaker',
  userRole = 'for',
  roomSync,
  onLaunchDebate,
  onLeaveChamber,
  onRoleChange
}) {
  const [copied, setCopied] = useState(false);
  const [hideCode, setHideCode] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const serverView = roomSync?.serverView;
  const isHost = serverView ? !!serverView.you?.isHost : true;

  // Real-time seats from server view or local fallback
  const seatFor = serverView?.seats?.for || { filled: userRole === 'for', name: userRole === 'for' ? userName : '' };
  const seatAgainst = serverView?.seats?.against || { filled: userRole === 'against', name: userRole === 'against' ? userName : '' };
  const spectators = serverView?.spectators || (userRole === 'spectator' || userRole === 'judge' ? [{ clientId: 'local', name: userName }] : []);

  const isForFilled = !!seatFor.filled;
  const isAgainstFilled = !!seatAgainst.filled;
  const jurorCount = spectators.length;

  const isYouFor = serverView ? serverView.you?.side === 'for' : userRole === 'for';
  const isYouAgainst = serverView ? serverView.you?.side === 'against' : userRole === 'against';
  const isYouJuror = serverView ? !!serverView.you?.isSpectator : (userRole === 'spectator' || userRole === 'judge');

  // Quorum verification
  const is1v1Ready = isForFilled && isAgainstFilled;
  const isCrowdJuryReady = isForFilled && isAgainstFilled && jurorCount >= 1;
  const isQuorumMet = gameMode === 'crowd_jury' ? isCrowdJuryReady : is1v1Ready;

  // Listen for debate launch from server
  useEffect(() => {
    if (serverView?.phase === 'debate') {
      try {
        playTurnSubmit();
      } catch {}
      onLaunchDebate?.();
    }
  }, [serverView?.phase, onLaunchDebate]);

  const handleCopyLink = () => {
    try {
      playClick();
      const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClaimSeat = async (targetSeat) => {
    playClick();
    setSwitchingRole(true);
    try {
      if (roomSync?.switchSeat) {
        await roomSync.switchSeat(targetSeat, userName);
      }
      onRoleChange?.(targetSeat);
    } catch (err) {
      console.warn('Switch seat error:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLaunch = async () => {
    if (!isQuorumMet) return;
    playTurnSubmit();
    try {
      if (roomSync?.startDebate) {
        await roomSync.startDebate();
      }
      onLaunchDebate?.();
    } catch (err) {
      console.warn('Launch debate error:', err);
      onLaunchDebate?.();
    }
  };

  const formatClock = (secs) => {
    const mins = Math.round(secs / 60);
    return `${mins} MIN A SIDE`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg, #0b0c0e)',
        color: 'var(--ink, #f5f5f5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px',
        fontFamily: 'Newsreader, Georgia, serif'
      }}
    >
      {/* Top Bar Navigation */}
      <header
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px'
        }}
      >
        <button
          type="button"
          onClick={() => {
            playClick();
            onLeaveChamber?.();
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--line, rgba(255,255,255,0.12))',
            borderRadius: '999px',
            color: 'var(--ink-muted, #a0a0a0)',
            padding: '7px 14px',
            fontSize: '0.78rem',
            fontFamily: 'Space Mono, monospace',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Exit To Parlour</span>
        </button>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.76rem',
            fontFamily: 'Space Mono, monospace',
            color: 'var(--accent, #d4af37)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isQuorumMet ? '#4caf50' : '#d4af37',
              boxShadow: isQuorumMet ? '0 0 8px #4caf50' : '0 0 8px #d4af37'
            }}
          />
          {gameMode === 'crowd_jury' ? 'CROWD JURY ANTECHAMBER' : 'ONLINE CHAMBER ANTECHAMBER'}
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Chamber Header Card */}
        <section
          style={{
            background: 'var(--surface, #14171d)',
            border: '1px solid var(--line, rgba(255,255,255,0.1))',
            borderRadius: '16px',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  color: 'var(--accent, #d4af37)',
                  textTransform: 'uppercase'
                }}
              >
                PARLIAMENTARY RESOLUTION
              </div>
              <h1
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  margin: '4px 0 0 0',
                  lineHeight: 1.3
                }}
              >
                &ldquo;{motionText}&rdquo;
              </h1>
            </div>

            {/* Room Code Badge & Share */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg, #0b0c0e)',
                  border: '1px solid var(--line, rgba(255,255,255,0.15))',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'Space Mono, monospace', color: 'var(--ink-muted)' }}>CHAMBER CODE</span>
                  <span
                    style={{
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      letterSpacing: '0.15em',
                      color: 'var(--accent, #d4af37)'
                    }}
                  >
                    {hideCode ? '••••' : roomCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setHideCode(!hideCode);
                  }}
                  title={hideCode ? 'Show Code' : 'Hide Code'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {hideCode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: copied ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 175, 55, 0.12)',
                  border: `1px solid ${copied ? 'rgba(76, 175, 80, 0.4)' : 'rgba(212, 175, 55, 0.3)'}`,
                  color: copied ? '#4caf50' : 'var(--accent, #d4af37)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.78rem',
              color: 'var(--ink-muted)',
              borderTop: '1px solid var(--line, rgba(255,255,255,0.06))',
              paddingTop: '12px'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={13} />
              {formatClock(initialSeconds)}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Users size={13} />
              {gameMode === 'crowd_jury' ? `${(isForFilled ? 1 : 0) + (isAgainstFilled ? 1 : 0)} Debaters • ${jurorCount} Judges` : `${(isForFilled ? 1 : 0) + (isAgainstFilled ? 1 : 0)}/2 Debaters`}
            </span>
          </div>
        </section>

        {/* Benches Grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: gameMode === 'crowd_jury' ? '1fr 1fr 1.2fr' : '1fr 1fr',
            gap: '18px'
          }}
        >
          {/* Proposition Bench */}
          <div
            style={{
              background: isForFilled ? 'rgba(46, 125, 50, 0.08)' : 'var(--surface, #14171d)',
              border: `1px solid ${isForFilled ? 'rgba(76, 175, 80, 0.35)' : 'var(--line, rgba(255,255,255,0.1))'}`,
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '180px'
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4caf50', fontFamily: 'Space Mono, monospace', fontSize: '0.76rem', fontWeight: 700 }}>
                  <Shield size={14} />
                  <span>PROPOSITION (FOR)</span>
                </div>
                {isYouFor && (
                  <span style={{ fontSize: '0.68rem', fontFamily: 'Space Mono, monospace', background: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', padding: '2px 8px', borderRadius: '999px' }}>
                    YOU
                  </span>
                )}
              </div>

              {isForFilled ? (
                <div>
                  <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.4rem', fontWeight: 700 }}>
                    {seatFor.name || 'Alex'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Delivers Opening Address (Turn 1)
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--ink-muted)', fontStyle: 'italic', fontSize: '0.95rem', marginTop: '8px' }}>
                  Bench is currently open...
                </div>
              )}
            </div>

            {!isForFilled && !isYouFor && (
              <button
                type="button"
                disabled={switchingRole}
                onClick={() => handleClaimSeat('for')}
                style={{
                  marginTop: '16px',
                  background: 'rgba(76, 175, 80, 0.15)',
                  border: '1px solid rgba(76, 175, 80, 0.35)',
                  color: '#4caf50',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.76rem',
                  fontFamily: 'Space Mono, monospace',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Take Proposition Bench
              </button>
            )}
          </div>

          {/* Opposition Bench */}
          <div
            style={{
              background: isAgainstFilled ? 'rgba(211, 47, 47, 0.08)' : 'var(--surface, #14171d)',
              border: `1px solid ${isAgainstFilled ? 'rgba(244, 67, 54, 0.35)' : 'var(--line, rgba(255,255,255,0.1))'}`,
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '180px'
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f44336', fontFamily: 'Space Mono, monospace', fontSize: '0.76rem', fontWeight: 700 }}>
                  <Swords size={14} />
                  <span>OPPOSITION (AGAINST)</span>
                </div>
                {isYouAgainst && (
                  <span style={{ fontSize: '0.68rem', fontFamily: 'Space Mono, monospace', background: 'rgba(244, 67, 54, 0.2)', color: '#f44336', padding: '2px 8px', borderRadius: '999px' }}>
                    YOU
                  </span>
                )}
              </div>

              {isAgainstFilled ? (
                <div>
                  <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.4rem', fontWeight: 700 }}>
                    {seatAgainst.name || 'Sam'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Rebuttal & Cross-Examination
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--ink-muted)', fontStyle: 'italic', fontSize: '0.95rem', marginTop: '8px' }}>
                  Bench is currently open...
                </div>
              )}
            </div>

            {!isAgainstFilled && !isYouAgainst && (
              <button
                type="button"
                disabled={switchingRole}
                onClick={() => handleClaimSeat('against')}
                style={{
                  marginTop: '16px',
                  background: 'rgba(244, 67, 54, 0.15)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  color: '#f44336',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.76rem',
                  fontFamily: 'Space Mono, monospace',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Take Opposition Bench
              </button>
            )}
          </div>

          {/* Crowd Jury Panel (if Crowd Jury mode) */}
          {gameMode === 'crowd_jury' && (
            <div
              style={{
                background: jurorCount > 0 ? 'rgba(212, 175, 55, 0.08)' : 'var(--surface, #14171d)',
                border: `1px solid ${jurorCount > 0 ? 'rgba(212, 175, 55, 0.35)' : 'var(--line, rgba(255,255,255,0.1))'}`,
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '180px'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent, #d4af37)', fontFamily: 'Space Mono, monospace', fontSize: '0.76rem', fontWeight: 700 }}>
                    <Scale size={14} />
                    <span>JURY PANEL ({jurorCount})</span>
                  </div>
                  {isYouJuror && (
                    <span style={{ fontSize: '0.68rem', fontFamily: 'Space Mono, monospace', background: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent, #d4af37)', padding: '2px 8px', borderRadius: '999px' }}>
                      YOU
                    </span>
                  )}
                </div>

                {jurorCount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {spectators.map((s, idx) => (
                      <div
                        key={s.clientId || idx}
                        style={{
                          fontSize: '0.85rem',
                          fontFamily: 'Space Mono, monospace',
                          color: 'var(--ink, #ffffff)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ color: 'var(--accent, #d4af37)' }}>•</span>
                        <span>{s.name || `Judge ${idx + 1}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-muted)', fontStyle: 'italic', fontSize: '0.95rem', marginTop: '8px' }}>
                    No judges seated yet (min 1 required)...
                  </div>
                )}
              </div>

              {!isYouJuror && (
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleClaimSeat('spectator')}
                  style={{
                    marginTop: '16px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: 'var(--accent, #d4af37)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.76rem',
                    fontFamily: 'Space Mono, monospace',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sit on Jury Bench
                </button>
              )}
            </div>
          )}
        </section>

        {/* Readiness Status & Launch Controls */}
        <section
          style={{
            background: 'var(--surface, #14171d)',
            border: '1px solid var(--line, rgba(255,255,255,0.1))',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isQuorumMet ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                border: `1px solid ${isQuorumMet ? 'rgba(76, 175, 80, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isQuorumMet ? '#4caf50' : 'var(--accent, #d4af37)'
              }}
            >
              {isQuorumMet ? <Check size={18} /> : <AlertCircle size={18} />}
            </div>

            <div>
              <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.05rem', fontWeight: 700 }}>
                {isQuorumMet ? 'Quorum Reached — Ready for Chamber' : 'Waiting for Participants...'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                {gameMode === 'crowd_jury'
                  ? isCrowdJuryReady
                    ? 'Both benches and the jury panel have taken their seats.'
                    : 'Requires 2 debaters (Proposition + Opposition) and at least 1 judge.'
                  : is1v1Ready
                    ? 'Both Proposition and Opposition debaters are seated.'
                    : 'Invite your opponent using the room code or invitation link.'}
              </div>
            </div>
          </div>

          {/* Host Launch or Waiting Note */}
          <div>
            {isHost ? (
              <button
                type="button"
                disabled={!isQuorumMet}
                onClick={handleLaunch}
                style={{
                  background: isQuorumMet ? 'var(--accent, #d4af37)' : 'rgba(255,255,255,0.08)',
                  color: isQuorumMet ? '#0b0c0e' : 'var(--ink-muted)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: isQuorumMet ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isQuorumMet ? '0 4px 20px rgba(212, 175, 55, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Play size={16} fill={isQuorumMet ? '#0b0c0e' : 'none'} />
                <span>Launch Debate</span>
              </button>
            ) : (
              <div
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.82rem',
                  color: 'var(--accent, #d4af37)',
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={14} />
                <span>Waiting for host to launch debate...</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default RoomWaitingLobby;
