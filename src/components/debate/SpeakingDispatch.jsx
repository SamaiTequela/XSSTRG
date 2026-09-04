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
import { playClick, playTurnSubmit } from '../../utils/soundEffects';

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
  judgeLiveDraft = { isTyping: false, text: '', wordCount: 0, speaker: '' },
  gameMode = 'offline'
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
  const isOffline = gameMode === 'offline' || gameMode === 'hotseat';

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
    playTurnSubmit();
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
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.72rem',
                fontFamily: 'Space Mono, monospace',
                letterSpacing: '0.06em',
                fontWeight: 700,
                background: isJudge ? 'var(--brass-subtle)' : 'var(--chamber)',
                color: isJudge ? 'var(--brass)' : 'var(--ink-secondary)',
                border: `1px solid ${isJudge ? 'var(--brass-line)' : 'var(--line)'}`
              }}
            >
              {isJudge ? <Gavel size={13} /> : <Radio size={13} />}
              {isJudge ? 'JUDGE MONITOR' : 'CHAMBER OBSERVATION'}
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
            {/* Typing Status Badge */}
            {(isJudge ? judgeLiveDraft.isTyping : opponentTyping.isTyping) ? (
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
                DRAFTING ({(isJudge ? judgeLiveDraft.wordCount : opponentTyping.wordCount) || 0} words)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.76rem',
                  fontFamily: 'Space Mono, monospace',
                  color: 'var(--ink-muted)'
                }}
              >
                Draft idle ({(isJudge ? judgeLiveDraft.wordCount : opponentTyping.wordCount) || 0} words)
              </span>
            )}

            {/* Toggle Watch Live Draft: ONLY FOR JUDGES */}
            {isJudge && (
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
            )}
          </div>
        </div>

        {/* Live Keystroke Stream: ONLY FOR VERIFIED JUDGES */}
        {isJudge ? (
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
                    JUDICIAL DRAFT FEED • PRIVILEGED KEYSTREAM
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>
                    Opponents are blinded
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
                    overflowX: 'hidden',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    wordWrap: 'break-word',
                    fontStyle: judgeLiveDraft.text ? 'normal' : 'italic'
                  }}
                >
                  {judgeLiveDraft.text ||
                    "Waiting for speaker to type... Keystrokes stream live to this judicial monitor in real-time prior to formal floor submission."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Blinded Opponent Waiting Screen */
          <div
            style={{
              background: 'var(--chamber)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.74rem', fontFamily: 'Space Mono, monospace', color: 'var(--ink-muted)', letterSpacing: '0.1em' }}>
              BLINDED DEBATER VIEW
            </div>
            <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: '1.1rem', color: 'var(--ink)' }}>
              {opponentTyping.isTyping ? (
                <span><strong>{currentSpeaker}</strong> is formulating their argument in real-time...</span>
              ) : (
                <span>Waiting for <strong>{currentSpeaker}</strong> to submit their address to the house...</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              Their speech will appear in the Chamber Record once dispatched.
            </div>
          </div>
        )}

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
        minHeight: '440px',
        minWidth: 0
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
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              wordWrap: 'break-word',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
          />
        </div>
      ) : (
        /* Opponent Speaking / Rebuttal Scratchpad with Blinded Indicator */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
          {/* Blinded Opponent Status Banner: NO TEXT IS TRANSMITTED OR SHOWN */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: opponentTyping.isTyping ? 'var(--chamber)' : 'var(--ground)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: opponentTyping.isTyping ? (isFor ? 'var(--for)' : 'var(--against)') : 'var(--ink-muted)',
                  animation: opponentTyping.isTyping ? 'pulse 1.4s infinite' : 'none'
                }}
              />
              <span style={{ fontSize: '0.86rem', color: 'var(--ink)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
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
                border: '1px solid var(--line)',
                whiteSpace: 'nowrap'
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
              outline: 'none',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              wordWrap: 'break-word'
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
          {isOffline ? (
            <button
              type="button"
              onClick={() => { playClick(); onRequestEnd(); }}
              id="end-debate-btn"
              className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.84rem', borderColor: 'var(--line-strong)' }}
              title="End the debate instantly and proceed to adjudication"
            >
              <Gavel size={14} />
              End debate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { playClick(); onRequestEnd(); }}
              id="request-end-btn"
              className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              title="Request mutual early conclusion of the debate"
            >
              <Handshake size={14} />
              Request end
            </button>
          )}

          {/* Concede Button with Confirmation Step & Subtle Muted Danger Outline */}
          {!isConfirmingConcede ? (
            <button
              type="button"
              onClick={() => { playClick(); setIsConfirmingConcede(true); }}
              id="concede-btn"
              className="btn-ghost"
              style={{
                padding: '8px 14px',
                fontSize: '0.84rem',
                color: 'var(--against)',
                borderColor: 'var(--against-line)',
                background: 'var(--against-bg-subtle)'
              }}
              title="Concede this debate"
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
                Concede debate?
              </span>
              <button
                type="button"
                onClick={() => {
                  playClick();
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
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, concede
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setIsConfirmingConcede(false); }}
                id="cancel-concede-btn"
                style={{
                  background: 'transparent',
                  color: 'var(--ink-muted)',
                  border: 'none',
                  padding: '4px 6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
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
