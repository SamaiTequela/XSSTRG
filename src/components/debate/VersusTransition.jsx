import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Clock, Scale, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { playTurnSubmit, playClick } from '../../utils/soundEffects';

export function VersusTransition({
  motionText,
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  initialSeconds = 600,
  gameMode = 'online',
  onComplete
}) {
  const [countdown, setCountdown] = useState(3);

  const formatMinutes = (secs) => {
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
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at center, var(--surface, #14161b) 0%, var(--bg, #0b0c0e) 100%)',
        color: 'var(--ink, #f5f5f5)',
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
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          color: 'var(--accent, #d4af37)',
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
            background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.12) 0%, rgba(18, 20, 24, 0.8) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
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
              color: '#4caf50',
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
            <Shield size={14} color="#4caf50" />
          </div>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.9rem',
              fontWeight: 700,
              color: 'var(--ink, #ffffff)',
              lineHeight: 1.1
            }}
          >
            {nameFor || 'Alex'}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--ink-muted, #a0a0a0)',
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--surface, #1e2229) 0%, #0d0e11 100%)',
              border: '2px solid var(--accent, #d4af37)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.3)',
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'var(--accent, #d4af37)'
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
            background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.12) 0%, rgba(18, 20, 24, 0.8) 100%)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
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
              color: '#f44336',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '6px'
            }}
          >
            <Swords size={14} color="#f44336" />
            <span>OPPOSITION</span>
          </div>
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.9rem',
              fontWeight: 700,
              color: 'var(--ink, #ffffff)',
              lineHeight: 1.1
            }}
          >
            {nameAgainst || 'Sam'}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--ink-muted, #a0a0a0)',
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
          background: 'var(--surface, #14171d)',
          border: '1px solid var(--line, rgba(255,255,255,0.1))',
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
            color: 'var(--accent, #d4af37)',
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
            color: 'var(--ink, #f5f5f5)',
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
            color: 'var(--ink-muted, #8c8c8c)'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} />
            {formatMinutes(initialSeconds)} a side
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} color="var(--accent, #d4af37)" />
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
            color: 'var(--ink-muted, #8c8c8c)'
          }}
        >
          Entering chamber in <strong style={{ color: 'var(--accent, #d4af37)' }}>{countdown}s</strong>...
        </div>
        <button
          type="button"
          onClick={() => {
            playClick();
            onComplete?.();
          }}
          style={{
            background: 'var(--accent, #d4af37)',
            color: '#0b0c0e',
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
    </div>
  );
}

export default VersusTransition;
