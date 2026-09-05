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
  Home,
  ArrowLeft,
  AlertTriangle
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
  const [showConfirmExit, setShowConfirmExit] = useState(false);

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
    // App calls this mode 'crowd_jury'; only the older 'jury' spelling was
    // tested here, so a jury room announced itself as an ordinary online one.
    if (gameMode === 'jury' || gameMode === 'crowd_jury') return 'CHAMBER DEBATE • CROWD JURY';
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
                {/* A jury room has both, and showing only the jury hid the
                    speakers while counting jurors as debaters. */}
                {judgeCount > 0
                  ? `2 Debaters • ${judgeCount} ${judgeCount === 1 ? 'Judge' : 'Judges'}`
                  : `${participantCount} ${participantCount === 1 ? 'Debater' : 'Debaters'}`}
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

          {/* Return / Leave Chamber Button */}
          {onReturnLobby && (
            <button
              onClick={() => {
                try { playClick(); } catch {}
                if (showReturnButton) {
                  onReturnLobby();
                } else {
                  setShowConfirmExit(true);
                }
              }}
              id="header-return-main-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--chamber)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: 'var(--ink)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={showReturnButton ? "Return to Main Menu" : "Leave Chamber / Conclude Debate"}
            >
              {showReturnButton ? <Home size={14} /> : <ArrowLeft size={14} />}
              <span>{showReturnButton ? "Main Menu" : "Leave Chamber"}</span>
            </button>
          )}

          {/* Leave Chamber Confirmation Modal */}
          {showConfirmExit && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                padding: '16px'
              }}
            >
              <div
                className="card-surface"
                style={{
                  maxWidth: '420px',
                  width: '100%',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: '1px solid var(--line-strong)',
                  boxShadow: 'var(--shadow-lg)'
                }}
              >
                <div className="eyebrow" style={{ color: 'var(--against)' }}>
                  LEAVE ACTIVE DEBATE?
                </div>
                <h3 style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>
                  Conclude round and return to setup?
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Leaving now will end your session in this chamber and return you to the parlour lobby.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowConfirmExit(false)}
                    className="btn-ghost"
                    style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                  >
                    Stay in Debate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmExit(false);
                      onReturnLobby();
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.88rem', background: 'var(--against)', color: '#ffffff' }}
                  >
                    Leave Chamber
                  </button>
                </div>
              </div>
            </div>
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
            textWrap: 'balance',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          {motionText || "This House believes that artificial intelligence development should be subject to international oversight."}
        </h1>
      </motion.div>
    </header>
  );
}

export default DebateHeader;
