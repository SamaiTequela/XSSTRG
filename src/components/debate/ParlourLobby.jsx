import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Swords, 
  Shuffle, 
  PenLine, 
  Clock, 
  Users, 
  Scale, 
  Sun, 
  Moon, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Wifi,
  Laptop
} from 'lucide-react';

export const CURATED_MOTIONS = [
  "Social media platforms should require government-verified identity before granting posting privileges.",
  "Artificial intelligence development should be subject to an international non-proliferation treaty.",
  "Humanity should prioritise colonising Mars over ocean exploration.",
  "The four-day work week should become the standard legal work week.",
  "Nuclear energy is essential to achieving global carbon neutrality.",
  "Cash should be completely phased out in favor of central bank digital currencies.",
  "Voting in national democratic elections should be compulsory by law.",
  "Zoos and aquariums cannot be ethically justified in the modern era.",
  "Remote work has improved societal productivity more than office-centric work.",
  "Standardised testing should be abolished in university admissions.",
  "Cities should ban private combustion engine vehicles from their historic centers.",
  "Professional sports leagues should permit genetic enhancement therapies under medical supervision."
];

export default function ParlourLobby({
  initialMotion = CURATED_MOTIONS[0],
  initialRole = 'for',
  initialName = 'Alex',
  initialRoomCode = 'HY7X',
  theme = 'light',
  onToggleTheme,
  onEnterChamber
}) {
  const [mode, setMode] = useState('hotseat'); // 'hotseat' | 'online'
  const [motion, setMotion] = useState(initialMotion);
  const [isEditingMotion, setIsEditingMotion] = useState(false);
  const [customMotionText, setCustomMotionText] = useState(initialMotion);
  const [selectedRole, setSelectedRole] = useState(initialRole); // 'for' | 'against' | 'judge'
  const [speakerName, setSpeakerName] = useState(initialName);
  const [timeMinutes, setTimeMinutes] = useState(5); // 3 | 5 | 7 minutes
  const [roomCode, setRoomCode] = useState(initialRoomCode);

  const handleSurpriseMotion = () => {
    const remaining = CURATED_MOTIONS.filter((m) => m !== motion);
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    setMotion(random);
    setCustomMotionText(random);
  };

  const handleSaveCustomMotion = () => {
    if (customMotionText.trim()) {
      setMotion(customMotionText.trim().slice(0, 300));
    }
    setIsEditingMotion(false);
  };

  const handleStart = (e) => {
    e?.preventDefault();
    onEnterChamber({
      mode,
      motion,
      role: selectedRole,
      name: speakerName.trim() || (selectedRole === 'for' ? 'Alex' : 'Sam'),
      remainingSeconds: timeMinutes * 60,
      roomCode: roomCode.trim().toUpperCase() || 'HY7X'
    });
  };

  return (
    <div className="debate-container parlour-lobby-screen" style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(20px, 4vw, 40px) 20px' }}>
      {/* 1. Masthead */}
      <header style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 36px)', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0 }}>
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-ghost"
            style={{ padding: '8px', borderRadius: '50%' }}
            aria-label="Toggle theme"
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={18} color="var(--brass)" /> : <Moon size={18} color="var(--ink)" />}
          </button>
        </div>

        <div className="eyebrow" style={{ color: 'var(--brass)', letterSpacing: '0.2em', marginBottom: '8px' }}>
          PARLIAMENTARY DISPATCH CHAMBER
        </div>
        <h1
          style={{
            fontFamily: 'Bricolage Grotesque, sans-serif',
            fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
            fontWeight: 900,
            color: 'var(--ink)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em'
          }}
        >
          Point of Order
        </h1>
        <div
          style={{
            width: '56px',
            height: '3px',
            background: 'var(--brass)',
            margin: '14px auto 12px'
          }}
        />
        <p
          style={{
            fontFamily: 'Newsreader, Georgia, serif',
            fontSize: '1.15rem',
            color: 'var(--ink-secondary)',
            maxWidth: '52ch',
            margin: '0 auto',
            lineHeight: 1.45
          }}
        >
          A competitive timed parliamentary debate game judged objectively by Google Gemini AI.
        </p>
      </header>

      {/* 2. Main Setup Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="card-surface"
        style={{
          padding: 'clamp(20px, 3.5vw, 34px)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Mode Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
            CHAMBER MODE
          </label>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--ground)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)'
            }}
          >
            <button
              type="button"
              onClick={() => setMode('hotseat')}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '0.88rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'hotseat' ? 'var(--ink)' : 'transparent',
                color: mode === 'hotseat' ? 'var(--ground)' : 'var(--ink-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Laptop size={15} />
              Single Device (Pass &amp; Play)
            </button>
            <button
              type="button"
              onClick={() => setMode('online')}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '0.88rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'online' ? 'var(--ink)' : 'transparent',
                color: mode === 'online' ? 'var(--ground)' : 'var(--ink-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Wifi size={15} />
              Online Chamber (Multi-Tab Sync)
            </button>
          </div>
        </div>

        {/* Motion Before the House Card */}
        <div
          style={{
            border: '1px solid var(--brass-line)',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(180deg, var(--chamber) 0%, var(--surface) 100%)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--chamber)',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span className="eyebrow" style={{ color: 'var(--brass)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={13} color="var(--brass)" />
              MOTION BEFORE THE HOUSE
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSurpriseMotion}
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                title="Pick another curated parliamentary debate motion"
              >
                <Shuffle size={12} />
                Surprise me
              </button>
              <button
                type="button"
                onClick={() => setIsEditingMotion(!isEditingMotion)}
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                title="Write a custom debate motion"
              >
                <PenLine size={12} />
                {isEditingMotion ? 'Cancel edit' : 'Write custom'}
              </button>
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            {!isEditingMotion ? (
              <blockquote
                style={{
                  margin: 0,
                  fontFamily: 'Bricolage Grotesque, sans-serif',
                  fontSize: 'clamp(1.15rem, 2.8vw, 1.45rem)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1.35
                }}
              >
                "{motion}"
              </blockquote>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={customMotionText}
                  onChange={(e) => setCustomMotionText(e.target.value.slice(0, 300))}
                  placeholder="Enter custom debate motion (e.g. 'This house believes that...')"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '1.05rem',
                    fontFamily: 'Newsreader, Georgia, serif',
                    background: 'var(--ground)',
                    color: 'var(--ink)',
                    border: '1px solid var(--brass-line)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="eyebrow" style={{ fontSize: '0.72rem' }}>
                    {customMotionText.length}/300 characters
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveCustomMotion}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--brass)' }}
                  >
                    Save Motion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Identity & Side Selection Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {/* Name Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="speaker-name-input" className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
              YOUR SPEAKER NAME
            </label>
            <input
              type="text"
              id="speaker-name-input"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value.slice(0, 24))}
              placeholder="e.g. Alex"
              style={{
                padding: '11px 14px',
                fontSize: '1rem',
                fontFamily: 'Newsreader, Georgia, serif',
                background: 'var(--ground)',
                color: 'var(--ink)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-md)',
                outline: 'none'
              }}
            />
          </div>

          {/* Stance Pill Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
              YOUR BENCH / STANCE
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedRole('for')}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedRole === 'for' ? 'var(--for)' : 'var(--line)'}`,
                  background: selectedRole === 'for' ? 'var(--for-bg)' : 'transparent',
                  color: selectedRole === 'for' ? 'var(--for-strong)' : 'var(--ink-secondary)',
                  fontWeight: selectedRole === 'for' ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Proposition
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('against')}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedRole === 'against' ? 'var(--against)' : 'var(--line)'}`,
                  background: selectedRole === 'against' ? 'var(--against-bg)' : 'transparent',
                  color: selectedRole === 'against' ? 'var(--against-strong)' : 'var(--ink-secondary)',
                  fontWeight: selectedRole === 'against' ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Opposition
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('judge')}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedRole === 'judge' ? 'var(--brass)' : 'var(--line)'}`,
                  background: selectedRole === 'judge' ? 'var(--brass-subtle)' : 'transparent',
                  color: selectedRole === 'judge' ? 'var(--brass)' : 'var(--ink-secondary)',
                  fontWeight: selectedRole === 'judge' ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Crowd Jury
              </button>
            </div>
          </div>
        </div>

        {/* Chess Clock Time Selection & Room Code */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {/* Time Duration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
              CHESS CLOCK PER SIDE
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[3, 5, 7].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTimeMinutes(mins)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${timeMinutes === mins ? 'var(--ink)' : 'var(--line)'}`,
                    background: timeMinutes === mins ? 'var(--ink)' : 'transparent',
                    color: timeMinutes === mins ? 'var(--ground)' : 'var(--ink)',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Room Code (if online) */}
          {mode === 'online' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="room-code-input" className="eyebrow" style={{ color: 'var(--brass)' }}>
                ONLINE ROOM CODE
              </label>
              <input
                type="text"
                id="room-code-input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="HY7X"
                style={{
                  padding: '11px 14px',
                  fontSize: '1.05rem',
                  fontFamily: 'Space Mono, monospace',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  background: 'var(--ground)',
                  color: 'var(--brass)',
                  border: '1px solid var(--brass-line)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--ink-muted)' }}>
                ADJUDICATOR
              </span>
              <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--brass)" />
                Google Gemini 3.5 Flash Adjudicator
              </div>
            </div>
          )}
        </div>

        {/* Enter Chamber Primary Action */}
        <div style={{ paddingTop: '8px' }}>
          <button
            type="button"
            onClick={handleStart}
            id="enter-chamber-btn"
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '1.08rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-lift)'
            }}
          >
            <span>Enter The Chamber</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
