import { useState, useEffect } from 'react';

const CONSENT_KEY = 'aison_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'rgba(10,10,10,0.97)',
        borderTop: '1px solid rgba(101,196,52,0.25)',
        backdropFilter: 'blur(8px)',
        padding: '14px 24px',
      }}
    >
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap',
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter,sans-serif', lineHeight: 1.5,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65c434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            <path d="M12 8v4m0 4h.01"/>
          </svg>
          Vi bruger kun nødvendige cookies for at siden fungerer — ingen sporing, ingen annoncer.{' '}
          <a href="https://ailean.dk/ailean-privacy.html" target="_blank" rel="noopener noreferrer"
            style={{ color: '#65c434', textDecoration: 'none', marginLeft: 4 }}>
            Privatlivspolitik
          </a>
        </span>
        <button
          onClick={accept}
          style={{
            flexShrink: 0,
            background: '#65c434', color: '#fff', border: 'none',
            padding: '8px 20px', borderRadius: 8,
            fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          OK, forstået
        </button>
      </div>
    </div>
  );
}
