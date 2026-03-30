import { useState, useRef } from 'react';

const PLACEHOLDER = `Beskriv jobbet med dine egne ord — eller indsæt en kundebeskrivelse.

Eksempel:
"Skal renovere badeværelse på 6 m2. Fjerne gamle fliser, ny vandrør, ny blandingsbatteri, lægge nye gulvfliser 60x60 og vægfliser til loft. Nyt toilet og håndvask. Maling af loft."`;

async function pasteFromClipboard() {
  try { return await navigator.clipboard.readText(); } catch { return null; }
}

export default function Panel1Indtal({ input, setInput, onAnalyze, loading, error, canAnalyze }) {
  const [pasteFlash, setPasteFlash] = useState(false);
  const textareaRef = useRef(null);

  async function handlePaste() {
    const text = await pasteFromClipboard();
    if (text?.trim()) {
      setInput(prev => prev ? prev + '\n\n' + text.trim() : text.trim());
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 1500);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 shrink-0">
        <button
          onClick={handlePaste}
          className={[
            'btn-sm border transition-colors text-xs',
            pasteFlash
              ? 'bg-green-50 border-green-300 text-green-600'
              : 'border-gray-200 text-gray-500 hover:border-craft hover:text-craft',
          ].join(' ')}
        >
          {pasteFlash ? '✓ Indsat' : '⌘ Indsæt'}
        </button>
        {input && (
          <button
            onClick={() => setInput('')}
            className="btn-sm border border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200 text-xs"
          >
            Ryd
          </button>
        )}
        <span className="ml-auto text-xs text-gray-300">{input.length} tegn</span>
      </div>

      {/* Textarea */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-3 gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 resize-none text-sm text-gray-700 placeholder-gray-300 outline-none leading-relaxed"
          style={{ minHeight: 0 }}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs shrink-0">
            {error}
          </div>
        )}

        <div className="shrink-0 pb-2">
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyserer…
              </>
            ) : (
              <>Analysér job →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
