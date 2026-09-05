import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gavel, 
  Clock, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Users, 
  Scale, 
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  BookOpen,
  X,
  HelpCircle
} from 'lucide-react';
import DebateHeader from './DebateHeader';
import { playClick } from '../../utils/soundEffects';
import DeliberationLoadingScreen from './DeliberationLoadingScreen';

const DEFAULT_TRANSCRIPT = [];

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const SCORE_RUBRIC = {
  1: 'Incoherent or evasive',
  2: 'Unsubstantiated claims',
  3: 'Weak premises / low impact',
  4: 'Basic arguments presented',
  5: 'Competent, standard case',
  6: 'Solid logic and structure',
  7: 'Persuasive with strong evidence',
  8: 'Highly effective rebuttal & defense',
  9: 'Masterful framing & weighing',
  10: 'Decisive & flawless performance'
};

export function JuryScoringStage({
  motionText,
  initialSeconds = 600,
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  roomCode = 'HY7X',
  theme = 'light',
  onToggleTheme,
  onBackToDebate,
  onSubmitJudgement,
  onReturnToMain,
  turns = DEFAULT_TRANSCRIPT,
  gameMode = 'hotseat',
  judgeCount = 1
}) {
  const [scoreFor, setScoreFor] = useState(7);
  const [scoreAgainst, setScoreAgainst] = useState(6);
  const [remarks, setRemarks] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(114); // 2 min deliberation
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdjudicating, setIsAdjudicating] = useState(false);
  const [adjudicateError, setAdjudicateError] = useState(null);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.max(0, (secondsLeft / 120) * 100);

  const handleTriggerGeminiAdjudication = async () => {
    setIsAdjudicating(true);
    setAdjudicateError(null);
    try {
      const fetchPromise = fetch('/api/adjudicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motion: motionText,
          nameFor,
          nameAgainst,
          transcript: turns
        })
      });

      // Parallelize with minimum 2.6s interstitial animation for dramatic tension
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 2600));
      const [res] = await Promise.all([fetchPromise, minDelayPromise]);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Adjudication request failed with status ${res.status}`);
      }

      const verdict = await res.json();
      setHasSubmitted(true);
      if (onSubmitJudgement) {
        onSubmitJudgement(verdict);
      }
    } catch (err) {
      console.error("AI adjudication error:", err);
      setAdjudicateError(err.message || "Failed to contact AI Adjudicator.");
    } finally {
      setIsAdjudicating(false);
    }
  };

  const handleSubmitJudgement = (e) => {
    e?.preventDefault();
    setHasSubmitted(true);
    // Construct local user juror verdict
    const isForWinner = scoreFor > scoreAgainst;
    const isDraw = scoreFor === scoreAgainst;
    const localVerdict = {
      winner: isDraw ? 'draw' : (isForWinner ? 'for' : 'against'),
      winnerName: isDraw ? 'Draw' : (isForWinner ? nameFor : nameAgainst),
      headline: isDraw ? 'Jury Panel Concludes in Deadlock' : `Decisive Victory for ${isForWinner ? 'Proposition' : 'Opposition'} on Argument Impact`,
      rationale: remarks || `The jury scored Proposition at ${scoreFor}/10 and Opposition at ${scoreAgainst}/10 based on evidence strength and rebuttal cadence.`,
      scores: { for: scoreFor, against: scoreAgainst },
      for: {
        score: scoreFor,
        strengths: [
          { point: "Established clear debate framework and evidence", citationQuote: turns[0]?.text?.slice(0, 70) || "Speech turn", turnNo: 1 }
        ],
        weaknesses: [
          { point: "Room for more direct counter-weighing on civil liberty impacts", citationQuote: turns[2]?.text?.slice(0, 60) || "Speech turn", turnNo: 3 }
        ]
      },
      against: {
        score: scoreAgainst,
        strengths: [
          { point: "Vigorous defense of civil liberties and historical precedents", citationQuote: turns[1]?.text?.slice(0, 70) || "Speech turn", turnNo: 2 }
        ],
        weaknesses: [
          { point: "Could address automated bot farm dynamics more empirically", citationQuote: turns[3]?.text?.slice(0, 60) || "Speech turn", turnNo: 4 }
        ]
      },
      individualScores: [
        { judgeLabel: "Judge 1", scoreFor: Math.min(10, scoreFor + 1), scoreAgainst: Math.max(1, scoreAgainst - 1), remarks: "Solid round; Proposition had stronger empirical momentum." },
        { judgeLabel: "You (Judge 2)", scoreFor, scoreAgainst, remarks: remarks || "Fair clash across both benches." },
        { judgeLabel: "Judge 3", scoreFor: Math.max(1, scoreFor - 1), scoreAgainst: Math.min(10, scoreAgainst + 1), remarks: "Opposition carried rhetorical appeal." }
      ]
    };
    if (onSubmitJudgement) {
      onSubmitJudgement(localVerdict);
    }
  };

  return (
    <div className="debate-container jury-scoring-screen" style={{ position: 'relative' }}>
      {/* 1. Motion Banner Pinned At Top */}
      <DebateHeader
        initialSeconds={initialSeconds}
        roomCode={roomCode}
        turnNo={turns.length || 1}
        theme={theme}
        onToggleTheme={onToggleTheme}
        motionText={motionText}
        judgeCount={judgeCount}
        gameMode={gameMode}
        onReturnLobby={onReturnToMain}
        showReturnButton={!!onReturnToMain}
      />

      {/* Navigation breadcrumb & Drawer Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="role-pill brass">
            <Scale size={13} />
            JURY DELIBERATION
          </span>
          <span className="eyebrow">PHASE 4 OF 5</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Review The Record Drawer Action Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            id="open-record-drawer-btn"
            className="btn-ghost"
            style={{
              padding: '7px 15px',
              fontSize: '0.84rem',
              borderColor: 'var(--brass)',
              color: 'var(--brass)',
              background: 'var(--brass-light)',
              fontWeight: 700
            }}
          >
            <BookOpen size={14} />
            Review The Record ({turns.length})
          </button>

          {onBackToDebate && (
            <button
              onClick={onBackToDebate}
              id="back-to-debate-btn"
              className="btn-ghost"
              style={{ padding: '7px 14px', fontSize: '0.84rem' }}
            >
              <RotateCcw size={13} />
              Return to Active Debate
            </button>
          )}
        </div>
      </div>

      {/* 2. Deliberation Header & Synchronized Countdown Clock */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="card-surface"
        style={{
          padding: 'clamp(20px, 3.5vw, 32px) 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(180deg, var(--chamber) 0%, var(--surface) 100%)',
          borderTop: '4px solid var(--brass)'
        }}
      >
        <motion.div
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--brass-light)',
            color: 'var(--brass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--brass)'
          }}
        >
          <Gavel size={26} />
        </motion.div>

        <div>
          <h2
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: 800,
              color: 'var(--ink)',
              lineHeight: 1.15
            }}
          >
            The Jury is Deliberating
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--ink-secondary)',
              marginTop: '4px',
              maxWidth: '52ch'
            }}
          >
            Evaluate each speaker on argumentation, evidentiary rigor, and responsiveness. Score both sides out of 10.
          </p>
        </div>

        {/* Synchronized Deliberation Clock */}
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 20px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Clock size={16} color="var(--brass)" />
            <span className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {formatTimer(secondsLeft)}
            </span>
            <span className="eyebrow" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
              TIME REMAINING
            </span>
          </div>

          {/* Deliberation Progress Bar */}
          <div
            style={{
              width: 'min(360px, 80vw)',
              height: '5px',
              background: 'var(--line)',
              borderRadius: '999px',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: progressPercent < 20 ? 'var(--against)' : 'var(--brass)',
                borderRadius: '999px',
                transition: 'width 1s linear, background-color 0.3s ease'
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* 3. Scoring Cards: Side-by-Side 1–10 Cards */}
      <div
        className="scoring-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'clamp(16px, 2.5vw, 24px)',
          alignItems: 'stretch'
        }}
      >
        {/* Proposition Scoring Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="card-surface scoring-card"
          style={{
            padding: 'clamp(18px, 3vw, 26px)',
            border: '2px solid var(--for-line)',
            background: 'linear-gradient(180deg, var(--for-bg-subtle) 0%, var(--surface) 120px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="role-pill for" style={{ marginBottom: '6px' }}>PROPOSITION</span>
              <h3
                style={{
                  fontFamily: 'Bricolage Grotesque',
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  lineHeight: 1.1
                }}
              >
                {nameFor}
              </h3>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--for)',
                lineHeight: 1
              }}
            >
              {scoreFor}
              <span style={{ fontSize: '1.1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>/10</span>
            </div>
          </div>

          {/* Interactive Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }} className="eyebrow">
              <span>1 (Weak)</span>
              <span>5 (Neutral)</span>
              <span>10 (Flawless)</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={scoreFor}
              disabled={hasSubmitted}
              onChange={(e) => setScoreFor(Number(e.target.value))}
              id="slider-for"
              className="deliberation-slider slider-for"
              style={{
                width: '100%',
                accentColor: 'var(--for)',
                cursor: hasSubmitted ? 'not-allowed' : 'pointer'
              }}
            />
            {/* Qualitative Rubric Feedback */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--for-bg)',
                border: '1px solid var(--for-line)',
                fontSize: '0.86rem',
                color: 'var(--for-strong)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}
            >
              "{SCORE_RUBRIC[scoreFor]}"
            </div>
          </div>
        </motion.div>

        {/* Opposition Scoring Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="card-surface scoring-card"
          style={{
            padding: 'clamp(18px, 3vw, 26px)',
            border: '2px solid var(--against-line)',
            background: 'linear-gradient(180deg, var(--against-bg-subtle) 0%, var(--surface) 120px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="role-pill against" style={{ marginBottom: '6px' }}>OPPOSITION</span>
              <h3
                style={{
                  fontFamily: 'Bricolage Grotesque',
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  lineHeight: 1.1
                }}
              >
                {nameAgainst}
              </h3>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--against)',
                lineHeight: 1
              }}
            >
              {scoreAgainst}
              <span style={{ fontSize: '1.1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>/10</span>
            </div>
          </div>

          {/* Interactive Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }} className="eyebrow">
              <span>1 (Weak)</span>
              <span>5 (Neutral)</span>
              <span>10 (Flawless)</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={scoreAgainst}
              disabled={hasSubmitted}
              onChange={(e) => setScoreAgainst(Number(e.target.value))}
              id="slider-against"
              className="deliberation-slider slider-against"
              style={{
                width: '100%',
                accentColor: 'var(--against)',
                cursor: hasSubmitted ? 'not-allowed' : 'pointer'
              }}
            />
            {/* Qualitative Rubric Feedback */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--against-bg)',
                border: '1px solid var(--against-line)',
                fontSize: '0.86rem',
                color: 'var(--against-strong)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}
            >
              "{SCORE_RUBRIC[scoreAgainst]}"
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4. Juror Remarks Text Area */}
      <div
        className="card-surface"
        style={{
          padding: 'clamp(18px, 2.5vw, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <label htmlFor="jury-remarks" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} color="var(--brass)" />
            <strong style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1rem', color: 'var(--ink)' }}>
              Juror's Written Rationale (Optional)
            </strong>
          </label>
          <span className="eyebrow">Anonymous to speakers</span>
        </div>

        <textarea
          id="jury-remarks"
          value={remarks}
          disabled={hasSubmitted}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Share your reasoning with the chamber. Which arguments carried the most weight? What rebuttal tipped your score?"
          rows={3}
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: '1rem',
            lineHeight: '1.55',
            fontFamily: 'Newsreader, Georgia, serif',
            background: 'var(--ground)',
            color: 'var(--ink)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 5. Jurors Status Bar & Action Submission */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '14px 20px',
          background: 'var(--chamber)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {/* Anonymous Judges Panel Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
            PANEL VOTES:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Judge 1 */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--for)' }} />
              <span>Judge 1</span>
              <span className="eyebrow" style={{ fontSize: '0.64rem', color: 'var(--for)' }}>✓ READY</span>
            </div>

            {/* Judge 2 (You) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface)',
                border: hasSubmitted ? '1px solid var(--for-line)' : '1px solid var(--brass)',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: hasSubmitted ? 'var(--for)' : 'var(--brass)' }} />
              <span>You (Judge 2)</span>
              <span className="eyebrow" style={{ fontSize: '0.64rem', color: hasSubmitted ? 'var(--for)' : 'var(--brass)' }}>
                {hasSubmitted ? '✓ LOCKED' : 'DELIBERATING'}
              </span>
            </div>

            {/* Judge 3 */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ink-muted)' }} />
              <span>Judge 3</span>
              <span className="eyebrow" style={{ fontSize: '0.64rem', color: 'var(--ink-muted)' }}>SCORING…</span>
            </div>
          </div>
        </div>

        {/* Submission Buttons / Locked Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!hasSubmitted ? (
            <>
              <button
                type="button"
                onClick={() => { playClick(); handleTriggerGeminiAdjudication(); }}
                disabled={isAdjudicating}
                id="trigger-ai-adjudicator-btn"
                className="btn-ghost"
                style={{
                  padding: '11px 20px',
                  fontSize: '0.92rem',
                  borderColor: 'var(--brass)',
                  color: 'var(--brass)',
                  background: 'var(--brass-subtle)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px var(--brass-glow)'
                }}
              >
                <Sparkles size={16} color="var(--brass)" />
                {isAdjudicating ? 'Adjudicating Chamber Record…' : '⚡ AI Adjudicator'}
              </button>

              <button
                type="button"
                onClick={handleSubmitJudgement}
                disabled={isAdjudicating}
                id="submit-judgement-btn"
                className="btn-primary"
                style={{
                  padding: '11px 22px',
                  fontSize: '0.94rem',
                  background: 'var(--brass)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px var(--brass-glow)'
                }}
              >
                <Send size={15} />
                Submit Manual Ballot →
              </button>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--for-bg)',
                border: '1px solid var(--for-line)',
                color: 'var(--for-strong)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <CheckCircle2 size={18} color="var(--for)" />
              <span>Judgement Locked &amp; Submitted</span>
            </motion.div>
          )}
        </div>
      </div>

      {adjudicateError && (
        <div style={{ padding: '10px 16px', background: 'var(--against-bg)', border: '1px solid var(--against-line)', color: 'var(--against)', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem' }}>
          {adjudicateError}
        </div>
      )}

      {/* Slide-over Drawer for 'Review The Record' */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(10, 12, 18, 0.55)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                zIndex: 110
              }}
            />

            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(480px, 94vw)',
                background: 'var(--surface)',
                borderLeft: '1px solid var(--line-strong)',
                zIndex: 120,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--chamber)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} color="var(--brass)" />
                  <h3 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: '1.1rem' }}>
                    The Record
                  </h3>
                  <span className="eyebrow" style={{ fontSize: '0.66rem' }}>
                    {turns.length} TURNS
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  id="close-record-drawer-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-secondary)',
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  aria-label="Close drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div
                className="transcript-stream"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {turns.map((turn, idx) => {
                  const isFor = turn.side === 'for';
                  return (
                    <div
                      key={turn.id || idx}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isFor ? 'var(--for-bg)' : 'var(--against-bg)',
                        border: `1px solid ${isFor ? 'var(--for-line)' : 'var(--against-line)'}`,
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontFamily: 'Bricolage Grotesque', fontSize: '0.92rem', color: isFor ? 'var(--for-strong)' : 'var(--against-strong)' }}>
                            {turn.speaker}
                          </strong>
                          <span className={`role-pill ${turn.side}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                            {isFor ? 'PROPOSITION' : 'OPPOSITION'}
                          </span>
                        </div>
                        <span className="eyebrow" style={{ fontSize: '0.64rem' }}>
                          Turn {turn.turnNo || idx + 1}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: '0.98rem', lineHeight: 1.6, color: 'var(--ink)' }}>
                        {turn.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--chamber)',
                  fontSize: '0.82rem',
                  color: 'var(--ink-muted)',
                  textAlign: 'center'
                }}
              >
                Reference the record to substantiate your scoring rationale.
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Animated Interstitial Deliberation Transition */}
      <DeliberationLoadingScreen isOpen={isAdjudicating} />
    </div>
  );
}

export default JuryScoringStage;
