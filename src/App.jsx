import { useState, useEffect, useRef } from 'react';
import Panel1Indtal from './components/Panel1Indtal.jsx';
import Panel2Efterse from './components/Panel2Efterse.jsx';
import Panel3Tilbud from './components/Panel3Tilbud.jsx';
import Panel4Koordiner from './components/Panel4Koordiner.jsx';
import Panel5Projektplan from './components/Panel5Projektplan.jsx';
import { analyzeJob, generateOffer, generateProjectPlan } from './services/craftService.js';

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'craft2offer_vimpl_config';
const DRAFT_KEY   = 'craft2offer_draft';
const VIMPL_LOGIN_URL = 'https://frontend-puce-ten-18.vercel.app/login.html';
const BACKEND_URL     = 'https://backend-eight-rho-46.vercel.app';
const PRICING_URL     = 'https://frontend-puce-ten-18.vercel.app/pricing';

// ── PanelShell ────────────────────────────────────────────────────────────────
function PanelShell({ num, label, children }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <span className="text-xs font-bold text-white bg-craft rounded px-1.5 py-0.5 leading-none">{num}</span>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {children}
      </div>
    </div>
  );
}

// ── Blank state ───────────────────────────────────────────────────────────────
function blankState() {
  return {
    input: '',
    jobBreakdown: null,
    offerLines: null,
    subcontractors: [],
    projectPlan: null,
    boardUrl: null,
    boardId: null,
  };
}

// ── Carousel positioning ──────────────────────────────────────────────────────
function getCarouselStyle(n, activePanel) {
  const offset = n - activePanel;
  const base = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    transition: 'left 0.38s cubic-bezier(0.4,0,0.2,1), width 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, box-shadow 0.38s, border-radius 0.38s',
    overflow: 'hidden',
  };
  const r = '8px';

  // Panel 3 (Tilbud) — full width when active
  if (activePanel === 3) {
    if (offset === 0) return { ...base, left: '0%', width: '100%', opacity: 1, zIndex: 10, boxShadow: 'none', borderRadius: 0 };
    return { ...base, left: offset < 0 ? '-100%' : '100%', width: '100%', opacity: 0, zIndex: 0, pointerEvents: 'none', borderRadius: 0 };
  }

  // Panels 2, 4 & 5 — 30% centred, neighbours peek on both sides
  if (activePanel === 2 || activePanel === 4 || activePanel === 5) {
    if (offset === 0)  return { ...base, left: '35%', width: '30%', opacity: 1,    zIndex: 10, boxShadow: '0 8px 48px rgba(0,0,0,0.22)', borderRadius: r };
    if (offset === -1) return { ...base, left: '1%',  width: '33%', opacity: 0.45, zIndex: 5,  cursor: 'pointer', borderRadius: r };
    if (offset === 1)  return { ...base, left: '66%', width: '33%', opacity: 0.45, zIndex: 5,  cursor: 'pointer', borderRadius: r };
    return { ...base, left: offset < 0 ? '-20%' : '100%', width: '18%', opacity: 0, zIndex: 0, pointerEvents: 'none', borderRadius: r };
  }

  // Panel 1 — flush-left 30%, next panel fills the right
  if (offset === 0)  return { ...base, left: '0%',  width: '30%', opacity: 1,    zIndex: 10, boxShadow: '0 8px 48px rgba(0,0,0,0.22)', borderRadius: r };
  if (offset === 1)  return { ...base, left: '31%', width: '60%', opacity: 0.55, zIndex: 5,  cursor: 'pointer', borderRadius: r };
  if (offset === 2)  return { ...base, left: '92%', width: '7%',  opacity: 0.3,  zIndex: 3,  cursor: 'pointer', borderRadius: r };
  return { ...base, left: offset < 0 ? '-20%' : '100%', width: '18%', opacity: 0, zIndex: 0, pointerEvents: 'none', borderRadius: r };
}

export default function App() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const [loggedOut, setLoggedOut] = useState(false);
  const [vimplToken, setVimplToken] = useState(() => {
    try {
      const urlToken = new URLSearchParams(window.location.search).get('token');
      if (urlToken) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, token: urlToken }));
        window.history.replaceState(null, '', window.location.pathname);
        return urlToken;
      }
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').token || null;
    } catch { return null; }
  });
  const [vimplUser, setVimplUser] = useState(null);

  function refreshVimplUser(token) {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.user) setVimplUser(data.user);
    }).catch(() => {});
  }

  useEffect(() => { refreshVimplUser(vimplToken); }, [vimplToken]); // eslint-disable-line

  useEffect(() => {
    function onFocus() { refreshVimplUser(vimplToken); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [vimplToken]); // eslint-disable-line

  function loginWithVimpl() {
    const returnTo = window.location.href.split('?')[0];
    window.location.href = `${VIMPL_LOGIN_URL}?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function loginWithGoogle() {
    const state = btoa(window.location.origin);
    window.location.href = `${BACKEND_URL}/api/v1/auth/google?state=${encodeURIComponent(state)}`;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setVimplToken(null);
    setLoggedOut(true);
  }

  function getProxyAuth() {
    return vimplToken ? { token: vimplToken } : null;
  }

  // ── Carousel ──────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(1);

  // ── Job state ─────────────────────────────────────────────────────────────
  const saveTimer = useRef(null);
  const [input, setInput] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}').input || ''; } catch { return ''; }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [jobBreakdown, setJobBreakdown] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}').jobBreakdown || null; } catch { return null; }
  });
  const [offerLines, setOfferLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}').offerLines || null; } catch { return null; }
  });
  const [generatingOffer, setGeneratingOffer] = useState(false);
  const [subcontractors, setSubcontractors] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}').subcontractors || []; } catch { return []; }
  });
  const [projectPlan, setProjectPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}').projectPlan || null; } catch { return null; }
  });
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [boardUrl, setBoardUrl] = useState(null);
  const [boardId, setBoardId] = useState(null);

  // ── Auto-save draft to localStorage ──────────────────────────────────────
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          input, jobBreakdown, offerLines, subcontractors, projectPlan, boardUrl, boardId,
        }));
      } catch {}
    }, 800);
  }, [input, jobBreakdown, offerLines, subcontractors, projectPlan, boardUrl, boardId]);

  function clearDraft() {
    const s = blankState();
    setInput(s.input);
    setJobBreakdown(null);
    setOfferLines(null);
    setSubcontractors([]);
    setProjectPlan(null);
    setBoardUrl(null);
    setBoardId(null);
    setActivePanel(1);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setJobBreakdown(null);
    setOfferLines(null);
    setProjectPlan(null);
    try {
      const breakdown = await analyzeJob(input, getProxyAuth());
      setJobBreakdown(breakdown);
      setActivePanel(2);
    } catch (err) {
      setAnalyzeError(err.message || 'Analyse fejlede.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateOffer() {
    if (!jobBreakdown) return;
    setGeneratingOffer(true);
    try {
      const lines = await generateOffer(jobBreakdown, getProxyAuth());
      setOfferLines(lines);
      setActivePanel(3);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingOffer(false);
    }
  }

  async function handleGeneratePlan() {
    if (!jobBreakdown || !offerLines) return;
    setGeneratingPlan(true);
    try {
      const plan = await generateProjectPlan(jobBreakdown, offerLines, subcontractors, getProxyAuth());
      setProjectPlan(plan);
      setActivePanel(5);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPlan(false);
    }
  }

  // ── Login gate ────────────────────────────────────────────────────────────
  if (!vimplToken) {
    const returnTo = encodeURIComponent(window.location.origin);
    if (loggedOut) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-craft mb-2">craft2offer</div>
            <p className="text-slate-500 text-sm">Du er logget ud.</p>
          </div>
          <button
            onClick={() => window.location.replace(`${VIMPL_LOGIN_URL}?returnTo=${returnTo}`)}
            className="px-6 py-3 bg-craft text-white font-semibold rounded-xl hover:bg-craft-dark transition-colors"
          >
            Log ind
          </button>
        </div>
      );
    }
    window.location.replace(`${VIMPL_LOGIN_URL}?returnTo=${returnTo}`);
    return null;
  }

  const PANELS = [
    { num: 1, label: 'Indtal' },
    { num: 2, label: 'Efterse' },
    { num: 3, label: 'Tilbud' },
    { num: 4, label: 'Koordiner' },
    { num: 5, label: 'Projektplan' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-400 tracking-wide uppercase pointer-events-none">
          Craft 2 Offer
        </span>
        <a
          href="https://www.vimpl.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <span>Powered by</span>
          <span className="font-bold text-lg leading-none text-craft" style={{ fontFamily: 'Georgia, serif' }}>vimpl</span>
        </a>
        <div className="flex items-center gap-3">
          {vimplUser && (
            <span className="text-xs text-gray-400 hidden sm:block">{vimplUser.email}</span>
          )}
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 rounded-lg px-2 py-1 transition-colors"
          >
            Log ud
          </button>
        </div>
      </header>

      {/* Step navigator */}
      <div className="relative flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 border-b border-gray-200 shrink-0">
        {/* Left utility buttons */}
        <div className="absolute left-4 flex items-center gap-1.5">
          {(input || offerLines) && (
            <button
              onClick={clearDraft}
              className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 rounded-md px-2 py-1 transition-colors"
            >
              Ryd
            </button>
          )}
        </div>

        <button
          onClick={() => setActivePanel(p => Math.max(1, p - 1))}
          disabled={activePanel === 1}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors px-2 text-sm select-none"
        >
          ←
        </button>

        {PANELS.map(s => (
          <button
            key={s.num}
            onClick={() => setActivePanel(s.num)}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
              activePanel === s.num
                ? 'bg-craft text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200',
            ].join(' ')}
          >
            <span className={[
              'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              activePanel === s.num ? 'bg-white/30 text-white' : 'bg-gray-300 text-gray-500',
            ].join(' ')}>{s.num}</span>
            {s.label}
          </button>
        ))}

        <button
          onClick={() => setActivePanel(p => Math.min(5, p + 1))}
          disabled={activePanel === 5}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors px-2 text-sm select-none"
        >
          →
        </button>
      </div>

      {/* Carousel */}
      <div className="relative flex-1 bg-slate-100 overflow-hidden">

        {/* Panel 1 — Indtal */}
        <div style={getCarouselStyle(1, activePanel)} onClick={activePanel !== 1 ? () => setActivePanel(1) : undefined}>
          <PanelShell num="1" label="Indtal">
            <Panel1Indtal
              input={input}
              setInput={setInput}
              onAnalyze={handleAnalyze}
              loading={analyzing}
              error={analyzeError}
              canAnalyze={!!input.trim() && !!vimplToken}
            />
          </PanelShell>
          {activePanel !== 1 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 2 — Efterse */}
        <div style={getCarouselStyle(2, activePanel)} onClick={activePanel !== 2 ? () => setActivePanel(2) : undefined}>
          <PanelShell num="2" label="Efterse">
            <Panel2Efterse
              jobBreakdown={jobBreakdown}
              setJobBreakdown={setJobBreakdown}
              loading={analyzing || generatingOffer}
              onApprove={handleGenerateOffer}
              canApprove={!!jobBreakdown && !generatingOffer}
            />
          </PanelShell>
          {activePanel !== 2 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 3 — Tilbud */}
        <div style={getCarouselStyle(3, activePanel)} onClick={activePanel !== 3 ? () => setActivePanel(3) : undefined}>
          <PanelShell num="3" label="Tilbud">
            <Panel3Tilbud
              offerLines={offerLines}
              setOfferLines={setOfferLines}
              jobBreakdown={jobBreakdown}
              loading={generatingOffer}
              onNext={() => setActivePanel(4)}
              proxyAuth={getProxyAuth()}
            />
          </PanelShell>
          {activePanel !== 3 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 4 — Koordiner */}
        <div style={getCarouselStyle(4, activePanel)} onClick={activePanel !== 4 ? () => setActivePanel(4) : undefined}>
          <PanelShell num="4" label="Koordiner">
            <Panel4Koordiner
              subcontractors={subcontractors}
              setSubcontractors={setSubcontractors}
              jobBreakdown={jobBreakdown}
              onGeneratePlan={handleGeneratePlan}
              loading={generatingPlan}
              canGenerate={!!jobBreakdown && !!offerLines && !generatingPlan}
            />
          </PanelShell>
          {activePanel !== 4 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 5 — Projektplan */}
        <div style={getCarouselStyle(5, activePanel)} onClick={activePanel !== 5 ? () => setActivePanel(5) : undefined}>
          <PanelShell num="5" label="Projektplan">
            <Panel5Projektplan
              projectPlan={projectPlan}
              setProjectPlan={setProjectPlan}
              jobBreakdown={jobBreakdown}
              subcontractors={subcontractors}
              loading={generatingPlan}
              vimplToken={vimplToken}
              vimplUser={vimplUser}
              boardUrl={boardUrl}
              setBoardUrl={setBoardUrl}
              boardId={boardId}
              setBoardId={setBoardId}
              pricingUrl={PRICING_URL}
            />
          </PanelShell>
          {activePanel !== 5 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

      </div>
    </div>
  );
}
