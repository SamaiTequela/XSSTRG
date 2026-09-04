import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Gavel, 
  Sun, 
  Moon, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Sparkles 
} from 'lucide-react';

export function DebateHeader({ 
  roomCode = 'HY7X',
  motionText,
  turnNo = 1,
  theme = 'light',
  onToggleTheme,
  onReturnLobby,
  gameMode = 'hotseat', // 'hotseat' | 'online'
  judgeMode = 'ai',     // 'ai' | 'crowd'
  judgeCount = 0,
  participantCount = 1,
  initialSeconds = 300
}) {
  const [copied, setCopied] = React.useState(false);

  const clockMins = Math.floor(initialSeconds / 60);
  const clockSecs = initialSeconds % 60;
  const formattedTime = `${clockMins}:${clockSecs < 10 ? '0' : ''}${clockSecs} A SIDE`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="debate-header" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Meta Bar */}
      <div 
        className="top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--chamber)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {/* Left: Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--brass)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px var(--brass-glow)'
            }}
          >
            <Gavel size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.1 }}>
              POINT OF ORDER
            </div>
            <div className="eyebrow" style={{ fontSize: '0.66rem', letterSpacing: '0.1em' }}>
              {gameMode === 'hotseat' ? 'CHAMBER DEBATE • PASS & PLAY (SOLO)' : 'CHAMBER DEBATE • ONLINE ROOM'}
            </div>
          </div>
        </div>

        {/* Right: Room & Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {onReturnLobby && (
            <button
              onClick={onReturnLobby}
              id="return-lobby-header-btn"
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Return to Parlour Lobby"
            >
              ← Parlour Lobby
            </button>
          )}

          {/* Room Code Badge */}
          <button
            onClick={handleCopyCode}
            id="copy-room-code-btn"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.8rem',
              color: 'var(--ink)',
              cursor: 'pointer'
            }}
            title="Click to copy invite code"
          >
            <span className="eyebrow" style={{ color: 'var(--ink-muted)', marginRight: '6px' }}>ROOM</span>
            <strong className="font-mono" style={{ color: 'var(--brass)', fontSize: '0.9rem', marginRight: '6px' }}>
              {roomCode}
            </strong>
            {copied ? <Check size={14} color="var(--for)" /> : <Copy size={13} color="var(--ink-muted)" />}
          </button>

          {/* Adjudicator / Mode Badge based on ACTUAL state */}
          {gameMode === 'hotseat' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                border: '1px solid var(--brass-line)',
                fontSize: '0.8rem',
                color: 'var(--ink)'
              }}
            >
              <Sparkles size={14} color="var(--brass)" />
              <span style={{ fontWeight: 600 }}>Gemini AI Adjudicator</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                border: '1px solid var(--line-strong)',
                fontSize: '0.8rem'
              }}
            >
              <Users size={14} color="var(--brass)" />
              <span style={{ fontWeight: 600 }}>
                {judgeCount > 0 ? `${judgeCount} ${judgeCount === 1 ? 'Judge' : 'Judges'}` : `${participantCount} ${participantCount === 1 ? 'Debater' : 'Debaters'}`}
              </span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--for)',
                  display: 'inline-block',
                  boxShadow: '0 0 6px var(--for)'
                }}
              />
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            id="theme-toggle-btn"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              color: 'var(--ink)'
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Motion Stage Card */}
      <motion.div
        layout
        className="card-surface motion-banner"
        style={{
          padding: 'clamp(18px, 2.8vw, 26px)',
          borderLeft: '4px solid var(--brass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div className="eyebrow" style={{ color: 'var(--brass)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} />
            <span>THIS HOUSE BELIEVES THAT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="role-pill" 
              style={{ background: 'var(--chamber)', borderColor: 'var(--line)', color: 'var(--ink-secondary)', fontSize: '0.68rem' }}
            >
              ETHICS & POLICY
            </span>
            <span 
              className="role-pill" 
              style={{ background: 'var(--chamber)', borderColor: 'var(--line)', color: 'var(--ink-secondary)', fontSize: '0.68rem' }}
            >
              {formattedTime}
            </span>
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'Bricolage Grotesque',
            fontWeight: 700,
            fontSize: 'clamp(1.28rem, 2.8vw, 1.85rem)',
            lineHeight: 1.25,
            color: 'var(--ink)',
            textWrap: 'balance'
          }}
        >
          {motionText || "This House believes that artificial intelligence development should be subject to international oversight."}
        </h1>
      </motion.div>
    </header>
  );
}

export default DebateHeader;
