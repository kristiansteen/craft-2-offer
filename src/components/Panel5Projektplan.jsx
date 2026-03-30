import { useState } from 'react';

const BACKEND_URL = 'https://backend-eight-rho-46.vercel.app';

function WeekBar({ tasks, totalWeeks = 8 }) {
  if (!tasks?.length) return null;
  const colors = ['#E67E22', '#3498DB', '#2ECC71', '#9B59B6', '#E74C3C', '#1ABC9C', '#F39C12'];
  const trackColors = {};
  let ci = 0;

  return (
    <div className="mt-3">
      <div className="flex text-[10px] text-gray-300 mb-1 gap-px">
        {Array.from({ length: totalWeeks }, (_, i) => (
          <div key={i} className="flex-1 text-center">{i + 1}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {tasks.slice(0, 12).map(t => {
          if (!trackColors[t.trackId]) trackColors[t.trackId] = colors[ci++ % colors.length];
          const color = trackColors[t.trackId] || '#E67E22';
          const start = Math.max(0, (t.startWeek || 1) - 1);
          const dur = Math.max(1, Math.ceil((t.durationDays || 3) / 5));
          const leftPct = (start / totalWeeks) * 100;
          const widthPct = Math.min((dur / totalWeeks) * 100, 100 - leftPct);

          return (
            <div key={t.id} className="relative h-5 rounded bg-gray-50">
              <div className="absolute inset-y-0 rounded flex items-center px-1 overflow-hidden"
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color + '33', borderLeft: `3px solid ${color}` }}>
                <span className="text-[10px] text-gray-700 truncate">{t.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Panel5Projektplan({
  projectPlan, setProjectPlan, jobBreakdown, subcontractors,
  loading, vimplToken, vimplUser, boardUrl, setBoardUrl, boardId, setBoardId, pricingUrl,
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [inviteStatus, setInviteStatus] = useState({});

  if (loading && !projectPlan) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <span className="w-8 h-8 border-2 border-gray-200 border-t-craft rounded-full animate-spin" />
        <span className="text-sm">Genererer projektplan…</span>
      </div>
    );
  }

  if (!projectPlan) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 px-6 text-center">
        <span className="text-4xl">📅</span>
        <p className="text-sm">Tilføj evt. underentreprenører i panel 4, og generér derefter projektplanen.</p>
      </div>
    );
  }

  const totalWeeks = Math.max(
    ...((projectPlan.tasks || []).map(t => (t.startWeek || 1) + Math.ceil((t.durationDays || 3) / 5))),
    4,
  );

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const invitees = subcontractors
        .filter(s => s.email?.trim())
        .map(s => ({ email: s.email.trim(), name: s.name }));

      const payload = {
        plan_name: projectPlan.name || jobBreakdown?.title || 'Projekt',
        overview: projectPlan.overview || '',
        scope: jobBreakdown?.scope || '',
        tracks: projectPlan.tracks || [],
        tasks: (projectPlan.tasks || []).map(t => ({
          id: t.id,
          title: t.name,
          trackId: t.trackId,
          assignee: t.assignee,
          startWeek: t.startWeek,
          durationDays: t.durationDays,
          dependencies: t.dependencies || [],
          notes: t.notes || '',
        })),
        risks: (projectPlan.risks || []).map(r => ({
          description: r.description,
          impact: r.impact,
          mitigation: r.mitigation,
        })),
        invitees,
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/boards/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vimplToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Fejl: ${res.status}`);
      }

      const data = await res.json();
      setBoardId(data.boardId);
      setBoardUrl(data.boardUrl);
    } catch (err) {
      setExportError(err.message || 'Eksport fejlede.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Plan header */}
        <div className="mb-3 pb-3 border-b border-gray-100">
          <input
            value={projectPlan.name || ''}
            onChange={e => setProjectPlan(prev => ({ ...prev, name: e.target.value }))}
            className="w-full text-base font-semibold text-gray-800 outline-none border-b border-transparent focus:border-craft py-0.5"
          />
          {projectPlan.overview && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{projectPlan.overview}</p>
          )}
        </div>

        {/* Gantt-style timeline */}
        {(projectPlan.tasks || []).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Tidsplan — {totalWeeks} uger
            </h3>
            <WeekBar tasks={projectPlan.tasks} totalWeeks={totalWeeks} />
          </div>
        )}

        {/* Tracks */}
        {(projectPlan.tracks || []).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Faser</h3>
            <div className="flex flex-col gap-1.5">
              {projectPlan.tracks.map(track => {
                const trackTasks = (projectPlan.tasks || []).filter(t => t.trackId === track.id);
                return (
                  <div key={track.id} className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: track.color || '#E67E22' }} />
                    <div>
                      <span className="text-xs font-medium text-gray-700">{track.name}</span>
                      {trackTasks.length > 0 && (
                        <span className="text-xs text-gray-400"> — {trackTasks.length} opgaver</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks */}
        {(projectPlan.tasks || []).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opgaver</h3>
            <div className="flex flex-col gap-1.5">
              {projectPlan.tasks.map(t => (
                <div key={t.id} className="flex items-baseline gap-2 text-xs">
                  <span className="text-gray-700 flex-1">{t.name}</span>
                  {t.assignee && <span className="text-gray-400 shrink-0">{t.assignee}</span>}
                  <span className="text-gray-300 shrink-0 tabular-nums">
                    Uge {t.startWeek}, {t.durationDays}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {(projectPlan.risks || []).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Risici</h3>
            <div className="flex flex-col gap-1.5">
              {projectPlan.risks.map(r => (
                <div key={r.id} className="text-xs">
                  <span className={[
                    'font-medium',
                    r.impact === 'high' ? 'text-red-500' : r.impact === 'medium' ? 'text-amber-500' : 'text-gray-500',
                  ].join(' ')}>{r.description}</span>
                  {r.mitigation && <span className="text-gray-400"> — {r.mitigation}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subcontractors to invite */}
        {subcontractors.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inviteres til vimpl</h3>
            <div className="flex flex-col gap-1">
              {subcontractors.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-craft/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-craft">{(s.name || '?')[0]}</span>
                  </div>
                  <span className="text-gray-700">{s.name}</span>
                  {s.trade && <span className="text-gray-400">({s.trade})</span>}
                  {s.email ? (
                    <span className="text-gray-300 ml-auto">{s.email}</span>
                  ) : (
                    <span className="text-gray-200 ml-auto italic">ingen email</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success state */}
        {boardUrl && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Eksporteret til vimpl!</p>
            <a
              href={boardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-craft underline break-all"
            >
              {boardUrl}
            </a>
          </div>
        )}

        {exportError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs mb-3">
            {exportError}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 flex gap-2">
        {boardUrl ? (
          <a
            href={boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 text-center"
          >
            Åbn i vimpl →
          </a>
        ) : (
          <button
            onClick={handleExport}
            disabled={exporting || !vimplToken}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Eksporterer…
              </>
            ) : (
              <>Eksportér til vimpl →</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
