import { useEffect } from 'react';

export default function BurgerMenu({ open, onClose, vimplUser, onLogout, onNewProject, hasActiveProject }) {
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
            <p className="text-sm font-medium text-gray-700 truncate">{vimplUser.email}</p>
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold text-craft bg-craft/10 px-2 py-0.5 rounded-full">
              {vimplUser.subscriptionTier || 'trial'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-2">
          {hasActiveProject && (
            <button
              onClick={() => { onNewProject(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors text-left"
            >
              <span className="text-lg">＋</span>
              Nyt projekt
            </button>
          )}

          <a
            href="https://frontend-puce-ten-18.vercel.app/dashboard.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors"
          >
            <span className="text-lg">🏠</span>
            vimpl oversigt
          </a>

          <a
            href="https://frontend-puce-ten-18.vercel.app/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors"
          >
            <span className="text-lg">⭐</span>
            Opgrader abonnement
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
      </div>
    </>
  );
}
