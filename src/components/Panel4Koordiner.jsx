import { useState } from 'react';

const TRADE_SUGGESTIONS = [
  'Murer', 'Tømrer', 'Elektriker', 'VVS-installatør', 'Maler', 'Gulvlægger',
  'Smed', 'Tagdækker', 'Gulvvarme', 'Stilladsbygger',
];

export default function Panel4Koordiner({ subcontractors, setSubcontractors, jobBreakdown, onGeneratePlan, loading, canGenerate }) {
  const [newName, setNewName] = useState('');
  const [newTrade, setNewTrade] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  function addSubcontractor() {
    if (!newName.trim()) return;
    setSubcontractors(prev => [
      ...prev,
      { id: `sub${Date.now()}`, name: newName.trim(), trade: newTrade.trim(), email: newEmail.trim() },
    ]);
    setNewName('');
    setNewTrade('');
    setNewEmail('');
    setShowForm(false);
  }

  function removeSubcontractor(id) {
    setSubcontractors(prev => prev.filter(s => s.id !== id));
  }

  function updateSubcontractor(id, field, value) {
    setSubcontractors(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  // Suggest trades from jobBreakdown that aren't yet added
  const addedTrades = new Set(subcontractors.map(s => s.trade.toLowerCase()));
  const suggestedTrades = (jobBreakdown?.trades || [])
    .filter(t => !addedTrades.has(t.name.toLowerCase()))
    .map(t => t.name);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Intro */}
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Tilføj underentreprenører og samarbejdspartnere. De inviteres til vimpl-projektet når du eksporterer planen.
        </p>

        {/* Suggested from job analysis */}
        {suggestedTrades.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Foreslået fra jobanalyse:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTrades.map(trade => (
                <button
                  key={trade}
                  onClick={() => {
                    setNewTrade(trade);
                    setShowForm(true);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-craft/10 text-craft hover:bg-craft/20 border border-craft/20 transition-colors"
                >
                  + {trade}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subcontractor list */}
        {subcontractors.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {subcontractors.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50 group">
                <div className="w-8 h-8 rounded-full bg-craft/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-craft">{(s.name || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    value={s.name}
                    onChange={e => updateSubcontractor(s.id, 'name', e.target.value)}
                    className="w-full text-sm font-medium text-gray-700 outline-none bg-transparent border-b border-transparent focus:border-craft"
                  />
                  <div className="flex gap-2 mt-0.5">
                    <input
                      value={s.trade}
                      onChange={e => updateSubcontractor(s.id, 'trade', e.target.value)}
                      placeholder="Faggruppe"
                      className="flex-1 text-xs text-gray-500 outline-none bg-transparent border-b border-transparent focus:border-craft"
                    />
                    <input
                      value={s.email}
                      onChange={e => updateSubcontractor(s.id, 'email', e.target.value)}
                      placeholder="Email (valgfrit)"
                      className="flex-1 text-xs text-gray-400 outline-none bg-transparent border-b border-transparent focus:border-craft"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeSubcontractor(s.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 text-xs transition-opacity"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showForm ? (
          <div className="border border-craft/30 rounded-lg p-3 mb-3">
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Navn / firma"
                className="input text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={newTrade}
                  onChange={e => setNewTrade(e.target.value)}
                  placeholder="Faggruppe"
                  className="input text-sm flex-1"
                  list="trades-list"
                />
                <datalist id="trades-list">
                  {TRADE_SUGGESTIONS.map(t => <option key={t} value={t} />)}
                </datalist>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="input text-sm flex-1"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addSubcontractor} disabled={!newName.trim()} className="btn-primary flex-1 text-sm py-1.5">
                  Tilføj
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm py-1.5">
                  Annuller
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-craft hover:text-craft-dark border border-dashed border-craft/30 hover:border-craft rounded-lg px-3 py-2 w-full transition-colors mb-4"
          >
            + Tilføj underentreprenør
          </button>
        )}

        {subcontractors.length === 0 && (
          <p className="text-xs text-gray-300 text-center mt-4">
            Ingen underentreprenører tilføjet — du kan stadig generere en plan.
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100">
        <button
          onClick={onGeneratePlan}
          disabled={!canGenerate}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Genererer projektplan…
            </>
          ) : (
            <>Generér projektplan →</>
          )}
        </button>
      </div>
    </div>
  );
}
