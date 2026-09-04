import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BookOpen, User, ArrowDownCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TranscriptRecord({ turns = [], nameFor = 'Alex', nameAgainst = 'Sam' }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  return (
    <div
      className="card-surface transcript-record"
      style={{
        padding: 'clamp(16px, 2.5vw, 24px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        minHeight: '440px',
        maxHeight: '680px',
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="var(--brass)" />
          <h2
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--ink)'
            }}
          >
            The Record
          </h2>
        </div>
        <span className="eyebrow">
          {turns.length} {turns.length === 1 ? 'Turn Recorded' : 'Turns Recorded'}
        </span>
      </div>

      {/* Turn Feed */}
      <div
        className="turns-stream transcript-stream"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minWidth: 0,
          paddingRight: '6px'
        }}
      >
        {turns.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              color: 'var(--ink-muted)',
              fontStyle: 'italic',
              fontSize: '0.95rem'
            }}
          >
            No remarks entered yet. The opening speaker establishes the premises of the debate.
          </div>
        ) : (
          turns.map((turn, index) => {
            const isFor = turn.side === 'for';
            const speakerDisplayName = turn.speaker || turn.name || (isFor ? (nameFor || 'Proposition') : (nameAgainst || 'Opposition'));
            return (
              <motion.div
                key={turn.id || index}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                style={{
                  alignSelf: isFor ? 'flex-start' : 'flex-end',
                  maxWidth: '92%',
                  minWidth: 0,
                  width: 'fit-content',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: isFor ? 'var(--for-bg)' : 'var(--against-bg)',
                  border: `1px solid ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`,
                  boxShadow: 'var(--shadow-sm)',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  wordWrap: 'break-word'
                }}
              >
                {/* Turn Meta Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong
                      style={{
                        fontFamily: 'Bricolage Grotesque',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: isFor ? 'var(--for-strong)' : 'var(--against-strong)'
                      }}
                    >
                      {speakerDisplayName}
                    </strong>
                    <span className={`role-pill ${turn.side}`} style={{ fontSize: '0.62rem', padding: '1px 7px' }}>
                      {isFor ? 'PROPOSITION' : 'OPPOSITION'}
                    </span>
                  </div>
                  <span className="eyebrow" style={{ fontSize: '0.66rem' }}>
                    Turn {turn.turnNo || index + 1}
                  </span>
                </div>

                {/* Speech Text Body */}
                <div
                  style={{
                    fontFamily: 'Newsreader, Georgia, serif',
                    fontSize: '1.02rem',
                    lineHeight: '1.6',
                    color: 'var(--ink)',
                    whiteSpace: 'pre-wrap',
                    textWrap: 'pretty',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    wordWrap: 'break-word'
                  }}
                >
                  {turn.text}
                </div>

                {/* Optional Badges (e.g. Conceded or Passed) */}
                {turn.isConcession && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      color: 'var(--against)',
                      fontStyle: 'italic'
                    }}
                  >
                    <AlertCircle size={12} /> Conceded Point
                  </div>
                )}
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export { TranscriptRecord };
