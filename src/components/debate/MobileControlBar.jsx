import React from 'react';
import { PenTool, BookOpen, Send, Mic } from 'lucide-react';

export default function MobileControlBar({
  activeTab = 'floor', // 'floor' | 'record'
  onTabChange,
  turnCount = 0,
  isMyTurn = true,
  canSubmit = false,
  onSubmitTurn
}) {
  return (
    <div
      className="mobile-control-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
        padding: '8px 16px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Segmented Switcher */}
      <div
        style={{
          display: 'flex',
          background: 'var(--chamber)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)'
        }}
      >
        <button
          onClick={() => onTabChange('floor')}
          id="mobile-tab-floor"
          style={{
            padding: '7px 14px',
            fontSize: '0.82rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'floor' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'floor' ? 'var(--ink)' : 'var(--ink-muted)',
            boxShadow: activeTab === 'floor' ? 'var(--shadow-sm)' : 'none',
            fontWeight: 700
          }}
        >
          <PenTool size={13} />
          <span>The Floor</span>
        </button>

        <button
          onClick={() => onTabChange('record')}
          id="mobile-tab-record"
          style={{
            padding: '7px 14px',
            fontSize: '0.82rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'record' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'record' ? 'var(--ink)' : 'var(--ink-muted)',
            boxShadow: activeTab === 'record' ? 'var(--shadow-sm)' : 'none',
            fontWeight: 700
          }}
        >
          <BookOpen size={13} />
          <span>Record ({turnCount})</span>
        </button>
      </div>

      {/* Quick Mobile Action */}
      {isMyTurn && (
        <button
          onClick={onSubmitTurn}
          disabled={!canSubmit}
          id="mobile-submit-btn"
          className="btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '0.86rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--ink)',
            color: 'var(--ground)'
          }}
        >
          <Send size={14} />
          <span>Pass Floor</span>
        </button>
      )}
    </div>
  );
}
