import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import DebateHeader from './DebateHeader';

const DEFAULT_TRANSCRIPT = [
  {
    id: 'turn-1',
    turnNo: 1,
    speaker: 'Alex',
    side: 'for',
    text: "Mr. Speaker, the modern digital public square is no longer merely a venue for recreational chatter—it is the operational infrastructure of democratic discourse. When platforms permit unfettered anonymity, they do not preserve liberty; they subsidize coordinated disinformation networks, algorithmic bot swarms, and bad-faith actors who poison our civic deliberations without consequence. Verified identity restores real reputational stakes to public speech."
  },
  {
    id: 'turn-2',
    turnNo: 2,
    speaker: 'Sam',
    side: 'against',
    text: "The proposition's diagnosis conflates accountability with state surveillance. Throughout history, anonymous publication—from the Federalist Papers to contemporary dissidents under authoritarian regimes—has been the ultimate safeguard against reprisal by the powerful. Forcing citizens to surrender biometric identity or government credentials to private mega-platforms merely creates centralized honeypots for surveillance, while chilling whistleblowers and vulnerable minorities."
  },
  {
    id: 'turn-3',
    turnNo: 3,
    speaker: 'Alex',
    side: 'for',
    text: "The opposition's appeal to the Federalist Papers ignores the asymmetry of the algorithmic era. Publius wrote under a pseudonym, but was published on physical printing presses subject to libel law and editorial friction. Today, automated bot farms weaponize anonymity at the speed of light. Verification does not require displaying real legal names publicly; it merely demands zero-knowledge cryptographic proof of unique personhood to extinguish synthetic bot manipulation."
  },
  {
    id: 'turn-4',
    turnNo: 4,
    speaker: 'Sam',
    side: 'against',
    text: "Zero-knowledge protocols still require trust in state-issued credentials or biometric anchors that are routinely abused by despotic regimes to de-anonymize political opposition. If personhood verification is codified as a prerequisite for discourse, those denied credentials by corrupt or hostile authorities are functionally disenfranchised from public assembly."
  }
];

export default function VerdictStage({
  motionText,
  nameFor = 'Alex',
  nameAgainst = 'Sam',
  roomCode = 'HY7X',
  theme = 'light',
  onToggleTheme,
  onNewDebate,
  onRematch,
  turns = DEFAULT_TRANSCRIPT,
  verdict = null
}) {
  const [copied, setCopied] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedPoints, setExpandedPoints] = useState({ 'prop-0': true, 'opp-0': true, 'prop-1': true, 'opp-1': true });

  const winner = verdict?.winner || 'for';
  const isForWinner = winner === 'for';
  const isAgainstWinner = winner === 'against';
  const isDraw = winner === 'draw';

  const scoreFor = verdict?.scores?.for ?? 7.7;
  const scoreAgainst = verdict?.scores?.against ?? 6.7;

  const winnerHeadline = verdict?.headline || (isForWinner
    ? "Proposition successfully established the structural harms of platform anonymity while Opposition failed to insulate the state surveillance dilemma."
    : (isDraw
      ? "Security Against Bots Clashes Directly With Protection of Free Speech"
      : "Opposition successfully established the perils of state credentialing over platform speech."));

  const winnerRationale = verdict?.rationale || (isForWinner
    ? `The round turned on the third exchange: ${nameFor}’s introduction of zero-knowledge personhood cryptographic proof insulated the affirmative model from ${nameAgainst}’s state-surveillance objection, leaving the proposition’s anti-bot harms largely uncontested.`
    : `The jury deliberated on the fundamental tension between accountability and civil liberties, concluding with rigorous analysis of the transcript record.`);

  const forStrengths = verdict?.for?.strengths || [
    { point: "Distinction between legal disclosure and cryptographic personhood", citationQuote: "Verification does not require displaying real legal names publicly; it merely demands zero-knowledge cryptographic proof...", turnNo: 3 },
    { point: "Clear framing of the public square as critical democratic infrastructure" }
  ];

  const forWeaknesses = verdict?.for?.weaknesses || [
    { point: "Did not fully address regulatory capture or corruption within verification authorities." }
  ];

  const againstStrengths = verdict?.against?.strengths || [
    { point: "Compelling defense of dissident speech and civil rights history", citationQuote: "...from the Federalist Papers to contemporary dissidents under authoritarian regimes—has been the ultimate safeguard...", turnNo: 2 },
    { point: "High rhetorical polish and evocative philosophical appeals" }
  ];

  const againstWeaknesses = verdict?.against?.weaknesses || [
    { point: "Failed to provide a counter-model to mitigate autonomous bot swarms once the proposition conceded anonymity." }
  ];

  const judgeBallots = verdict?.individualScores || [
    { judgeLabel: "Judge 1", scoreFor: 8, scoreAgainst: 6, remarks: "Proposition held the floor better during the second exchange and landed the empirical point cleanly." },
    { judgeLabel: "You (Judge 2)", scoreFor: 7, scoreAgainst: 7, remarks: "High quality deliberation from both debaters; zero-knowledge defense gave Alex a slight edge on impact weighing, but Sam's civil liberty framing was formidable." },
    { judgeLabel: "Judge 3", scoreFor: 8, scoreAgainst: 7, remarks: "Opposition was eloquent and had great historical depth, but dodged the coordinated algorithmic manipulation question." }
  ];

  const togglePoint = (id) => {
    setExpandedPoints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyVerdict = () => {
    const summary = `POINT OF ORDER VERDICT\nMotion: "${motionText}"\nWinner: ${winner === 'draw' ? 'Draw' : (isForWinner ? `${nameFor} (Proposition)` : `${nameAgainst} (Opposition)`)}\nScore: ${nameFor} ${scoreFor} vs ${nameAgainst} ${scoreAgainst}\n\nRationale:\n${winnerRationale}`;
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="debate-container verdict-screen" style={{ position: 'relative' }}>
      {/* 1. Motion Banner Pinned At Top */}
      <DebateHeader
        roomCode={roomCode}
        turnNo={4}
        theme={theme}
        onToggleTheme={onToggleTheme}
        motionText={motionText}
        judgeCount={3}
      />

      {/* Subheader & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="role-pill brass">
            <Award size={13} />
            ADJUDICATION VERDICT
          </span>
          <span className="eyebrow">FINAL PHASE (5 OF 5)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <button
            onClick={handleCopyVerdict}
            id="copy-verdict-btn"
            className="btn-ghost"
            style={{ padding: '7px 14px', fontSize: '0.84rem' }}
          >
            {copied ? <Check size={14} color="var(--for)" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Share Verdict'}
          </button>
        </div>
      </div>

      {/* 2. Official Winner Announcement Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="card-surface winner-banner"
        style={{
          padding: 'clamp(28px, 4vw, 44px) clamp(20px, 4vw, 36px)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          background: 'linear-gradient(180deg, var(--for-bg) 0%, var(--surface) 100%)',
          border: '2px solid var(--for-line)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Trophy Crest */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.15, stiffness: 420, damping: 22 }}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--for)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px var(--for-glow)'
          }}
        >
          <Trophy size={32} />
        </motion.div>

        <div>
          <div className="eyebrow" style={{ color: isForWinner ? 'var(--for)' : (isDraw ? 'var(--brass)' : 'var(--against)'), letterSpacing: '0.16em', marginBottom: '6px' }}>
            PARLIAMENTARY ADJUDICATION • GEMINI 3.5 FLASH &amp; JURY
          </div>
          <h2
            style={{
              fontFamily: 'Bricolage Grotesque',
              fontSize: 'clamp(2rem, 5.5vw, 3.4rem)',
              fontWeight: 900,
              color: isForWinner ? 'var(--for-strong)' : (isDraw ? 'var(--brass)' : 'var(--against-strong)'),
              lineHeight: 1.05,
              letterSpacing: '-0.025em'
            }}
          >
            {isDraw ? 'Chamber Declares a Deadlock (Draw)' : (isForWinner ? 'Decision for the Proposition' : 'Decision for the Opposition')}
          </h2>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'Bricolage Grotesque',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--ink)'
              }}
            >
              {isDraw ? 'Both Debaters' : (isForWinner ? nameFor : nameAgainst)}
            </span>
            <span className={`role-pill ${isForWinner ? 'for' : (isDraw ? 'brass' : 'against')}`}>
              {isDraw ? 'TIE' : (isForWinner ? 'PROPOSITION' : 'OPPOSITION')}
            </span>
            <span
              className="font-mono"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isForWinner ? 'var(--for-line)' : (isDraw ? 'var(--brass-line)' : 'var(--against-line)')}`,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: isForWinner ? 'var(--for)' : (isDraw ? 'var(--brass)' : 'var(--against)')
              }}
            >
              Scores: {nameFor} {scoreFor} vs {nameAgainst} {scoreAgainst}
            </span>
          </div>
        </div>

        {/* Verdict Rationale & Headline Summary */}
        <p
          style={{
            fontFamily: 'Bricolage Grotesque',
            fontSize: 'clamp(1.08rem, 2.2vw, 1.3rem)',
            fontWeight: 600,
            color: 'var(--ink)',
            maxWidth: '56ch',
            lineHeight: 1.35,
            margin: '6px auto 0'
          }}
        >
          {winnerHeadline}
        </p>

        <p
          style={{
            fontFamily: 'Newsreader, Georgia, serif',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'var(--ink-secondary)',
            maxWidth: '64ch',
            margin: '0 auto'
          }}
        >
          {winnerRationale}
        </p>

        {/* Score Comparison Medallion */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginTop: '8px',
            padding: '12px 28px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--for)', fontSize: '0.64rem' }}>PROPOSITION ({nameFor})</div>
            <strong className="font-mono" style={{ fontSize: '1.4rem', color: 'var(--for)' }}>{scoreFor}</strong>
          </div>
          <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: '0.9rem', color: 'var(--brass)' }}>
            VS
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--against)', fontSize: '0.64rem' }}>OPPOSITION ({nameAgainst})</div>
            <strong className="font-mono" style={{ fontSize: '1.4rem', color: 'var(--against)' }}>{scoreAgainst}</strong>
          </div>
        </div>
      </motion.div>

      {/* 3. Key Clashes & Arguments Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--brass)" />
          <h3 style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)' }}>
            Key Clashes &amp; Speaker Assessment
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
          <div
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
          </div>

          {/* Opposition Assessment Card */}
          <div
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
          </div>
        </div>
      </div>

      {/* 4. Anonymous Jury Panel Breakdown */}
      <div className="card-surface" style={{ padding: 'clamp(18px, 2.5vw, 24px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--brass)" />
            <h3 style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink)' }}>
              Anonymous Juror Scorecards
            </h3>
          </div>
          <span className="eyebrow">{judgeBallots.length} ADJUDICATORS RECORDED</span>
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
      </div>

      {/* 5. Post-Debate Chamber Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '24px 20px',
          background: 'var(--chamber)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <button
          onClick={onNewDebate}
          id="start-new-debate-btn"
          className="btn-primary"
          style={{
            padding: '13px 26px',
            fontSize: '1rem',
            background: 'var(--ink)',
            color: 'var(--ground)'
          }}
        >
          <span>Start a New Debate</span>
          <ArrowRight size={16} />
        </button>

        <button
          onClick={onRematch}
          id="rematch-btn"
          className="btn-ghost"
          style={{ padding: '12px 22px', fontSize: '0.96rem' }}
        >
          <RotateCcw size={15} />
          <span>Rematch with Same Motion</span>
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
