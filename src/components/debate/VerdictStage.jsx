import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Gavel, 
  CheckCircle2, 
  MinusCircle, 
  PlusCircle, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Sparkles, 
  BookOpen, 
  ArrowRight,
  Home,
  X
} from 'lucide-react';
import DebateHeader from './DebateHeader';
import { playGavel, playClick } from '../../utils/soundEffects';

const DEFAULT_TRANSCRIPT = [];

export default function VerdictStage({
  initialSeconds = 600,
  motionText,
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  roomCode = '',
  theme = 'light',
  onToggleTheme,
  onNewDebate,
  onRematch,
  onReturnToMain,
  turns = DEFAULT_TRANSCRIPT,
  verdict = null,
  gameMode = 'offline',
  judgeCount = 1
}) {
  const [copied, setCopied] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedPoints, setExpandedPoints] = useState({ 'prop-0': true, 'opp-0': true });

  useEffect(() => {
    try { playGavel(); } catch {}
  }, []);

  const winner = verdict?.winner || 'draw';
  const isForWinner = winner === 'for';
  const isAgainstWinner = winner === 'against';
  const isDraw = winner === 'draw';

  const scoreFor = verdict?.for?.score ?? verdict?.scores?.for ?? null;
  const scoreAgainst = verdict?.against?.score ?? verdict?.scores?.against ?? null;
  const hasScores = scoreFor !== null && scoreAgainst !== null;

  // Only show real AI-provided headline/rationale — no generic fallback fluff
  const winnerHeadline = verdict?.headline || (
    isDraw ? 'The chamber is deadlocked.'
    : isForWinner ? `${nameFor} (Proposition) wins the debate.`
    : `${nameAgainst} (Opposition) wins the debate.`
  );

  const winnerRationale = verdict?.rationale || null;

  // Strengths & weaknesses — only real AI content, no defaults. A model asked
  // for strengths a speaker did not have answers "none" rather than returning
  // an empty list; printed as a bullet that reads like a broken screen. The
  // server strips these too, but verdicts also arrive from room state and from
  // older clients, so the screen refuses to render a placeholder as a point.
  const PLACEHOLDER = /^(none|n\/?a|nil|null|-+|\.+|no[ -]?(strengths?|weaknesses?|points?|comments?)\b.*|nothing( of note| notable| to (note|report))?)[.!]?$/i;
  const realPoints = (list) => (list || [])
    .filter(Boolean)
    .filter((item) => !PLACEHOLDER.test(String(item?.point ?? item).trim()));

  const forStrengths = realPoints(verdict?.for?.strengths);
  const forWeaknesses = realPoints(verdict?.for?.weaknesses);
  const againstStrengths = realPoints(verdict?.against?.strengths);
  const againstWeaknesses = realPoints(verdict?.against?.weaknesses);

  const hasForAnalysis = forStrengths.length > 0 || forWeaknesses.length > 0;
  const hasAgainstAnalysis = againstStrengths.length > 0 || againstWeaknesses.length > 0;

  // Juror scorecards: only show in crowd_jury mode with real data
  const isCrowdJury = gameMode === 'crowd_jury';
  const judgeBallots = (verdict?.individualScores || []).filter(j => j && (j.scoreFor !== undefined || j.scoreAgainst !== undefined));
  const showJurorPanel = isCrowdJury && judgeBallots.length > 0;

  const handleNewDebate = () => { try { playClick(); } catch {} if (typeof onNewDebate === 'function') onNewDebate(); };
  const handleRematch = () => { try { playClick(); } catch {} if (typeof onRematch === 'function') onRematch(); };
  const handleReturnToMain = () => { try { playClick(); } catch {} if (typeof onReturnToMain === 'function') onReturnToMain(); else if (typeof onNewDebate === 'function') onNewDebate(); };

  const winColor = isForWinner ? 'var(--for)' : isDraw ? 'var(--brass)' : 'var(--against)';
  const winBg    = isForWinner ? 'var(--for-bg)' : isDraw ? 'var(--brass-light, rgba(180,140,60,0.1))' : 'var(--against-bg)';
  const winBorder= isForWinner ? 'var(--for-line)' : isDraw ? 'var(--line-strong)' : 'var(--against-line)';

  const togglePoint = (id) => {
    playClick();
    setExpandedPoints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyVerdict = () => {
    try { playClick(); } catch {}
    const winnerLabel = isDraw ? 'Draw' : (isForWinner ? `${nameFor} (Proposition)` : `${nameAgainst} (Opposition)`);
    const scoreStr = hasScores ? `\nScore: ${nameFor} ${scoreFor}/10 vs ${nameAgainst} ${scoreAgainst}/10` : '';
    const summary = `POINT OF ORDER VERDICT\nMotion: "${motionText}"\nWinner: ${winnerLabel}${scoreStr}\n\n${winnerRationale || winnerHeadline}`;
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="debate-container verdict-screen" style={{ position: 'relative' }}>
      {/* Header with Return to Main (verdict phase = non-active-debate) */}
      <DebateHeader
        roomCode={roomCode}
        initialSeconds={initialSeconds}
        turnNo={turns.length || 0}
        theme={theme}
        onToggleTheme={onToggleTheme}
        motionText={motionText}
        judgeCount={judgeCount}
        gameMode={gameMode}
        onReturnLobby={handleReturnToMain}
        showReturnButton={true}
      />

      {/* Subheader & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="role-pill brass">
            <Award size={13} />
            VERDICT
          </span>
          <span className="eyebrow">FINAL PHASE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {turns.length > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              id="verdict-open-record-btn"
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
              Read Full Record ({turns.length})
            </button>
          )}
          <button
            onClick={handleCopyVerdict}
            id="copy-verdict-btn"
            className="btn-ghost"
            style={{ padding: '7px 14px', fontSize: '0.84rem' }}
          >
            {copied ? <Check size={14} color="var(--for)" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Winner Announcement Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{
          padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 36px)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          background: `linear-gradient(160deg, ${winBg} 0%, var(--surface) 100%)`,
          border: `2px solid ${winBorder}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.12, stiffness: 400, damping: 20 }}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: winColor,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)'
          }}
        >
          <Trophy size={30} />
        </motion.div>        {/* Decision */}
        <div>
          <div className="eyebrow" style={{ color: winColor, letterSpacing: '0.16em', marginBottom: '6px' }}>
            {isCrowdJury
              ? 'CROWD JURY VERDICT'
              : verdict.isFallback
                ? 'PROVISIONAL RESULT • NO ADJUDICATOR'
                : 'AI ADJUDICATOR VERDICT'}
          </div>
          {verdict.isFallback && verdict.notice && (
            <div
              style={{
                margin: '0 auto 10px',
                maxWidth: '60ch',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--brass-subtle)',
                border: '1px solid var(--brass-line)',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                color: 'var(--ink-soft, var(--ink))'
              }}
            >
              {verdict.notice}
            </div>
          )}
          <h2
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontSize: 'clamp(1.9rem, 5vw, 3.1rem)',
              fontWeight: 900,
              color: winColor,
              lineHeight: 1.05,
              letterSpacing: '-0.025em'
            }}
          >
            {isDraw ? 'Draw — Chamber Deadlocked' : isForWinner ? 'Decision for the Proposition' : 'Decision for the Opposition'}
          </h2>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)' }}>
              {isDraw ? 'Both Debaters' : (isForWinner ? nameFor : nameAgainst)}
            </span>
            <span className={`role-pill ${isForWinner ? 'for' : isDraw ? 'brass' : 'against'}`}>
              {isDraw ? 'TIE' : (isForWinner ? 'PROPOSITION' : 'OPPOSITION')}
            </span>
            {hasScores && (
              <span
                className="font-mono"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${winBorder}`,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: winColor
                }}
              >
                {nameFor} {scoreFor} — {nameAgainst} {scoreAgainst}
              </span>
            )}
          </div>
        </div>

        <p
          style={{
            fontFamily: 'Bricolage Grotesque',
            fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
            fontWeight: 600,
            color: 'var(--ink)',
            maxWidth: '58ch',
            lineHeight: 1.35,
            margin: '4px auto 0'
          }}
        >
          {winnerHeadline}
        </p>

        {winnerRationale && (
          <p
            style={{
              fontFamily: 'Newsreader, Georgia, serif',
              fontSize: '0.98rem',
              lineHeight: 1.65,
              color: 'var(--ink-secondary)',
              maxWidth: '64ch',
              margin: '0 auto'
            }}
          >
            {winnerRationale}
          </p>
        )}

        {/* Score Medallion — only when AI returned scores */}
        {hasScores && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              padding: '12px 28px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ color: 'var(--for)', fontSize: '0.62rem' }}>PROPOSITION ({nameFor})</div>
              <strong className="font-mono" style={{ fontSize: '1.5rem', color: 'var(--for)' }}>{scoreFor}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>/10</span>
            </div>
            <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: '0.85rem', color: 'var(--brass)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ color: 'var(--against)', fontSize: '0.62rem' }}>OPPOSITION ({nameAgainst})</div>
              <strong className="font-mono" style={{ fontSize: '1.5rem', color: 'var(--against)' }}>{scoreAgainst}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>/10</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Speaker Assessment — only rendered when AI provided real analysis */}
      {(hasForAnalysis || hasAgainstAnalysis) && (<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--brass)" />
          <h3 style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)' }}>
            Speaker Assessment
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 'clamp(16px, 2.5vw, 24px)',
            alignItems: 'start'
          }}
        >
          {/* Proposition Assessment Card */}
          {hasForAnalysis && <div
            className="card-surface"
            style={{
              padding: 'clamp(18px, 3vw, 26px)',
              border: '1px solid var(--for-line)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="role-pill for" style={{ marginBottom: '4px' }}>PROPOSITION</span>
                <h4 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 900, fontSize: '1.45rem', color: 'var(--ink)' }}>
                  {nameFor}
                </h4>
              </div>
              <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--for)' }}>
                {scoreFor}<span style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>/10</span>
              </div>
            </div>

            {/* Strengths */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--for)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <PlusCircle size={14} />
                STRONG POINTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forStrengths.map((item, idx) => {
                  const key = `prop-${idx}`;
                  const isExpanded = !!expandedPoints[key];
                  return (
                    <div
                      key={key}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--for-bg)',
                        border: '1px solid var(--for-line)'
                      }}
                    >
                      <div
                        onClick={() => togglePoint(key)}
                        style={{ cursor: item.citationQuote ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {item.point || item}
                        </span>
                        {item.citationQuote && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                      </div>
                      {item.citationQuote && isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px dashed var(--for-line)',
                            fontFamily: 'Newsreader, Georgia, serif',
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: 'var(--ink-secondary)',
                            lineHeight: 1.5
                          }}
                        >
                          "{item.citationQuote}" {item.turnNo && `(Turn ${item.turnNo})`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--against)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MinusCircle size={14} />
                AREAS FOR IMPROVEMENT
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forWeaknesses.map((item, idx) => (
                  <div
                    key={`prop-weak-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--against-bg)',
                      border: '1px solid var(--against-line)',
                      fontSize: '0.9rem',
                      color: 'var(--ink)'
                    }}
                  >
                    <div>{item.point || item}</div>
                    {item.citationQuote && (
                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                        "{item.citationQuote}" {item.turnNo && `(Turn ${item.turnNo})`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Advice */}
            {verdict?.for?.advice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--for-bg)',
                  border: '1px solid var(--for-line)',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  color: 'var(--ink)'
                }}
              >
                <strong style={{ color: 'var(--for)', marginRight: '6px' }}>Advice ·</strong>
                {verdict.for.advice}
              </div>
            )}
          </div>}

          {/* Opposition Assessment Card */}
          {hasAgainstAnalysis && <div
            className="card-surface"
            style={{
              padding: 'clamp(18px, 3vw, 26px)',
              border: '1px solid var(--against-line)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="role-pill against" style={{ marginBottom: '4px' }}>OPPOSITION</span>
                <h4 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 900, fontSize: '1.45rem', color: 'var(--ink)' }}>
                  {nameAgainst}
                </h4>
              </div>
              <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--against)' }}>
                {scoreAgainst}<span style={{ fontSize: '0.95rem', color: 'var(--ink-muted)' }}>/10</span>
              </div>
            </div>

            {/* Strengths */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--for)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <PlusCircle size={14} />
                STRONG POINTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {againstStrengths.map((item, idx) => {
                  const key = `opp-${idx}`;
                  const isExpanded = !!expandedPoints[key];
                  return (
                    <div
                      key={key}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--for-bg)',
                        border: '1px solid var(--for-line)'
                      }}
                    >
                      <div
                        onClick={() => togglePoint(key)}
                        style={{ cursor: item.citationQuote ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {item.point || item}
                        </span>
                        {item.citationQuote && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                      </div>
                      {item.citationQuote && isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px dashed var(--for-line)',
                            fontFamily: 'Newsreader, Georgia, serif',
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: 'var(--ink-secondary)',
                            lineHeight: 1.5
                          }}
                        >
                          "{item.citationQuote}" {item.turnNo && `(Turn ${item.turnNo})`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <div className="eyebrow" style={{ color: 'var(--against)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MinusCircle size={14} />
                AREAS FOR IMPROVEMENT
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {againstWeaknesses.map((item, idx) => (
                  <div
                    key={`opp-weak-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--against-bg)',
                      border: '1px solid var(--against-line)',
                      fontSize: '0.9rem',
                      color: 'var(--ink)'
                    }}
                  >
                    <div>{item.point || item}</div>
                    {item.citationQuote && (
                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                        "{item.citationQuote}" {item.turnNo && `(Turn ${item.turnNo})`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Advice */}
            {verdict?.against?.advice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--against-bg)',
                  border: '1px solid var(--against-line)',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  color: 'var(--ink)'
                }}
              >
                <strong style={{ color: 'var(--against)', marginRight: '6px' }}>Advice ·</strong>
                {verdict.against.advice}
              </div>
            )}
          </div>}
        </div>
      </div>)}

      {/* Juror Scorecards — ONLY in crowd_jury mode with real votes */}
      {showJurorPanel && <div className="card-surface" style={{ padding: 'clamp(16px, 2.5vw, 22px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--brass)" />
            <h3 style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>
              Juror Scorecards
            </h3>
          </div>
          <span className="eyebrow">{judgeBallots.length} JURORS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {judgeBallots.map((judge, idx) => {
            const votedFor = judge.scoreFor > judge.scoreAgainst;
            const votedAgainst = judge.scoreFor < judge.scoreAgainst;
            return (
              <div
                key={judge.judgeLabel || idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--ground)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: votedFor ? 'var(--for)' : (votedAgainst ? 'var(--against)' : 'var(--brass)') }} />
                    <strong style={{ fontFamily: 'Bricolage Grotesque', fontSize: '0.95rem' }}>{judge.judgeLabel}</strong>
                    <span className="role-pill brass" style={{ fontSize: '0.62rem' }}>
                      {votedFor ? 'VOTED PROPOSITION' : (votedAgainst ? 'VOTED OPPOSITION' : 'TIED BALLOT')}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.86rem', display: 'flex', gap: '12px' }}>
                    <span style={{ color: 'var(--for)', fontWeight: 700 }}>{nameFor}: {judge.scoreFor}/10</span>
                    <span style={{ color: 'var(--against)', fontWeight: 700 }}>{nameAgainst}: {judge.scoreAgainst}/10</span>
                  </div>
                </div>
                <p style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontSize: '0.94rem', color: 'var(--ink-secondary)', margin: 0 }}>
                  "{judge.remarks}"
                </p>
              </div>
            );
          })}
        </div>
      </div>}

      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '22px 20px',
          background: 'var(--chamber)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <button
          onClick={handleReturnToMain}
          id="return-to-main-btn"
          className="btn-ghost"
          style={{ padding: '11px 20px', fontSize: '0.95rem' }}
        >
          <Home size={15} />
          <span>Main Menu</span>
        </button>

        <button
          onClick={handleRematch}
          id="rematch-btn"
          className="btn-ghost"
          style={{ padding: '11px 20px', fontSize: '0.95rem' }}
        >
          <RotateCcw size={15} />
          <span>Rematch</span>
        </button>

        <button
          onClick={handleNewDebate}
          id="start-new-debate-btn"
          className="btn-primary"
          style={{ padding: '12px 26px', fontSize: '1rem', background: 'var(--ink)', color: 'var(--ground)' }}
        >
          <span>New Debate</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Slide-over Drawer for 'The Record' */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
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
                  id="close-verdict-record-drawer-btn"
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
                {turns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
                    <BookOpen size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No recorded speeches in this session.</p>
                  </div>
                ) : (
                  turns.map((turn, idx) => {
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
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export { VerdictStage };
