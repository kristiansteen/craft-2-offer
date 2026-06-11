import { useState, useRef, useEffect } from 'react';

const PRICING_URL = 'https://app.vimpl.com/pricing';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDKK(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(amount);
}

function shortId(id) {
  return id ? id.slice(0, 8) : '—';
}

function getCurrentWeekNo(createdAt) {
  if (!createdAt) return 1;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / msPerWeek) + 1;
}

function getPlannedFinishWeek(projectPlan) {
  if (!projectPlan?.tasks?.length) return null;
  return Math.max(...projectPlan.tasks.map(t =>
    (t.startWeek || 1) + Math.ceil(((t.durationDays || 5) - 1) / 5)
  ));
}

function getDueThisWeek(projectPlan, createdAt) {
  if (!projectPlan?.tasks?.length) return 0;
  const cw = getCurrentWeekNo(createdAt);
  return projectPlan.tasks.filter(t => t.startWeek === cw).length;
}

function getOverdue(projectPlan, createdAt) {
  if (!projectPlan?.tasks?.length) return 0;
  const cw = getCurrentWeekNo(createdAt);
  return projectPlan.tasks.filter(t => {
    const endWeek = (t.startWeek || 1) + Math.ceil(((t.durationDays || 5) - 1) / 5);
    return endWeek < cw;
  }).length;
}

function getTopRisks(project) {
  const risks = project.jobBreakdown?.risks?.length
    ? project.jobBreakdown.risks
    : (project.projectPlan?.risks || []);
  return [...risks]
    .sort((a, b) => (b.probability * b.consequence) - (a.probability * a.consequence))
    .slice(0, 3);
}

function getTopOfferLines(project) {
  return (project.offerLines?.lines || []).slice(0, 3);
}

// ── RAG picker ────────────────────────────────────────────────────────────────

const RAG_OPTIONS = [
  { value: 'green', label: 'On track',  bg: 'bg-green-500', ring: 'ring-green-400' },
  { value: 'amber', label: 'At risk',   bg: 'bg-amber-400', ring: 'ring-amber-300' },
  { value: 'red',   label: 'Off track', bg: 'bg-red-500',   ring: 'ring-red-400'   },
];

function RagPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const current = RAG_OPTIONS.find(o => o.value === value) || { bg: 'bg-gray-300', label: 'Sæt status' };

  function handleOpen(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  return (
    <div className="flex justify-center">
      <button ref={btnRef} onClick={handleOpen} title={current.label}
        className={`w-5 h-5 rounded-full ${current.bg} ring-2 ring-offset-1 ${value ? current.ring : 'ring-gray-200'} transition-all hover:scale-110`}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-1.5 min-w-[110px] -translate-x-1/2"
            style={{ top: pos.top, left: pos.left }}>
            {RAG_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={e => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 text-left transition-colors ${value === opt.value ? 'bg-gray-50' : ''}`}>
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.bg}`} />
                <span className="text-xs text-gray-700">{opt.label}</span>
              </button>
            ))}
            {value && (
              <button onClick={e => { e.stopPropagation(); onChange(null); setOpen(false); }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 text-left">
                <span className="w-3.5 h-3.5 rounded-full shrink-0 bg-gray-200" />
                <span className="text-xs text-gray-400">Nulstil</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Offer status picker ───────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Kladde',   bg: 'bg-gray-100',  text: 'text-gray-600'  },
  { value: 'sent',     label: 'Sendt',    bg: 'bg-blue-100',  text: 'text-blue-700'  },
  { value: 'accepted', label: 'Godkendt', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'rejected', label: 'Afvist',   bg: 'bg-red-100',   text: 'text-red-600'   },
];

function StatusPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const current = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0];

  function handleOpen(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  return (
    <div>
      <button ref={btnRef} onClick={handleOpen}
        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${current.bg} ${current.text} hover:opacity-80 transition-opacity whitespace-nowrap`}>
        {current.label} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[120px]"
            style={{ top: pos.top, left: pos.left }}>
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={e => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                className={`text-left px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-gray-50 ${value === opt.value ? 'font-semibold' : ''} ${opt.text}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Matrix row ────────────────────────────────────────────────────────────────

function MatrixRow({ project, onOpen, onDelete, onUpdateRag, onUpdateStatus }) {
  const title      = project.jobBreakdown?.title || 'Ny opgave';
  const trades     = (project.jobBreakdown?.trades || []).slice(0, 3).map(t => t.name || t);
  const offerLines = getTopOfferLines(project);
  const topRisks   = getTopRisks(project);
  const finishWeek = getPlannedFinishWeek(project.projectPlan);
  const dueThisWeek = getDueThisWeek(project.projectPlan, project.created_at);
  const overdue    = getOverdue(project.projectPlan, project.created_at);
  const total      = project.offerLines?.grandTotal;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer group transition-colors"
      onClick={() => onOpen(project.id)}>

      {/* ID */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-mono text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {shortId(project.id)}
        </span>
      </td>

      {/* Opgave */}
      <td className="px-3 py-2.5 max-w-[180px]">
        <p className="text-sm font-medium text-gray-800 truncate leading-snug">{title}</p>
        {project.boardUrl && (
          <a href={project.boardUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-craft hover:underline">Åbn board ↗</a>
        )}
      </td>

      {/* Faggruppe */}
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {trades.map((t, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">{t}</span>
          ))}
          {!trades.length && <span className="text-xs text-gray-300">—</span>}
        </div>
      </td>

      {/* Oprettet */}
      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
        {formatDate(project.created_at)}
      </td>

      {/* Tilbudslinjer */}
      <td className="px-3 py-2.5 max-w-[200px]">
        {offerLines.length ? (
          <ul className="space-y-0.5">
            {offerLines.map((l, i) => (
              <li key={i} className="text-[11px] text-gray-600 truncate leading-snug">
                · {l.description || l.name || '—'}
              </li>
            ))}
            {(project.offerLines?.lines?.length || 0) > 3 && (
              <li className="text-[10px] text-gray-400">+{project.offerLines.lines.length - 3} flere</li>
            )}
          </ul>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Top risici */}
      <td className="px-3 py-2.5 max-w-[200px]">
        {topRisks.length ? (
          <ul className="space-y-0.5">
            {topRisks.map((r, i) => {
              const score = (r.probability || 0) * (r.consequence || 0);
              const heat  = score >= 6000 ? 'text-red-600' : score >= 3000 ? 'text-amber-600' : 'text-gray-500';
              return (
                <li key={r.id || i} className={`text-[11px] truncate leading-snug ${heat}`} title={r.title}>
                  · {r.title}
                </li>
              );
            })}
          </ul>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Afslutning */}
      <td className="px-3 py-2.5 text-center whitespace-nowrap">
        {finishWeek
          ? <span className="text-xs font-medium text-gray-700">Uge {finishWeek}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Denne uge */}
      <td className="px-3 py-2.5 text-center">
        {dueThisWeek > 0
          ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{dueThisWeek}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Forsinket */}
      <td className="px-3 py-2.5 text-center">
        {overdue > 0
          ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">{overdue}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Tilbud beløb */}
      <td className="px-3 py-2.5 whitespace-nowrap text-right">
        {total != null
          ? <span className="text-sm font-semibold text-gray-800">{formatDKK(total)}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Tilbudsstatus */}
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <StatusPicker value={project.offerStatus || 'draft'} onChange={s => onUpdateStatus(project.id, s)} />
      </td>

      {/* RAG */}
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <RagPicker value={project.ragStatus || null} onChange={s => onUpdateRag(project.id, s)} />
      </td>

      {/* Slet */}
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => onDelete(project)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1.5 py-1 rounded hover:bg-red-50">✕</button>
      </td>
    </tr>
  );
}

// ── Project matrix ────────────────────────────────────────────────────────────

function ProjectMatrix({ projects, onOpen, onDelete, onUpdateRag, onUpdateStatus }) {
  const sorted = [...projects].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

  const TH = ({ children, center, right }) => (
    <th className={`px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 ${center ? 'text-center' : right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <TH>ID</TH>
            <TH>Opgave</TH>
            <TH>Faggruppe</TH>
            <TH>Oprettet</TH>
            <TH>Tilbudslinjer</TH>
            <TH>Top risici</TH>
            <TH center>Afslutning</TH>
            <TH center>Denne uge</TH>
            <TH center>Forsinket</TH>
            <TH right>Beløb</TH>
            <TH>Status</TH>
            <TH center>RAG</TH>
            <TH></TH>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <MatrixRow
              key={p.id}
              project={p}
              onOpen={onOpen}
              onDelete={onDelete}
              onUpdateRag={onUpdateRag}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProgressBadge({ done, label }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      done
        ? 'bg-orange-50 text-orange-700 border border-orange-200'
        : 'bg-gray-100 text-gray-400 border border-gray-200'
    }`}>
      {done ? '✓ ' : ''}{label}
    </span>
  );
}

function ProjectCard({ project, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const title  = project.jobBreakdown?.title || 'Ny opgave';
  const trades = (project.jobBreakdown?.trades || []).slice(0, 3).map(t => t.name || t);

  return (
    <div
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-white border border-gray-200 hover:border-craft/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md flex flex-col gap-2"
    >
      <button
        onClick={e => { e.stopPropagation(); onDelete(project); }}
        className={`absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-all text-xs px-1.5 py-1 rounded hover:bg-red-50 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >✕</button>

      <p className="text-sm font-semibold text-gray-800 leading-snug pr-6 truncate">{title}</p>
      <p className="text-xs text-gray-400">{formatDate(project.updated_at)}</p>

      {trades.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trades.map((t, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">{t}</span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-1">
        <ProgressBadge done={!!project.jobBreakdown} label="Efterset" />
        <ProgressBadge done={!!project.offerLines}   label="Tilbud"   />
        <ProgressBadge done={!!project.projectPlan}  label="Plan"     />
        <ProgressBadge done={!!project.boardUrl}     label="Board"    />
      </div>

      {project.offerLines?.grandTotal != null && (
        <p className="text-sm font-bold text-craft mt-1">{formatDKK(project.offerLines.grandTotal)}</p>
      )}

      {project.boardUrl && (
        <a href={project.boardUrl} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs text-craft hover:underline font-medium mt-1">
          Åbn vimpl board ↗
        </a>
      )}
    </div>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ project, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Slet opgave?</h3>
        <p className="text-xs text-gray-500 mb-4">
          <span className="font-medium text-gray-700">"{project.jobBreakdown?.title || 'Ny opgave'}"</span> slettes permanent.
        </p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors">Slet</button>
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors">Annuller</button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ projects, vimplUser, onOpen, onCreate, onDelete, onUpdateRag, onUpdateStatus, onBurger }) {
  const [deletingProject, setDeletingProject] = useState(null);
  const [view, setView] = useState('matrix');

  const sorted  = [...projects].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  const isTrial = !vimplUser || (vimplUser.subscriptionTier !== 'commercial' && vimplUser.subscriptionTier !== 'enterprise');

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="w-24" />
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="aison-logo">AISON</span>
        </div>
        <div className="flex items-center gap-3">
          {vimplUser && isTrial && (
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium hover:bg-amber-100 transition-colors">
              Trial — Opgrader ↗
            </a>
          )}
          <button onClick={onBurger} className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800" title="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="2" y="8.25" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="2" y="12.5" width="14" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Trial banner */}
      {isTrial && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-sm">⚡</span>
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Gratis prøveperiode</span> — 1 opgave inkluderet. Opgrader for ubegrænsede opgaver og vimpl boards.
            </p>
          </div>
          <a href={PRICING_URL} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
            Se planer ↗
          </a>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Title bar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Mine opgaver</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projects.length} opgave{projects.length !== 1 ? 'r' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button
                  onClick={() => setView('matrix')}
                  className={`px-3 py-1.5 transition-colors ${view === 'matrix' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  ▤ Matrix
                </button>
                <button
                  onClick={() => setView('cards')}
                  className={`px-3 py-1.5 transition-colors ${view === 'cards' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  ⊞ Kort
                </button>
              </div>
            )}
            <button onClick={onCreate}
              className="flex items-center gap-1.5 bg-craft text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-craft-dark transition-colors">
              + Ny opgave
            </button>
          </div>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-3xl">🔨</div>
            <p className="text-sm font-medium text-gray-700">Ingen opgaver endnu</p>
            <p className="text-xs text-gray-400">Opret din første opgave for at komme i gang</p>
            <button onClick={onCreate}
              className="mt-2 bg-craft text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-craft-dark transition-colors">
              Opret første opgave
            </button>
          </div>
        )}

        {/* Matrix view */}
        {projects.length > 0 && view === 'matrix' && (
          <ProjectMatrix
            projects={sorted}
            onOpen={onOpen}
            onDelete={setDeletingProject}
            onUpdateRag={onUpdateRag}
            onUpdateStatus={onUpdateStatus}
          />
        )}

        {/* Card view */}
        {projects.length > 0 && view === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map(p => (
              <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={setDeletingProject} />
            ))}
          </div>
        )}
      </div>

      {deletingProject && (
        <DeleteModal
          project={deletingProject}
          onConfirm={() => { onDelete(deletingProject.id); setDeletingProject(null); }}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </div>
  );
}
