import { useState, useRef, useEffect } from 'react';

const PLACEHOLDER = `Beskriv jobbet med dine egne ord — eller indsæt en kundebeskrivelse.

Eksempel:
"Skal renovere badeværelse på 6 m2. Fjerne gamle fliser, ny vandrør, ny blandingsbatteri, lægge nye gulvfliser 60x60 og vægfliser til loft. Nyt toilet og håndvask."`;

async function pasteFromClipboard() {
  try { return await navigator.clipboard.readText(); } catch { return null; }
}

export default function Panel1Indtal({
  input, setInput,
  onAnalyze, loading, error, canAnalyze,
  aison, isRecording, interimText, recorderSupported, onRecord,
}) {
  const [pasteFlash, setPasteFlash] = useState(false);
  const [confirmRyd, setConfirmRyd] = useState(false);
  const textareaRef = useRef(null);

  const aisonActive  = aison?.enabled;
  const aisonBusy    = aison?.thinking || aison?.speaking;
  const aisonTurns   = aison?.turns || [];
  const currentDraft  = aisonActive ? input.slice(aison?.prevTranscriptLength || 0) : '';

  // WebRTC handles the full conversation loop — no manual record/submit effects needed

  // Parse "Interviewer: / SME:" transcript into turns
  function parseTranscriptTurns(text) {
    if (!text) return null;
    const blocks = text.split(/\n{2,}/);
    const turns = blocks.map(block => {
      const b = block.trim();
      if (/^Aison:/i.test(b)) return { type: 'aison', text: b.replace(/^Aison:\s*/i, '') };
      if (/^SME:/i.test(b)) return { type: 'user', text: b.replace(/^SME:\s*/i, '') };
      return null;
    }).filter(Boolean);
    return turns.length >= 2 ? turns : null;
  }

  const displayTurns = aisonTurns.length > 0 ? aisonTurns : parseTranscriptTurns(input);
  const isStructured = !!displayTurns;

  // Scroll conversation to bottom
  useEffect(() => {
    const el = document.getElementById('craft-aison-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayTurns?.length, currentDraft, aisonBusy]);

  async function handlePaste() {
    const text = await pasteFromClipboard();
    if (text?.trim()) {
      setInput(prev => prev ? prev + '\n\n' + text.trim() : text.trim());
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 1500);
    }
  }

  function handleAisonToggle() {
    if (aisonActive && isRecording) onRecord?.(); // stop recording first
    aison?.toggle();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-center gap-2 shrink-0">

        {/* Paste — only when Aison is off */}
        {!aisonActive && (
          <button
            onClick={handlePaste}
            className={[
              'flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md border transition-all',
              pasteFlash
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800',
            ].join(' ')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="2" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {pasteFlash ? 'Indsat!' : 'Indsæt'}
          </button>
        )}

        {/* Record / Stop — only when Aison is off */}
        {!aisonActive && recorderSupported && (
          <button
            onClick={onRecord}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-md border transition-all',
              isRecording
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50',
            ].join(' ')}
          >
            <span className={['w-2 h-2 shrink-0', isRecording ? 'rounded-sm bg-white' : 'rounded-full bg-red-500'].join(' ')} />
            {isRecording ? 'Stop' : 'Optag'}
          </button>
        )}

        {/* Aison end button — when active */}
        {aisonActive && (
          <button
            onClick={handleAisonToggle}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md border bg-purple-600 text-white border-purple-600 hover:bg-purple-700 transition-all"
          >
            Afslut
          </button>
        )}

        {/* Aison toggle — when not active */}
        {aison && !aisonActive && (
          <button
            onClick={handleAisonToggle}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md border text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-600 transition-all"
          >
            <svg width="13" height="11" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0"   y="4"   width="2" height="3"  rx="1" fill="currentColor" opacity="0.6"/>
              <rect x="2.5" y="2"   width="2" height="7"  rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="5"   y="0"   width="2" height="11" rx="1" fill="currentColor"/>
              <rect x="7.5" y="2"   width="2" height="7"  rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="10"  y="4"   width="2" height="3"  rx="1" fill="currentColor" opacity="0.6"/>
            </svg>
            Aison
          </button>
        )}

        {/* Ryd — always visible, dimmed when empty */}
        <button
          onClick={() => { if (input || aisonActive) { setConfirmRyd(true); } }}
          disabled={!input && !aisonActive}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md border transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-400 hover:bg-red-50"
        >
          Ryd
        </button>
      </div>

      {/* Ryd confirmation bar */}
      {confirmRyd && (
        <div className="shrink-0 px-3 py-2 bg-amber-50 border-b border-amber-200 flex flex-col gap-2">
          <p className="text-xs text-amber-800 font-medium">Gem dit input og fortsæt på en anden måde?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(input); } catch {}
                setInput('');
                if (aisonActive) { aison?.reset(); handleAisonToggle(); }
                setConfirmRyd(false);
              }}
              className="flex-1 text-xs font-medium py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
            >
              Kopier & ryd
            </button>
            <button
              onClick={() => { setInput(''); if (aisonActive) { aison?.reset(); handleAisonToggle(); } setConfirmRyd(false); }}
              className="flex-1 text-xs font-medium py-1 rounded-md bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Bare ryd
            </button>
            <button
              onClick={() => setConfirmRyd(false)}
              className="flex-1 text-xs font-medium py-1 rounded-md bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden">

          {/* Structured conversation view */}
          {isStructured ? (
            <div className="absolute inset-0 overflow-y-auto p-3 space-y-3 bg-white" id="craft-aison-scroll">
              {displayTurns.map((turn, i) => (
                <div key={i} className={`flex gap-2 ${turn.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[9px] font-bold ${turn.type === 'aison' ? 'bg-purple-600' : 'bg-gray-400'}`}>
                    {turn.type === 'aison' ? 'A' : 'D'}
                  </div>
                  <div className={`flex-1 min-w-0 text-xs rounded-xl px-3 py-2 leading-relaxed ${turn.type === 'aison' ? 'bg-purple-50 text-purple-900' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-50 mb-0.5">
                      {turn.type === 'aison' ? 'Aison' : 'Dig'}
                    </span>
                    {turn.text}
                  </div>
                </div>
              ))}

              {aisonActive && (currentDraft.trim() || (isRecording && interimText)) && (
                <div className="flex gap-2 flex-row-reverse">
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center shrink-0 text-white text-[9px] font-bold">D</div>
                  <div className="flex-1 min-w-0 text-xs rounded-xl px-3 py-2 leading-relaxed bg-gray-100 text-gray-700 opacity-60 italic">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-50 mb-0.5 not-italic">Dig</span>
                    {currentDraft.trim() || ''}
                    {isRecording && interimText && <span className="text-gray-400"> {interimText}</span>}
                  </div>
                </div>
              )}

              {/* WebRTC live status */}
              {aisonActive && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 text-white text-[9px] font-bold">A</div>
                  <div className="flex-1 min-w-0 text-xs rounded-xl px-3 py-2 bg-purple-50 text-purple-600">
                    {aison.thinking ? (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin shrink-0" />
                        forbinder…
                      </span>
                    ) : aison.speaking ? (
                      <span className="flex items-center gap-1.5">
                        <span className="flex items-end gap-0.5 h-3 shrink-0">
                          {[0,1,2,3].map(i => (
                            <span key={i} className="w-0.5 bg-purple-500 rounded-full animate-bounce"
                              style={{ height: `${[8,12,10,7][i]}px`, animationDelay: `${i * 0.12}s` }} />
                          ))}
                        </span>
                        taler…
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
                        lytter…
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={input + (isRecording && interimText ? ' ' + interimText : '')}
                onChange={e => { if (!isRecording) setInput(e.target.value); }}
                readOnly={isRecording}
                placeholder={PLACEHOLDER}
                className={[
                  'absolute inset-0 w-full h-full p-3 text-sm text-gray-700 resize-none focus:outline-none',
                  isRecording ? 'bg-red-50/30 cursor-default' : 'bg-white',
                ].join(' ')}
              />
              {isRecording && interimText && (
                <div className="absolute bottom-2 left-3 right-3 pointer-events-none">
                  <span className="text-xs text-gray-400 italic">Hører: {interimText}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Aison status bar */}
        {aisonActive && !isStructured && (
          <div className="shrink-0 border-t border-purple-100 bg-purple-50/60 px-3 py-2">
            {aison.thinking && (
              <div className="flex items-center gap-2 text-xs text-purple-600">
                <span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin shrink-0" />
                Forbinder…
              </div>
            )}
            {aison.speaking && !aison.thinking && (
              <div className="flex items-center gap-2 text-xs text-purple-600">
                <span className="flex items-end gap-0.5 h-3.5 shrink-0">
                  {[0,1,2,3].map(i => (
                    <span key={i} className="w-0.5 bg-purple-500 rounded-full animate-bounce"
                      style={{ height: `${[8,12,10,7][i]}px`, animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
                Aison taler…
              </div>
            )}
            {!aison.thinking && !aison.speaking && (
              <div className="flex items-center gap-2 text-xs text-purple-600">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
                Aison lytter — tal nu
              </div>
            )}
            {aison.error && (
              <p className="text-[10px] text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1 mt-1">{aison.error}</p>
            )}
          </div>
        )}

        {error && (
          <div className="shrink-0 mx-3 mb-2 bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100">
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
