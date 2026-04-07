import { useState, useEffect, useRef } from 'react';
import Panel1Indtal from './components/Panel1Indtal.jsx';
import Panel2Efterse from './components/Panel2Efterse.jsx';
import Panel3Tilbud from './components/Panel3Tilbud.jsx';
import Panel4Koordiner from './components/Panel4Koordiner.jsx';
import Panel5Projektplan from './components/Panel5Projektplan.jsx';
import BurgerMenu from './components/BurgerMenu.jsx';
import Dashboard from './components/Dashboard.jsx';
import LoginPage from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import { analyzeJob, generateOffer, generateProjectPlan } from './services/craftService.js';
import { useAisonInterviewer } from './hooks/useAisonInterviewer.js';
import { useVoiceRecorder } from './hooks/useVoiceRecorder.js';
import { fetchProjects, upsertProject, deleteProject as apiDeleteProject } from './services/projectService.js';
import { BACKEND_URL } from './lib/api.js';

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY  = 'craft2offer_vimpl_config';
const PROJECTS_KEY = 'craft2offer_projects';
const ACTIVE_KEY   = 'craft2offer_active';
const PRICING_URL  = 'https://app.vimpl.com/pricing';

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
function getCarouselStyle(n, activePanel, isMobile) {
  const offset = n - activePanel;
  const base = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    transition: 'left 0.38s cubic-bezier(0.4,0,0.2,1), width 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, box-shadow 0.38s, border-radius 0.38s',
    overflow: 'hidden',
  };
  const r = '8px';

  // Mobile — active panel fills screen, others slide off
  if (isMobile) {
    if (offset === 0) return { ...base, left: '0%', width: '100%', opacity: 1, zIndex: 10, borderRadius: 0 };
    return { ...base, left: offset < 0 ? '-100%' : '100%', width: '100%', opacity: 0, zIndex: 0, pointerEvents: 'none', borderRadius: 0 };
  }

  // Panel 3 (Tilbud) — 50% centred, neighbours peek on both sides
  if (activePanel === 3) {
    if (offset === 0)  return { ...base, left: '25%', width: '50%', opacity: 1,    zIndex: 10, boxShadow: '0 8px 48px rgba(0,0,0,0.22)', borderRadius: r };
    if (offset === -1) return { ...base, left: '1%',  width: '23%', opacity: 0.45, zIndex: 5,  cursor: 'pointer', borderRadius: r };
    if (offset === 1)  return { ...base, left: '76%', width: '23%', opacity: 0.45, zIndex: 5,  cursor: 'pointer', borderRadius: r };
    return { ...base, left: offset < 0 ? '-20%' : '100%', width: '18%', opacity: 0, zIndex: 0, pointerEvents: 'none', borderRadius: r };
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

function newProject() {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    input: '',
    jobBreakdown: null,
    offerLines: null,
    subcontractors: [],
    projectPlan: null,
    boardUrl: null,
    boardId: null,
    offerStatus: 'draft',
    ragStatus: null,
  };
}

export default function App() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const [loggedOut, setLoggedOut] = useState(false);
  const [authView, setAuthView]   = useState('login'); // 'login' | 'register'
  const [showBurger, setShowBurger] = useState(false);
  const [vimplToken, setVimplToken] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').token || null;
    } catch { return null; }
  });

  // Guard against the async ?code= exchange racing with the login redirect
  const [codeExchangePending, setCodeExchangePending] = useState(() =>
    !!new URLSearchParams(window.location.search).get('code')
  );

  // Exchange one-time ?code= for JWT on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    window.history.replaceState(null, '', window.location.pathname);
    fetch(`${BACKEND_URL}/api/v1/auth/exchange-code?code=${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.token) {
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, token: data.token }));
          setVimplToken(data.token);
          // Fire Aison Day 0 welcome email — idempotent, no-op if already sent
          fetch(`${BACKEND_URL}/api/v1/auth/aison-day0`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.token}` },
          }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setCodeExchangePending(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [vimplUser, setVimplUser] = useState(null);

  function refreshVimplUser(token) {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      if (r.status === 401) { logout(); return null; }
      return r.ok ? r.json() : null;
    }).then(data => {
      if (data?.user) setVimplUser(data.user);
    }).catch(() => {});
  }

  useEffect(() => { refreshVimplUser(vimplToken); }, [vimplToken]); // eslint-disable-line

  useEffect(() => {
    function onFocus() { refreshVimplUser(vimplToken); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [vimplToken]); // eslint-disable-line

  // Load projects from cloud on login — merge with local, cloud wins on conflict
  useEffect(() => {
    if (!vimplToken) return;
    fetchProjects(vimplToken).then(apiProjects => {
      setProjects(prev => {
        const merged = [...prev];
        for (const ap of apiProjects) {
          const idx = merged.findIndex(p => p.id === ap.id);
          const cloudProject = { ...ap.data, id: ap.id, updated_at: ap.updatedAt };
          if (idx === -1) merged.push(cloudProject);
          else if (new Date(ap.updatedAt) > new Date(merged[idx].updated_at || 0)) merged[idx] = cloudProject;
        }
        try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      });
    }).catch(() => {});
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

  // ── Projects list ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
      if (stored.length) return stored;
      // Migrate old single-draft if present
      const old = JSON.parse(localStorage.getItem('craft2offer_draft') || '{}');
      if (old.input || old.jobBreakdown) {
        return [{ ...newProject(), ...old }];
      }
      return [];
    } catch { return []; }
  });

  const [currentProjectId, setCurrentProjectId] = useState(() =>
    localStorage.getItem(ACTIVE_KEY) || null
  );

  // ── Carousel ──────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(1);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Per-project panel state (loaded from current project) ─────────────────
  const saveTimer = useRef(null);
  const [input, setInput]               = useState('');
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [jobBreakdown, setJobBreakdown] = useState(null);
  const [offerLines, setOfferLines]     = useState(null);
  const [generatingOffer, setGeneratingOffer] = useState(false);
  const [subcontractors, setSubcontractors]   = useState([]);
  const [projectPlan, setProjectPlan]         = useState(null);
  const [generatingPlan, setGeneratingPlan]   = useState(false);
  const [boardUrl, setBoardUrl] = useState(null);
  const [boardId, setBoardId]   = useState(null);

  // Load state when switching to a project
  useEffect(() => {
    if (!currentProjectId) return;
    const proj = projects.find(p => p.id === currentProjectId);
    if (!proj) { setCurrentProjectId(null); return; }
    setInput(proj.input || '');
    setJobBreakdown(proj.jobBreakdown || null);
    setOfferLines(proj.offerLines || null);
    setSubcontractors(proj.subcontractors || []);
    setProjectPlan(proj.projectPlan || null);
    setBoardUrl(proj.boardUrl || null);
    setBoardId(proj.boardId || null);
    setActivePanel(1);
  }, [currentProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save active project
  useEffect(() => {
    if (!currentProjectId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setProjects(prev => {
        const updated = prev.map(p => {
          if (p.id !== currentProjectId) return p;
          const updatedProject = { ...p, input, jobBreakdown, offerLines, subcontractors, projectPlan, boardUrl, boardId, updated_at: new Date().toISOString() };
          if (vimplToken) upsertProject(vimplToken, updatedProject).catch(() => {});
          return updatedProject;
        });
        try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }, 800);
  }, [input, jobBreakdown, offerLines, subcontractors, projectPlan, boardUrl, boardId, currentProjectId]); // eslint-disable-line

  // ── Aison + voice recorder ───────────────────────────────────────────────
  const aison = useAisonInterviewer();
  const { isRecording, interimText, error: recorderError, supported: recorderSupported, start: startRecording, stop: stopRecording } =
    useVoiceRecorder({ lang: 'da', onTranscriptUpdate: (text) => setInput(text) });

  // ── Project management ───────────────────────────────────────────────────
  function handleCreateProject() {
    const proj = newProject();
    setProjects(prev => {
      const updated = [proj, ...prev];
      try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (vimplToken) upsertProject(vimplToken, proj).catch(() => {});
    setCurrentProjectId(proj.id);
    try { localStorage.setItem(ACTIVE_KEY, proj.id); } catch {}
  }

  function handleOpenProject(id) {
    setCurrentProjectId(id);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
  }

  function handleBackToDashboard() {
    setCurrentProjectId(null);
    try { localStorage.removeItem(ACTIVE_KEY); } catch {}
  }

  function handleDeleteProject(id) {
    if (vimplToken) apiDeleteProject(vimplToken, id).catch(() => {});
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (currentProjectId === id) handleBackToDashboard();
  }

  function handleUpdateRag(id, ragStatus) {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ragStatus, updated_at: new Date().toISOString() } : p);
      try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated)); } catch {}
      const proj = updated.find(p => p.id === id);
      if (vimplToken && proj) upsertProject(vimplToken, proj).catch(() => {});
      return updated;
    });
  }

  function handleUpdateOfferStatus(id, offerStatus) {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, offerStatus, updated_at: new Date().toISOString() } : p);
      try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated)); } catch {}
      const proj = updated.find(p => p.id === id);
      if (vimplToken && proj) upsertProject(vimplToken, proj).catch(() => {});
      return updated;
    });
  }

  function clearCurrentProject() {
    setInput('');
    setJobBreakdown(null);
    setOfferLines(null);
    setSubcontractors([]);
    setProjectPlan(null);
    setBoardUrl(null);
    setBoardId(null);
    setActivePanel(1);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setJobBreakdown(null);
    setOfferLines(null);
    setProjectPlan(null);
    try {
      const effectiveInput = input.trim() ||
        aison.turns.filter(t => t.type === 'user').map(t => t.text).join('\n\n');
      const breakdown = await analyzeJob(effectiveInput, getProxyAuth());
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
      const offer = await generateOffer(jobBreakdown, getProxyAuth());

      // ── Inject risk contingency line ──────────────────────────────────────
      const risks = jobBreakdown.risks || [];
      const subtotal = offer.subtotal || 0;
      let contingencyPct = 0.05; // default 5%
      if (risks.length > 0) {
        const avgScore = risks.reduce((s, r) => s + (r.probability / 100) * (r.consequence / 100), 0) / risks.length;
        contingencyPct = Math.max(0.05, Math.min(0.25, avgScore));
      }
      const contingencyAmount = Math.round((subtotal * contingencyPct) / 100) * 100;
      const contingencyLine = {
        id: 'contingency',
        trade: 'Risiko',
        description: 'Reservering til uforudsete udgifter',
        qty: 1,
        unit: 'LS',
        unitPrice: contingencyAmount,
        total: contingencyAmount,
      };
      const updatedLines = [...(offer.lines || []), contingencyLine];
      const newSubtotal = updatedLines.reduce((s, l) => s + (l.total || 0), 0);
      const vat = newSubtotal * (offer.vatRate || 0.25);
      setOfferLines({ ...offer, lines: updatedLines, subtotal: newSubtotal, vat, grandTotal: newSubtotal + vat });
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

  // ── handleLogin — called by LoginPage and RegisterPage after successful auth ──
  function handleLogin(accessToken) {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, token: accessToken }));
    setVimplToken(accessToken);
    setLoggedOut(false);
    // Fire Aison Day 0 welcome email — idempotent, no-op if already sent
    fetch(`${BACKEND_URL}/api/v1/auth/aison-day0`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  // ── Login gate ────────────────────────────────────────────────────────────
  if (!vimplToken) {
    if (codeExchangePending) return null;
    if (authView === 'register') {
      return <RegisterPage onLogin={handleLogin} onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />;
  }

  // ── Dashboard (no active project) ─────────────────────────────────────────
  if (!currentProjectId) {
    return (
      <>
        <Dashboard
          projects={projects}
          vimplUser={vimplUser}
          onOpen={handleOpenProject}
          onCreate={handleCreateProject}
          onDelete={handleDeleteProject}
          onUpdateRag={handleUpdateRag}
          onUpdateStatus={handleUpdateOfferStatus}
          onBurger={() => setShowBurger(true)}
        />
        <BurgerMenu
          open={showBurger}
          onClose={() => setShowBurger(false)}
          vimplUser={vimplUser}
          token={vimplToken}
          onLogout={logout}
          onNewProject={handleCreateProject}
          onOverview={handleBackToDashboard}
        />
      </>
    );
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
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="aison-logo">AISON</span>
        </div>
        <button
          onClick={() => setShowBurger(true)}
          className="flex flex-col gap-1 items-center justify-center w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-craft transition-colors"
          title="Menu"
        >
          <span className="w-4 h-0.5 bg-gray-500 rounded" />
          <span className="w-4 h-0.5 bg-gray-500 rounded" />
          <span className="w-4 h-0.5 bg-gray-500 rounded" />
        </button>
      </header>

      {/* Step navigator */}
      <div className="relative flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 border-b border-gray-200 shrink-0">
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
            <span className="hidden sm:inline">{s.label}</span>
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
        <div style={getCarouselStyle(1, activePanel, isMobile)} onClick={activePanel !== 1 ? () => setActivePanel(1) : undefined}>
          <PanelShell num="1" label="Indtal">
            <Panel1Indtal
              input={input}
              setInput={setInput}
              onAnalyze={handleAnalyze}
              loading={analyzing}
              error={analyzeError}
              canAnalyze={(!!input.trim() || aison.turns.some(t => t.type === 'user')) && !!vimplToken}
              aison={aison}
              isRecording={isRecording}
              interimText={interimText}
              recorderSupported={recorderSupported}
              onRecord={() => isRecording ? stopRecording() : startRecording(input)}
            />
          </PanelShell>
          {activePanel !== 1 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 2 — Efterse */}
        <div style={getCarouselStyle(2, activePanel, isMobile)} onClick={activePanel !== 2 ? () => setActivePanel(2) : undefined}>
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
        <div style={getCarouselStyle(3, activePanel, isMobile)} onClick={activePanel !== 3 ? () => setActivePanel(3) : undefined}>
          <PanelShell num="3" label="Tilbud">
            <Panel3Tilbud
              offerLines={offerLines}
              setOfferLines={setOfferLines}
              jobBreakdown={jobBreakdown}
              loading={generatingOffer}
              onNext={() => setActivePanel(4)}
              proxyAuth={getProxyAuth()}
              vimplUser={vimplUser}
            />
          </PanelShell>
          {activePanel !== 3 && <div className="absolute inset-0 bg-slate-100/20 pointer-events-none" />}
        </div>

        {/* Panel 4 — Koordiner */}
        <div style={getCarouselStyle(4, activePanel, isMobile)} onClick={activePanel !== 4 ? () => setActivePanel(4) : undefined}>
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
        <div style={getCarouselStyle(5, activePanel, isMobile)} onClick={activePanel !== 5 ? () => setActivePanel(5) : undefined}>
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

      <BurgerMenu
        open={showBurger}
        onClose={() => setShowBurger(false)}
        vimplUser={vimplUser}
        onLogout={logout}
        onNewProject={handleCreateProject}
        onOverview={handleBackToDashboard}
      />
    </div>
  );
}
