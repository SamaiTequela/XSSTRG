import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Gavel, 
  Sun, 
  Moon, 
  Copy, 
  Check, 
  Eye,
  EyeOff,
  Clock, 
  Sparkles,
  Home
} from 'lucide-react';
import { playClick } from '../../utils/soundEffects';

export function DebateHeader({ 
  roomCode = 'HY7X',
  motionText,
  turnNo = 1,
  theme = 'light',
  onToggleTheme,
  onReturnLobby,
  showReturnButton = false, // show "Main Menu" link (verdict / scoring phases)
  gameMode = 'offline', // 'offline' | 'online' | 'jury' | 'hotseat'
  judgeMode = 'ai',     // 'ai' | 'crowd'
  judgeCount = 0,
  participantCount = 1,
  initialSeconds = 600,
  initialHideCode = false
}) {
  const [copied, setCopied] = useState(false);
  const [isCodeHidden, setIsCodeHidden] = useState(initialHideCode);

  const isOffline = gameMode === 'offline' || gameMode === 'hotseat';
  const clockMins = Math.floor(initialSeconds / 60);
  const clockSecs = initialSeconds % 60;
  const formattedTime = `${clockMins}:${clockSecs < 10 ? '0' : ''}${clockSecs} A SIDE`;

  const handleCopyCode = () => {
    playClick();
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleCodeVisibility = (e) => {
    e.stopPropagation();
    playClick();
    setIsCodeHidden(!isCodeHidden);
  };

  const getModeEyebrow = () => {
    if (isOffline) return 'CHAMBER DEBATE • OFFLINE CHAMBER';
    if (gameMode === 'jury') return 'CHAMBER DEBATE • CROWD JURY';
    return 'CHAMBER DEBATE • ONLINE CHAMBER';
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
              {getModeEyebrow()}
            </div>
          </div>
        </div>

        {/* Right: Room Code (online only), Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

          {/* Room Code Badge: ONLY rendered in Online / Jury chambers, NOT in offline split-screen! */}
          {!isOffline && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={handleCopyCode}
                id="copy-room-code-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Click to copy invite code"
              >
                <span className="eyebrow" style={{ color: 'var(--ink-muted)', marginRight: '6px' }}>ROOM</span>
                <strong className="font-mono" style={{ color: 'var(--brass)', fontSize: '0.9rem', marginRight: '6px' }}>
                  {isCodeHidden ? '••••' : roomCode}
                </strong>
                {copied ? <Check size={14} color="var(--for)" /> : <Copy size={13} color="var(--ink-muted)" />}
              </button>
              <button
                type="button"
                onClick={handleToggleCodeVisibility}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '1px solid var(--line)',
                  padding: '6px 8px',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isCodeHidden ? 'Show room code' : 'Hide room code'}
              >
                {isCodeHidden ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          )}

          {/* Online Connected Participants (Only in online mode) */}
          {!isOffline && (
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

          {/* Return to Main Menu button (verdict / scoring phases only) */}
          {showReturnButton && onReturnLobby && (
            <button
              onClick={() => { try { playClick(); } catch {} onReturnLobby(); }}
              id="header-return-main-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: 'var(--ink-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Return to Main Menu"
            >
              <Home size={13} />
              Main Menu
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={() => { playClick(); onToggleTheme(); }}
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
