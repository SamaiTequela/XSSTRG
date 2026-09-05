import React from 'react';

// A render error used to take the whole chamber down to a blank white page with
// no way back: the root unmounted, so there was nothing left to click and the
// only recovery was for the player to work out that they had to reload. A
// debate in progress lives on the server, so returning to the parlour and
// rejoining by code is nearly always enough to carry on.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Chamber render error:', error, info?.componentStack);
  }

  handleReturn = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('phase');
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '18px',
          padding: '32px',
          textAlign: 'center',
          background: 'var(--ground, #121218)',
          color: 'var(--ink, #f4f3ef)'
        }}
      >
        <div
          style={{
            fontFamily: 'Bricolage Grotesque, system-ui, sans-serif',
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            fontWeight: 900
          }}
        >
          The chamber hit a snag
        </div>
        <p style={{ maxWidth: '46ch', lineHeight: 1.55, color: 'var(--ink-muted, #a9a7b8)' }}>
          Something went wrong drawing this screen. Your debate is stored on the
          server, so you can return to the parlour and rejoin with the room code
          to pick it back up.
        </p>
        <button
          type="button"
          onClick={this.handleReturn}
          style={{
            padding: '11px 22px',
            borderRadius: '999px',
            border: '1px solid var(--brass, #c9a24b)',
            background: 'var(--brass, #c9a24b)',
            color: '#121218',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer'
          }}
        >
          Return to the parlour
        </button>
        <details style={{ maxWidth: '60ch', color: 'var(--ink-muted, #a9a7b8)', fontSize: '0.8rem' }}>
          <summary style={{ cursor: 'pointer' }}>Technical detail</summary>
          <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: '8px' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </details>
      </div>
    );
  }
}
