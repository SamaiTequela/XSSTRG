import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Flag, 
  Handshake, 
  ShieldAlert, 
  Eye,
  EyeOff,
  PenLine,
  Gavel,
  Radio,
  FileCheck2,
  Sparkles
} from 'lucide-react';

export default function SpeakingDispatch({
  currentSpeaker = 'Alex',
  side = 'for', // 'for' | 'against'
  isMyTurn = true,
  onSubmitTurn,
  onRequestEnd,
  onConcede,
  disabled = false,
  onTyping,
  opponentTyping = { isTyping: false, wordCount: 0, speaker: '' },
  userRole = 'for', // 'for' | 'against' | 'judge'
  judgeLiveDraft = { isTyping: false, text: '', wordCount: 0, speaker: '' }
}) {
  const [speechText, setSpeechText] = useState('');
  const [scratchpadText, setScratchpadText] = useState('');
  const [judgeNotesText, setJudgeNotesText] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);
  const [internalClipboard, setInternalClipboard] = useState('');
  const [isConfirmingConcede, setIsConfirmingConcede] = useState(false);
  const [isLiveDraftVisible, setIsLiveDraftVisible] = useState(true);
  const textareaRef = useRef(null);

  const isFor = side === 'for';
  const isJudge = userRole === 'judge';

  // Words & reading pace calculation
  const words = speechText.trim().split(/\s+/).filter(Boolean);
  const wordCount = speechText.trim() === '' ? 0 : words.length;
  const estimatedSeconds = Math.round(wordCount / 2.3); // ~140 wpm spoken

  const handleTextChange = (e) => {
    const val = e.target.value;
    setSpeechText(val);
    onTyping?.(val);
  };

  // Anti-paste enforcement (from custom-motions upstream rule)
  const handleCopy = () => {
    const selection = window.getSelection().toString();
    if (selection) setInternalClipboard(selection);
  };

  const handleCut = () => {
    const selection = window.getSelection().toString();
    if (selection) setInternalClipboard(selection);
  };

  const handlePaste = (e) => {
    const pastedData = e.clipboardData?.getData('text') || '';
    // Allow if matches last internally cut/copied text from within the box
    if (internalClipboard && pastedData === internalClipboard) {
      return; // permitted internal reorganization
    }
    e.preventDefault();
    setPasteWarning(true);
    setTimeout(() => setPasteWarning(false), 3800);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setPasteWarning(true);
    setTimeout(() => setPasteWarning(false), 3800);
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!speechText.trim() || disabled) return;
    onSubmitTurn(speechText);
    setSpeechText('');
    setIsConfirmingConcede(false);
  };

  // ---------------------------------------------------------------------------
  // 1. JUDGE OBSERVER VIEW: Live Keystroke Monitor + Judicial Notepad
  // ---------------------------------------------------------------------------
  if (isJudge) {
    return (
      <div
        className="card-surface speaking-dispatch judge-dispatch-panel"
        style={{
          padding: 'clamp(16px, 2.5vw, 24px)',
          border: '1px solid var(--brass-line)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
          height: '100%',
          minHeight: '440px'
        }}
      >
        {/* Judge Header with Live Draft Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.74rem',
                fontFamily: 'Space Mono, monospace',
                letterSpacing: '0.06em',
                fontWeight: 700,
                background: 'var(--brass-subtle)',
                color: 'var(--brass)',
                border: '1px solid var(--brass-line)'
              }}
            >
              <Gavel size={13} />
              JUDGE MONITOR
            </span>
            <strong
              style={{
                fontFamily: 'Bricolage Grotesque, sans-serif',
                fontSize: '1.02rem',
                color: 'var(--ink)'
              }}
            >
              {currentSpeaker} ({side === 'for' ? 'Proposition' : 'Opposition'}) has the floor
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live Typing Status Badge */}
            {judgeLiveDraft.isTyping ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontFamily: 'Space Mono, monospace',
                  color: 'var(--for)',
                  background: 'var(--for-bg)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--for-line)'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'var(--for)',
                    boxShadow: '0 0 8px var(--for)'
                  }}
                />
                LIVE DRAFTING ({judgeLiveDraft.wordCount} words)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.76rem',
                  fontFamily: 'Space Mono, monospace',
                  color: 'var(--ink-muted)'
                }}
              >
                Draft idle ({judgeLiveDraft.wordCount || 0} words)
              </span>
            )}

            {/* Toggle Watch Live Draft */}
            <button
              type="button"
              onClick={() => setIsLiveDraftVisible(!isLiveDraftVisible)}
              id="toggle-judge-live-draft-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: isLiveDraftVisible ? 'var(--brass-subtle)' : 'transparent',
                color: isLiveDraftVisible ? 'var(--brass)' : 'var(--ink-muted)',
                border: '1px solid var(--line)'
              }}
            >
              {isLiveDraftVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              {isLiveDraftVisible ? '👁️ Live Draft Active' : 'Hidden'}
            </button>
          </div>
        </div>

        {/* Live Keystroke Stream Screen */}
        <AnimatePresence>
          {isLiveDraftVisible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'var(--chamber)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brass-line)',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="eyebrow"
                  style={{
                    color: 'var(--brass)',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Radio size={12} />
                  JUDICIAL DRAFT FEED • PRIVILEGED KEAPSTREAM
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>
                  Opponent view is blinded
                </span>
              </div>

              <div
                style={{
                  fontFamily: 'Newsreader, Georgia, serif',
                  fontSize: '1.08rem',
                  lineHeight: '1.6',
                  color: judgeLiveDraft.text ? 'var(--ink)' : 'var(--ink-muted)',
                  minHeight: '110px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontStyle: judgeLiveDraft.text ? 'normal' : 'italic'
                }}
              >
                {judgeLiveDraft.text ||
                  "Waiting for speaker to type... Keystrokes stream live to this judicial monitor in real-time prior to formal floor submission."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Judge Private Deliberation Scratchpad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--ink-secondary)' }}>
            <PenLine size={13} />
            <strong>Judicial Notes (Private during round):</strong>
          </div>
          <textarea
            value={judgeNotesText}
            onChange={(e) => setJudgeNotesText(e.target.value)}
            placeholder="Log key clashes, burdens of proof, rebuttal responsiveness, and evidence quality as speeches unfold..."
            style={{
              width: '100%',
              flex: 1,
              minHeight: '120px',
              resize: 'none',
              padding: '12px 14px',
              fontSize: '0.92rem',
              fontFamily: 'Newsreader, Georgia, serif',
              background: 'var(--ground)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              outline: 'none'
            }}
          />
        </div>

        {/* Judicial Footer Notice */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-muted)', paddingTop: '4px' }}>
          <span>Observing live debate flow</span>
          <button
            type="button"
            onClick={onRequestEnd}
            className="btn-ghost"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Call Time / Deliberate
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ACTIVE DEBATER / BLINDED OPPONENT VIEW
  // ---------------------------------------------------------------------------
  return (
    <div
      className="card-surface speaking-dispatch"
      style={{
        padding: 'clamp(16px, 2.5vw, 24px)',
        border: `1px solid ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        height: '100%',
        minHeight: '440px'
      }}
    >
      {/* Floor Status & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`role-pill ${side}`}>{isFor ? 'PROPOSITION' : 'OPPOSITION'}</span>
          <strong
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontSize: '1.05rem',
              color: 'var(--ink)'
            }}
          >
            {isMyTurn ? 'You have the floor' : `${currentSpeaker} has the floor`}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="eyebrow" style={{ color: 'var(--ink-muted)' }}>
            {wordCount} words {wordCount > 0 && `• ~${estimatedSeconds}s delivery`}
          </span>
        </div>
      </div>

      {/* Paste Protection Notice */}
      <AnimatePresence>
        {pasteWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--against-bg)',
              border: '1px solid var(--against-line)',
              color: 'var(--against)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={16} />
            <span>Arguments must be composed live in the dispatch box. External pasting is prohibited.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech Text Area - Expands to fill available vertical space */}
      {isMyTurn ? (
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            ref={textareaRef}
            id="speech"
            value={speechText}
            onChange={handleTextChange}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Make your case. Rebut what was just argued, bring reasoned evidence, and land your point clearly..."
            aria-label="Your argument"
            style={{
              width: '100%',
              flex: 1,
              minHeight: '180px',
              resize: 'none',
              padding: '16px 18px',
              fontSize: '1.0625rem',
              lineHeight: '1.6',
              fontFamily: 'Newsreader, Georgia, serif',
              background: 'var(--ground)',
              color: 'var(--ink)',
              border: `1px solid ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`,
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
          />
        </div>
      ) : (
        /* Opponent Speaking / Rebuttal Scratchpad with Blinded Indicator */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {/* Blinded Opponent Status Banner: NO TEXT IS TRANSMITTED OR SHOWN */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: opponentTyping.isTyping ? 'var(--chamber)' : 'var(--ground)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: opponentTyping.isTyping ? (isFor ? 'var(--for)' : 'var(--against)') : 'var(--ink-muted)',
                  animation: opponentTyping.isTyping ? 'pulse 1.4s infinite' : 'none'
                }}
              />
              <span style={{ fontSize: '0.86rem', color: 'var(--ink)' }}>
                {opponentTyping.isTyping
                  ? `${currentSpeaker} is drafting an argument (${opponentTyping.wordCount} words)...`
                  : `${currentSpeaker} is holding the floor`}
              </span>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                fontFamily: 'Space Mono, monospace',
                color: 'var(--ink-muted)',
                background: 'var(--surface)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)'
              }}
            >
              BLINDED RECEPTOR
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            <PenLine size={14} />
            <span>Private rebuttal scratchpad (hidden from floor):</span>
          </div>
          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            placeholder="Private rebuttal notes: Track weak premises, counter-arguments, and key statistics here while opponent speaks..."
            style={{
              width: '100%',
              flex: 1,
              minHeight: '160px',
              resize: 'none',
              padding: '14px 16px',
              fontSize: '0.95rem',
              fontFamily: 'Newsreader, Georgia, serif',
              background: 'var(--chamber)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '6px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onRequestEnd}
            id="request-end-btn"
            className="btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            title="Request mutual early conclusion of the debate"
          >
            <Handshake size={14} />
            Request end
          </button>

          {/* Concede Button with Confirmation Step & Subtle Muted Danger Outline */}
          {!isConfirmingConcede ? (
            <button
              type="button"
              onClick={() => setIsConfirmingConcede(true)}
              id="concede-btn"
              className="btn-ghost"
              style={{
                padding: '8px 14px',
                fontSize: '0.84rem',
                color: 'var(--against)',
                borderColor: 'var(--against-line)',
                background: 'var(--against-bg-subtle)'
              }}
              title="Concede this turn or the motion"
            >
              <Flag size={14} />
              Concede
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--against-bg)',
                border: '1px solid var(--against-line)',
                borderRadius: 'var(--radius-md)',
                padding: '3px 8px'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--against)' }}>
                Concede turn?
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingConcede(false);
                  onConcede();
                }}
                id="confirm-concede-btn"
                style={{
                  background: 'var(--against)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                Yes, concede
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingConcede(false)}
                id="cancel-concede-btn"
                style={{
                  background: 'transparent',
                  color: 'var(--ink-muted)',
                  border: 'none',
                  padding: '4px 6px',
                  fontSize: '0.78rem'
                }}
              >
                Cancel
              </button>
            </motion.div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="eyebrow" style={{ fontSize: '0.68rem', display: 'none', '@media (minWidth: 640px)': { display: 'inline' } }}>
            Ctrl+Enter to submit
          </span>
          {isMyTurn && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!speechText.trim() || disabled}
              id="submit-turn-btn"
              className={isFor ? 'btn-for' : 'btn-against'}
              style={{
                padding: '11px 22px',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Send size={15} />
              Submit &amp; pass floor →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { SpeakingDispatch };
