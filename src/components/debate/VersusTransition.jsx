import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Clock, Scale, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { playTurnSubmit, playClick, playCountdownBlip } from '../../utils/soundEffects';

export function VersusTransition({
  motionText,
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  initialSeconds = 600,
  gameMode = 'online',
  onComplete
}) {
  const [countdown, setCountdown] = useState(3);
  // The clash is a flash of light as the doors open. It is presentational
  // only: entering is deferred by its length, never conditional on it.
  const [clashing, setClashing] = useState(false);
  const enteredRef = useRef(false);

  const START = 3;

  const enterChamber = useCallback(() => {
    if (enteredRef.current) return; // the button and the timer both land here
    enteredRef.current = true;
    setClashing(true);
    setTimeout(() => onComplete?.(), 260);
  }, [onComplete]);

  // Rounding to whole minutes announced the 30-second clock as "1 MIN a side",
  // contradicting the chamber header, which reads it as 0:30.
  const formatMinutes = (secs) => {
    if (secs < 60) return `${secs} SEC`;
    const mins = Math.round(secs / 60);
    return `${mins} MIN`;
  };

  useEffect(() => {
    try {
      playTurnSubmit();
    } catch {}

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          try { playCountdownBlip(true); } catch {}
          enterChamber();
          return 0;
        }
        try { playCountdownBlip(false); } catch {}
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [enterChamber]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at center, var(--surface, #14161b) 0%, var(--bg, #0b0c0e) 100%)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          border: '1px dashed var(--line, rgba(255,255,255,0.08))',
          pointerEvents: 'none',
          animation: 'spin 40s linear infinite'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '1px solid var(--line, rgba(255,255,255,0.05))',
          pointerEvents: 'none'
        }}
      />

      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '999px',
          background: 'var(--brass-glow)',
          border: '1px solid var(--brass)',
          color: 'var(--brass)',
          fontFamily: 'Space Mono, monospace',
          fontSize: '0.78rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '28px'
        }}
      >
        <Scale size={14} />
        CHAMBER ENTRANCE • {gameMode === 'crowd_jury' ? 'CROWD JURY PROTOCOL' : 'PARLIAMENTARY CLASH'}
      </motion.div>

      {/* Versus Faceoff Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '860px',
          width: '100%',
          marginBottom: '32px'
        }}
      >
        {/* Proposition (FOR) */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(135deg, var(--for-glow) 0%, var(--surface) 100%)',
            border: '1px solid var(--for-line)',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'right',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div
            style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.74rem',
              letterSpacing: '0.14em',
              color: 'var(--for)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px'
            }}
          >
            <span>PROPOSITION</span>
            <Shield size={14} color="var(--for)" />
          </div>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.9rem',
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.1
            }}
          >
            {nameFor || 'Alex'}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--ink-muted)',
              marginTop: '4px'
            }}
          >
            Opening Address • First Speaker
          </div>
        </motion.div>

        {/* Center VS Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* The countdown, drawn rather than counted: a brass ring that
              empties over the beats before the floor opens. */}
          <div
            className="versus-ring"
            style={{ '--ring': Math.max(0, countdown) / START }}
            aria-hidden="true"
          />
          <div
            className="versus-badge"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--surface) 0%, var(--chamber) 100%)',
              border: '2px solid var(--brass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px var(--brass-glow)',
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'var(--brass)'
            }}
          >
            VS
          </div>
        </motion.div>

        {/* Opposition (AGAINST) */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(135deg, var(--against-glow) 0%, var(--surface) 100%)',
            border: '1px solid var(--against-line)',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div
            style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.74rem',
              letterSpacing: '0.14em',
              color: 'var(--against)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '6px'
            }}
          >
            <Swords size={14} color="var(--against)" />
            <span>OPPOSITION</span>
          </div>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.9rem',
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.1
            }}
          >
            {nameAgainst || 'Sam'}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--ink-muted)',
              marginTop: '4px'
            }}
          >
            Rebuttal & Closing Clash
          </div>
        </motion.div>
      </div>

      {/* Motion Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          maxWidth: '720px',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '14px',
          padding: '18px 24px',
          textAlign: 'center',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            color: 'var(--brass)',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}
        >
          RESOLVED BEFORE THE HOUSE
        </div>
        <div
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: '1.18rem',
            lineHeight: 1.4,
            color: 'var(--ink)',
            fontStyle: 'italic'
          }}
        >
          &ldquo;{motionText}&rdquo;
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            marginTop: '12px',
            fontSize: '0.78rem',
            color: 'var(--ink-muted)'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} />
            {formatMinutes(initialSeconds)} a side
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} color="var(--brass)" />
            {gameMode === 'crowd_jury' ? 'Crowd Jury Panel' : 'AI Adjudicator Protocol'}
          </span>
        </div>
      </motion.div>

      {/* Countdown & Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        <div
          style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.84rem',
            color: 'var(--ink-muted)'
          }}
        >
          Entering chamber in <strong style={{ color: 'var(--brass)' }}>{countdown}s</strong>...
        </div>
        <button
          type="button"
          onClick={() => {
            playClick();
            enterChamber();
          }}
          style={{
            background: 'var(--brass)',
            color: 'var(--surface)',
            border: 'none',
            borderRadius: '999px',
            padding: '8px 18px',
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Enter Now</span>
          <ArrowRight size={14} />
        </button>
      </motion.div>
      {clashing && <div className="versus-clash" aria-hidden="true" />}
    </div>
  );
}

export default VersusTransition;
