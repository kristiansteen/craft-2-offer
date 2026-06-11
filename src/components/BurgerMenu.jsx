import { useEffect, useState } from 'react';
import CvrVerification from './CvrVerification';

function isCvrDismissed() {
  try {
    const saved = JSON.parse(localStorage.getItem('aison_cvr_verification'));
    return !!(saved?.verified && saved?.dismissed);
  } catch { return false; }
}

export default function BurgerMenu({ open, onClose, vimplUser, token, onLogout, onNewProject, onOverview, hasActiveProject }) {
  const [cvrVerified, setCvrVerified] = useState(isCvrDismissed);

  useEffect(() => {
    if (open) setCvrVerified(isCvrDismissed());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={[
        'fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-700 text-sm">Menu</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* User info */}
        {vimplUser && (
          <div className="px-5 py-3 border-b border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">Logget ind som</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-700 truncate">{vimplUser.email}</p>
              </div>
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold text-craft bg-craft/10 px-2 py-0.5 rounded-full">
              {vimplUser.subscriptionTier || 'trial'}
            </span>
          </div>
        )}

        {/* CVR Verification */}
        <div className="px-4 py-3 border-b border-gray-100">
          <CvrVerification token={token} onVerified={() => setCvrVerified(true)} />
        </div>

        {/* Actions */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-2">
          <button
            onClick={() => { onOverview?.(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/>
            </svg>
            Opgaveoversigt
          </button>

          <button
            onClick={() => { onNewProject(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Ny opgave
          </button>

          <a
            href="https://app.vimpl.com/dashboard.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Projektoversigt
          </a>

          <a
            href="https://app.vimpl.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Opgrader abonnement
          </a>
        </div>

        {/* Support */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] uppercase tracking-wide text-gray-300 font-semibold mb-2 px-1">Support</p>
          <a
            href="tel:+4529868839"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
            </svg>
            +45 29 86 88 39
          </a>
          <a
            href="mailto:help@vimpl.com"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Få support
          </a>
        </div>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <span className="text-lg">→</span>
            Log ud
          </button>
        </div>

        {/* Powered by vimpl */}
        <div className="px-4 py-4 border-t border-gray-100 flex justify-center">
          <a href="https://www.vimpl.com" target="_blank" rel="noopener noreferrer" className="aison-badge">
            <span>Powered by</span>
            <span className="vimpl-wordmark" style={{ fontSize: '22px', lineHeight: 1 }}>vimpl</span>
          </a>
        </div>
      </div>
    </>
  );
}
