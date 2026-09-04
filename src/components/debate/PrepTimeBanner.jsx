import React from 'react';
import { motion } from 'motion/react';
import { Timer, Zap, Lock, ShieldCheck } from 'lucide-react';

export function PrepTimeBanner({ 
  prepSecondsLeft = 14, 
  speakerName = 'Alex',
  side = 'for', // 'for' | 'against' - incoming active speaker side
  userRole = 'for', // 'for' | 'against' | 'judge' - client's identity
  onSkipPrep 
}) {
  if (prepSecondsLeft <= 0) return null;

  const isFor = side === 'for';
  // STRICT ROLE CHECK: Skip prep is ONLY permissible if client identity matches incoming speaker
  const isAuthorizedSpeaker = userRole === side;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        background: isFor ? 'var(--for-bg)' : 'var(--against-bg)',
        border: `1px dashed ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`,
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: isFor ? 'var(--for)' : 'var(--against)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Timer size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="eyebrow" style={{ color: isFor ? 'var(--for)' : 'var(--against)' }}>
              PREPARATION TIME {isAuthorizedSpeaker ? '• YOUR TURN' : `• ${side.toUpperCase()}`}
            </span>
            <strong className="font-mono" style={{ fontSize: '1.15rem', color: isFor ? 'var(--for)' : 'var(--against)' }}>
              0:{prepSecondsLeft < 10 ? `0${prepSecondsLeft}` : prepSecondsLeft}
            </strong>
            {!isAuthorizedSpeaker && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.7rem',
                  fontFamily: 'Space Mono, monospace',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-muted)'
                }}
              >
                <Lock size={10} />
                READ-ONLY OBSERVATION
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
            {isAuthorizedSpeaker ? (
              <span>
                <strong>{speakerName}</strong>: You have the floor. Outline your argument. Your chess clock will begin when prep runs out.
              </span>
            ) : (
              <span>
                <strong>{speakerName}</strong> has prep time (0:{prepSecondsLeft < 10 ? `0${prepSecondsLeft}` : prepSecondsLeft})... Floor will open automatically when timer expires.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STRICT PERMISSION CHECK:
          Skip Prep / Start speaking now action ONLY renders if client matches active speaker.
          For opponents and judges, no interactive buttons are rendered. */}
      {isAuthorizedSpeaker && (
        <button
          onClick={onSkipPrep}
          id="start-speaking-now-btn"
          className="btn-primary"
          style={{
            background: isFor ? 'var(--for)' : 'var(--against)',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '0.85rem'
          }}
        >
          <Zap size={14} />
          Start speaking now
        </button>
      )}
    </motion.div>
  );
}

export default PrepTimeBanner;
