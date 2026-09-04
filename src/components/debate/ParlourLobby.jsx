import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Wifi,
  Laptop,
  Eye,
  EyeOff,
  Dices
} from 'lucide-react';
import { playClick } from '../../utils/soundEffects';

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

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateRandomRoomCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]).join("");

export function ParlourLobby({
  initialMotion = CURATED_MOTIONS[0],
  initialRole = 'for',
  initialName = 'Alex',
  initialRoomCode,
  theme = 'light',
  onToggleTheme,
  onEnterChamber
}) {
  const [mode, setMode] = useState('offline'); // 'offline' | 'online' | 'jury'
  const [motionText, setMotionText] = useState(initialMotion);
  const [isEditingMotion, setIsEditingMotion] = useState(false);
  const [customMotionText, setCustomMotionText] = useState(initialMotion);
  
  // Offline chamber dual player names
  const [nameFor, setNameFor] = useState('Alex');
  const [nameAgainst, setNameAgainst] = useState('Sam');
  
  // Online chamber single player identity & bench
  const [speakerName, setSpeakerName] = useState(initialName);
  const [selectedRole, setSelectedRole] = useState(initialRole); // 'for' | 'against' | 'random'
  
  // Clocks: 10, 20, 30 minutes
  const [timeMinutes, setTimeMinutes] = useState(10);
  
  // Random room code & hide toggle
  const [roomCode, setRoomCode] = useState(() => initialRoomCode || generateRandomRoomCode());
  const [hideRoomCode, setHideRoomCode] = useState(false);

  // Online chamber action: create vs join
  const [onlineAction, setOnlineAction] = useState('create'); // 'create' | 'join'
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [lobbyError, setLobbyError] = useState('');

  // Auto-detect ?room=XXXX from invitation link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      if (urlRoom) {
        const clean = urlRoom.toUpperCase().trim().slice(0, 8);
        setRoomCode(clean);
        setJoinCodeInput(clean);
        setMode('online');
        setOnlineAction('join');
      }
    }
  }, []);

  const handleSurpriseMotion = () => {
    playClick();
    const remaining = CURATED_MOTIONS.filter((m) => m !== motionText);
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    setMotionText(random);
    setCustomMotionText(random);
  };

  const handleRegenerateCode = () => {
    playClick();
    setRoomCode(generateRandomRoomCode());
  };

  const handleSaveCustomMotion = () => {
    playClick();
    if (customMotionText.trim()) {
      setMotionText(customMotionText.trim().slice(0, 300));
    }
    setIsEditingMotion(false);
  };

  const handleStart = (e) => {
    e?.preventDefault();
    playClick();
    setLobbyError('');
    
    let resolvedRole = selectedRole;
    if (mode === 'online' && selectedRole === 'random') {
      resolvedRole = Math.random() < 0.5 ? 'for' : 'against';
    } else if (mode === 'jury') {
      resolvedRole = selectedRole === 'spectator' ? 'spectator' : (selectedRole || 'spectator');
    } else if (mode === 'offline') {
      resolvedRole = 'for';
    }

    const effectiveCode = (onlineAction === 'join' ? joinCodeInput : roomCode).trim().toUpperCase();

    if (mode !== 'offline' && onlineAction === 'join') {
      if (!effectiveCode || effectiveCode.length < 4) {
        setLobbyError('Please enter a valid 4-letter room code.');
        return;
      }
    }

    onEnterChamber({
      mode,
      action: onlineAction,
      motion: motionText,
      role: resolvedRole,
      name: mode === 'offline' ? nameFor : (speakerName.trim() || 'Speaker'),
      nameFor: nameFor.trim() || 'Alex',
      nameAgainst: nameAgainst.trim() || 'Sam',
      remainingSeconds: timeMinutes * 60,
      roomCode: effectiveCode || generateRandomRoomCode(),
      hideRoomCode
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
          A competitive timed parliamentary debate game
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
        {/* Mode Selector: 3 Distinct Chamber Modes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
            CHAMBER MODE
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '6px',
              background: 'var(--ground)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)'
            }}
          >
            <button
              type="button"
              onClick={() => { playClick(); setMode('offline'); }}
              style={{
                padding: '9px 14px',
                fontSize: '0.86rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'offline' ? 'var(--ink)' : 'transparent',
                color: mode === 'offline' ? 'var(--ground)' : 'var(--ink-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Laptop size={15} />
              Offline chamber
            </button>
            <button
              type="button"
              onClick={() => { playClick(); setMode('online'); }}
              style={{
                padding: '9px 14px',
                fontSize: '0.86rem',
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
              Online chamber
            </button>
            <button
              type="button"
              onClick={() => { playClick(); setMode('jury'); }}
              style={{
                padding: '9px 14px',
                fontSize: '0.86rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'jury' ? 'var(--ink)' : 'transparent',
                color: mode === 'jury' ? 'var(--ground)' : 'var(--ink-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Scale size={15} />
              Crowd Jury
            </button>
          </div>

          {/* Create vs Join Tab for Online / Crowd Jury */}
          {mode !== 'offline' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => { playClick(); setOnlineAction('create'); }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${onlineAction === 'create' ? 'var(--brass)' : 'var(--line)'}`,
                  background: onlineAction === 'create' ? 'var(--brass-subtle)' : 'transparent',
                  color: onlineAction === 'create' ? 'var(--brass)' : 'var(--ink-secondary)',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Create Chamber
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setOnlineAction('join'); }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${onlineAction === 'join' ? 'var(--brass)' : 'var(--line)'}`,
                  background: onlineAction === 'join' ? 'var(--brass-subtle)' : 'transparent',
                  color: onlineAction === 'join' ? 'var(--brass)' : 'var(--ink-secondary)',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Join with Code
              </button>
            </div>
          )}
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
                onClick={() => { playClick(); setIsEditingMotion(!isEditingMotion); }}
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
                "{motionText}"
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

        {/* Identity & Stance Grid: Adaptive based on Chamber Mode */}
        {mode === 'offline' ? (
          /* Offline Chamber: Dual Speaker Names */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="name-for-input" className="eyebrow" style={{ color: 'var(--for)' }}>
                PROPOSITION SPEAKER (FOR)
              </label>
              <input
                type="text"
                id="name-for-input"
                value={nameFor}
                onChange={(e) => setNameFor(e.target.value.slice(0, 24))}
                placeholder="e.g. Alex"
                style={{
                  padding: '11px 14px',
                  fontSize: '1rem',
                  fontFamily: 'Newsreader, Georgia, serif',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
                  border: '1px solid var(--for-line)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="name-against-input" className="eyebrow" style={{ color: 'var(--against)' }}>
                OPPOSITION SPEAKER (AGAINST)
              </label>
              <input
                type="text"
                id="name-against-input"
                value={nameAgainst}
                onChange={(e) => setNameAgainst(e.target.value.slice(0, 24))}
                placeholder="e.g. Sam"
                style={{
                  padding: '11px 14px',
                  fontSize: '1rem',
                  fontFamily: 'Newsreader, Georgia, serif',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
                  border: '1px solid var(--against-line)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        ) : mode === 'online' ? (
          /* Online Chamber: Speaker Name & Bench Selection (Proposition, Opposition, Random) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
                YOUR BENCH / STANCE
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedRole('for'); }}
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
                  onClick={() => { playClick(); setSelectedRole('against'); }}
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
                  onClick={() => { playClick(); setSelectedRole('random'); }}
                  style={{
                    flex: 1,
                    padding: '9px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selectedRole === 'random' ? 'var(--brass)' : 'var(--line)'}`,
                    background: selectedRole === 'random' ? 'var(--brass-subtle)' : 'transparent',
                    color: selectedRole === 'random' ? 'var(--brass)' : 'var(--ink-secondary)',
                    fontWeight: selectedRole === 'random' ? 700 : 500,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Dices size={13} />
                  Random
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Crowd Jury Mode */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="speaker-name-input" className="eyebrow" style={{ color: 'var(--brass)' }}>
                YOUR JUROR NAME
              </label>
              <input
                type="text"
                id="speaker-name-input"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value.slice(0, 24))}
                placeholder="e.g. Juror 1"
                style={{
                  padding: '11px 14px',
                  fontSize: '1rem',
                  fontFamily: 'Newsreader, Georgia, serif',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
                  border: '1px solid var(--brass-line)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--ink-muted)' }}>
                CHAMBER SEAT
              </span>
              <div style={{ fontSize: '0.88rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={15} color="var(--brass)" />
                <span>Spectator Jury • Independent Adjudication Ballot</span>
              </div>
            </div>
          </div>
        )}

        {/* Chess Clock Time Selection (10 / 20 / 30 min) & Room Code */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {/* Time Duration: 10 / 20 / 30 min */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
              CHESS CLOCK PER SIDE
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[10, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => { playClick(); setTimeMinutes(mins); }}
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

          {/* Room Code: Only shown in Online or Crowd Jury modes */}
          {mode !== 'offline' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="room-code-input" className="eyebrow" style={{ color: 'var(--brass)' }}>
                  {onlineAction === 'join' ? 'ENTER ROOM CODE' : 'ROOM CODE'}
                </label>
                {onlineAction === 'create' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { playClick(); setHideRoomCode(!hideRoomCode); }}
                      className="btn-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.74rem' }}
                      title={hideRoomCode ? 'Show room code' : 'Hide room code'}
                    >
                      {hideRoomCode ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span style={{ marginLeft: '4px' }}>{hideRoomCode ? 'Show' : 'Hide'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="btn-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.74rem' }}
                      title="Generate a new random room code"
                    >
                      <Shuffle size={12} />
                      <span style={{ marginLeft: '4px' }}>Random</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                type={onlineAction === 'create' && hideRoomCode ? 'password' : 'text'}
                id="room-code-input"
                value={onlineAction === 'join' ? joinCodeInput : roomCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().slice(0, 8);
                  if (onlineAction === 'join') {
                    setJoinCodeInput(val);
                  } else {
                    setRoomCode(val);
                  }
                }}
                placeholder="e.g. W7KP"
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
                AI Adjudicator
              </div>
            </div>
          )}
        </div>

        {/* Validation Error Alert */}
        {lobbyError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#f44336',
              fontSize: '0.84rem',
              fontFamily: 'Space Mono, monospace'
            }}
          >
            {lobbyError}
          </div>
        )}

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
            <span>
              {mode === 'offline'
                ? 'Enter The Chamber'
                : onlineAction === 'join'
                  ? 'Join Chamber'
                  : 'Create Chamber & Enter Lobby'}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ParlourLobby;
