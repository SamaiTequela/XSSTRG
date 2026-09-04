import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, UserCheck, Clock } from 'lucide-react';

function formatSecs(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TurnHandoffModal({
  isOpen = false,
  nextSpeaker = 'Sam',
  side = 'against',
  remainingTime = 241,
  onDismiss
}) {
  if (!isOpen) return null;

  const isFor = side === 'for';

  return (
    <AnimatePresence>
      <div
        className="handoff-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'rgba(10, 11, 16, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="card-surface"
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            borderTop: `6px solid ${isFor ? 'var(--for)' : 'var(--against)'}`,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="eyebrow" style={{ color: 'var(--brass)' }}>
            DISPATCH BOX HANDOVER
          </div>

          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: isFor ? 'var(--for-bg)' : 'var(--against-bg)',
              color: isFor ? 'var(--for)' : 'var(--against)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              border: `2px solid ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`
            }}
          >
            {nextSpeaker.charAt(0)}
          </div>

          <div>
            <h3
              style={{
                fontFamily: 'Bricolage Grotesque',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--ink)',
                lineHeight: 1.15
              }}
            >
              Pass device to {nextSpeaker}
            </h3>
            <div style={{ marginTop: '6px' }}>
              <span className={`role-pill ${side}`}>
                {isFor ? 'PROPOSITION' : 'OPPOSITION'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--ink-secondary)',
              fontSize: '0.9rem',
              background: 'var(--chamber)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--line)'
            }}
          >
            <Clock size={14} color="var(--brass)" />
            <span>Clock reads <strong className="font-mono">{formatSecs(remainingTime)}</strong></span>
          </div>

          <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)', maxWidth: '34ch' }}>
            Review the arguments above and prepare your reply. The clock runs as soon as you proceed.
          </p>

          <button
            onClick={onDismiss}
            id="handoff-ready-btn"
            className={isFor ? 'btn-for' : 'btn-against'}
            style={{
              width: '100%',
              padding: '13px 24px',
              fontSize: '1rem',
              marginTop: '8px'
            }}
          >
            <span>I have the floor — Begin turn</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
