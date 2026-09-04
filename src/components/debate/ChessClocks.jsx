import React from 'react';
import { motion } from 'motion/react';
import { Mic, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

function formatSeconds(secs) {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ChessClocks({
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  remainingFor = 274, // in seconds
  remainingAgainst = 241,
  activeSpeaker = 'for', // 'for' | 'against' | null
  turnNo = 3,
  prepUntil = null,
  isFlaggedFor = false,
  isFlaggedAgainst = false
}) {
  const isForActive = activeSpeaker === 'for';
  const isAgainstActive = activeSpeaker === 'against';

  const isLowTimeFor = remainingFor <= 45 && !isFlaggedFor;
  const isLowTimeAgainst = remainingAgainst <= 45 && !isFlaggedAgainst;

  return (
    <div
      className="chess-clock-arena"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'stretch',
        gap: '0',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {/* Proposition Clock (For the Motion) */}
      <motion.div
        animate={{
          backgroundColor: isForActive ? 'var(--for-bg)' : 'var(--surface)',
          borderColor: isForActive ? 'var(--for)' : 'transparent'
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          padding: 'clamp(14px, 2.5vw, 22px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderTop: isForActive ? '4px solid var(--for)' : '4px solid transparent',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Speaker Meta & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--for)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}
          >
            {nameFor.charAt(0)}
          </div>
          <span
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontWeight: 700,
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'var(--ink)'
            }}
          >
            {nameFor}
          </span>
          {isForActive && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--for)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <Mic size={14} />
            </motion.span>
          )}
        </div>

        {/* Role Pill */}
        <span className="role-pill for" style={{ marginBottom: '8px', fontSize: '0.68rem' }}>
          FOR THE MOTION
        </span>

        {/* Time Remaining Display */}
        <div
          className="timer-nums"
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)',
            fontWeight: 700,
            lineHeight: 1,
            color: isFlaggedFor
              ? 'var(--ink-muted)'
              : isLowTimeFor
              ? 'var(--against)'
              : isForActive
              ? 'var(--for)'
              : 'var(--ink-secondary)',
            letterSpacing: '-0.02em'
          }}
        >
          {formatSeconds(remainingFor)}
        </div>

        {/* Active / Urgency Badge */}
        <div style={{ marginTop: '8px', minHeight: '22px' }}>
          {isFlaggedFor ? (
            <span
              className="eyebrow"
              style={{
                color: 'var(--against)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--against-bg)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              <AlertTriangle size={12} />
              TIME EXPIRED
            </span>
          ) : isLowTimeFor ? (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="eyebrow"
              style={{
                color: 'var(--against)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--against-bg)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              <Flame size={12} />
              LOW TIME
            </motion.span>
          ) : isForActive ? (
            <span
              className="eyebrow"
              style={{ color: 'var(--for)', letterSpacing: '0.12em', fontWeight: 700 }}
            >
              SPEAKING
            </span>
          ) : (
            <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
              WAITING
            </span>
          )}
        </div>
      </motion.div>

      {/* Center Spine (VS & Turn Counter) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 clamp(10px, 2vw, 20px)',
          background: 'var(--chamber)',
          borderLeft: '1px solid var(--line)',
          borderRight: '1px solid var(--line)',
          minWidth: 'clamp(68px, 10vw, 92px)'
        }}
      >
        <div
          style={{
            fontFamily: 'Bricolage Grotesque',
            fontWeight: 800,
            fontSize: '0.9rem',
            letterSpacing: '0.12em',
            color: 'var(--brass)'
          }}
        >
          VS
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: '0.72rem',
            color: 'var(--ink-muted)',
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'center'
          }}
        >
          Turn {turnNo}
        </div>
      </div>

      {/* Opposition Clock (Against the Motion) */}
      <motion.div
        animate={{
          backgroundColor: isAgainstActive ? 'var(--against-bg)' : 'var(--surface)',
          borderColor: isAgainstActive ? 'var(--against)' : 'transparent'
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          padding: 'clamp(14px, 2.5vw, 22px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderTop: isAgainstActive ? '4px solid var(--against)' : '4px solid transparent',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Speaker Meta & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--against)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}
          >
            {nameAgainst.charAt(0)}
          </div>
          <span
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontWeight: 700,
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'var(--ink)'
            }}
          >
            {nameAgainst}
          </span>
          {isAgainstActive && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--against)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <Mic size={14} />
            </motion.span>
          )}
        </div>

        {/* Role Pill */}
        <span className="role-pill against" style={{ marginBottom: '8px', fontSize: '0.68rem' }}>
          AGAINST THE MOTION
        </span>

        {/* Time Remaining Display */}
        <div
          className="timer-nums"
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.4rem)',
            fontWeight: 700,
            lineHeight: 1,
            color: isFlaggedAgainst
              ? 'var(--ink-muted)'
              : isLowTimeAgainst
              ? 'var(--against)'
              : isAgainstActive
              ? 'var(--against)'
              : 'var(--ink-secondary)',
            letterSpacing: '-0.02em'
          }}
        >
          {formatSeconds(remainingAgainst)}
        </div>

        {/* Active / Urgency Badge */}
        <div style={{ marginTop: '8px', minHeight: '22px' }}>
          {isFlaggedAgainst ? (
            <span
              className="eyebrow"
              style={{
                color: 'var(--against)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--against-bg)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              <AlertTriangle size={12} />
              TIME EXPIRED
            </span>
          ) : isLowTimeAgainst ? (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="eyebrow"
              style={{
                color: 'var(--against)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--against-bg)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              <Flame size={12} />
              LOW TIME
            </motion.span>
          ) : isAgainstActive ? (
            <span
              className="eyebrow"
              style={{ color: 'var(--against)', letterSpacing: '0.12em', fontWeight: 700 }}
            >
              SPEAKING
            </span>
          ) : (
            <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
              WAITING
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
