import { useState } from 'react';

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function Panel2Efterse({ jobBreakdown, setJobBreakdown, loading, onApprove, canApprove }) {
  const [editingScope, setEditingScope] = useState(false);

  if (loading && !jobBreakdown) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <span className="w-8 h-8 border-2 border-gray-200 border-t-craft rounded-full animate-spin" />
        <span className="text-sm">Analyserer job…</span>
      </div>
    );
  }

  if (!jobBreakdown) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 px-6 text-center">
        <span className="text-4xl">🔍</span>
        <p className="text-sm">Analyser et job i panel 1 for at se opgaveoversigten her.</p>
      </div>
    );
  }

  function updateTrade(id, field, value) {
    setJobBreakdown(prev => ({
      ...prev,
      trades: prev.trades.map(t => t.id === id ? { ...t, [field]: value } : t),
    }));
  }

  function removeTrade(id) {
    setJobBreakdown(prev => ({ ...prev, trades: prev.trades.filter(t => t.id !== id) }));
  }

  function updateMaterial(id, field, value) {
    setJobBreakdown(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === id ? { ...m, [field]: value } : m),
    }));
  }

  function removeMaterial(id) {
    setJobBreakdown(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Title */}
        <div className="mb-4 pb-3 border-b border-gray-100">
          <input
            value={jobBreakdown.title || ''}
            onChange={e => setJobBreakdown(prev => ({ ...prev, title: e.target.value }))}
            className="w-full text-base font-semibold text-gray-800 outline-none border-b border-transparent focus:border-craft py-0.5"
          />
        </div>

        {/* Scope */}
        <Section title="Omfang">
          {editingScope ? (
            <textarea
              value={jobBreakdown.scope || ''}
              onChange={e => setJobBreakdown(prev => ({ ...prev, scope: e.target.value }))}
              onBlur={() => setEditingScope(false)}
              autoFocus
              className="input text-sm resize-none"
              rows={3}
            />
          ) : (
            <p
              onClick={() => setEditingScope(true)}
              className="text-sm text-gray-600 leading-relaxed cursor-text hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
            >
              {jobBreakdown.scope}
            </p>
          )}
        </Section>

        {/* Trades */}
        <Section title="Faggrupper">
          <div className="flex flex-col gap-2">
            {(jobBreakdown.trades || []).map(t => (
              <div key={t.id} className="flex items-start gap-2 group">
                <div className="flex-1">
                  <input
                    value={t.name}
                    onChange={e => updateTrade(t.id, 'name', e.target.value)}
                    className="input text-xs font-medium mb-0.5"
                  />
                  <input
                    value={t.description}
                    onChange={e => updateTrade(t.id, 'description', e.target.value)}
                    className="w-full text-xs text-gray-500 outline-none border-b border-transparent focus:border-craft px-1 py-0.5"
                  />
                </div>
                <button
                  onClick={() => removeTrade(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 text-xs mt-1 transition-opacity"
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => setJobBreakdown(prev => ({
                ...prev,
                trades: [...(prev.trades || []), { id: `t${Date.now()}`, name: '', description: '' }],
              }))}
              className="text-xs text-craft hover:text-craft-dark border border-dashed border-craft/30 hover:border-craft rounded-lg px-2 py-1 transition-colors"
            >
              + Tilføj faggruppe
            </button>
          </div>
        </Section>

        {/* Measurements */}
        {(jobBreakdown.measurements || []).length > 0 && (
          <Section title="Mål">
            <div className="flex flex-col gap-1">
              {jobBreakdown.measurements.map(m => (
                <div key={m.id} className="flex gap-2 text-xs">
                  <span className="text-gray-500 flex-1">{m.item}</span>
                  <span className="font-medium text-gray-700">{m.value}</span>
                  {m.note && <span className="text-gray-400 italic">{m.note}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Materials */}
        {(jobBreakdown.materials || []).length > 0 && (
          <Section title="Materialer">
            <div className="flex flex-col gap-1.5">
              {jobBreakdown.materials.map(m => (
                <div key={m.id} className="flex items-center gap-2 group">
                  <input
                    value={m.name}
                    onChange={e => updateMaterial(m.id, 'name', e.target.value)}
                    className="flex-1 text-xs text-gray-600 outline-none border-b border-transparent focus:border-craft px-1 py-0.5"
                  />
                  <input
                    value={m.quantity}
                    onChange={e => updateMaterial(m.id, 'quantity', e.target.value)}
                    className="w-16 text-xs text-gray-500 outline-none border-b border-transparent focus:border-craft px-1 py-0.5 text-right"
                  />
                  <button
                    onClick={() => removeMaterial(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 text-xs transition-opacity"
                  >✕</button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Risks */}
        {(jobBreakdown.risks || []).length > 0 && (
          <Section title="Risici">
            <div className="flex flex-col gap-1.5">
              {jobBreakdown.risks.map(r => (
                <div key={r.id} className="text-xs">
                  <span className="text-amber-600 font-medium">{r.description}</span>
                  {r.mitigation && <span className="text-gray-400"> — {r.mitigation}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100">
        <button
          onClick={onApprove}
          disabled={!canApprove}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Genererer tilbud…
            </>
          ) : (
            <>Godkend & lav tilbud →</>
          )}
        </button>
      </div>
    </div>
  );
}
