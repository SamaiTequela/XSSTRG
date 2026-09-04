import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Sparkles, Scale, BookOpen } from 'lucide-react';

const ADJUDICATION_STAGES = [
  "Reading the chronological debate record...",
  "Analyzing empirical premises & rebuttal engagement...",
  "Weighing central clashes, burdens of proof & impacts...",
  "Synthesizing anonymous jury ballots & transcript citations..."
];

export function DeliberationLoadingScreen({ isOpen = false }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setStageIndex(0);
      setProgress(5);
      return;
    }

    // Step through stage messages
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev + 1 < ADJUDICATION_STAGES.length ? prev + 1 : prev));
    }, 700);

    // Animate progress smoothly over ~2.6 seconds
    const start = Date.now();
    const duration = 2600;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(98, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(progressInterval);
      }
    }, 40);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'radial-gradient(ellipse at center, rgba(22, 24, 34, 0.94) 0%, rgba(10, 11, 16, 0.98) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: 'var(--ink)'
        }}
      >
        <div
          style={{
            maxWidth: '540px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px'
          }}
        >
          {/* Pulsing Golden Gavel Crest */}
          <div style={{ position: 'relative' }}>
            {/* Ripple Pulse Rings */}
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                border: '2px solid var(--brass)',
                pointerEvents: 'none'
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '1px solid var(--brass)',
                pointerEvents: 'none'
              }}
            />

            {/* Medallion */}
            <motion.div
              animate={{ 
                rotate: [-6, 6, -6],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2.4, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brass) 0%, #704f14 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 32px var(--brass-glow)',
                border: '2px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <Gavel size={38} />
            </motion.div>
          </div>

          {/* Heading & Eyebrow */}
          <div>
            <div
              className="eyebrow"
              style={{
                color: 'var(--brass)',
                letterSpacing: '0.22em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={13} />
              PARLIAMENTARY ADJUDICATION
            </div>

            <h2
              style={{
                fontFamily: 'Bricolage Grotesque, sans-serif',
                fontSize: 'clamp(1.65rem, 4vw, 2.25rem)',
                fontWeight: 900,
                color: '#f1f0ea',
                lineHeight: 1.15,
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              The Adjudicator is weighing the clashes...
            </h2>
          </div>

          {/* Stepped Stage Status Indicator */}
          <div
            style={{
              fontFamily: 'Newsreader, Georgia, serif',
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: '#d4d3cc',
              minHeight: '28px',
              transition: 'opacity 0.2s ease'
            }}
          >
            "{ADJUDICATION_STAGES[stageIndex]}"
          </div>

          {/* Glowing Animated Progress Bar */}
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--brass) 0%, #ffdf85 100%)',
                boxShadow: '0 0 12px var(--brass)',
                borderRadius: '999px',
                transition: 'width 0.08s linear'
              }}
            />
          </div>

          {/* Footer Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.74rem',
              fontFamily: 'Space Mono, monospace',
              color: '#a5a5b6'
            }}
          >
            <span>GEMINI 3.5 FLASH</span>
            <span>•</span>
            <span>STRUCTURED CITATION REASONING</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DeliberationLoadingScreen;
