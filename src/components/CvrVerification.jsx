import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../lib/api.js';

// ── Allowed Danish industry codes (branchekoder) ─────────────────────────────
// Keys are stored without dots to match the CVR API format (e.g. 412000)
const ALLOWED_BRANCH_CODES = {
  // Bygge- og anlægsvirksomhed
  '411000': 'Gennemførelse af byggeprojekter',
  '412000': 'Opførelse af bygninger',
  '421100': 'Anlæg af veje og gader',
  '422200': 'Ledningsnet til el og VVS',
  '429900': 'Anden anlægsvirksomhed',
  '431100': 'Nedrivning',
  '432100': 'El-installatører',
  '432200': 'VVS- og blikkenslagere',
  '432900': 'Andre bygningsinstallatører',
  '433100': 'Pudsning',
  '433200': 'Tømrer- og bygningssnedkerforretninger',
  '433300': 'Gulvbelægning og vægbeklædning',
  '433400': 'Malerforretninger',
  '433900': 'Anden færdiggørelse af bygninger',
  '439100': 'Tagdækningsvirksomhed',
  '439900': 'Anden specialiseret byggefaglig virksomhed',
};

const STORAGE_KEY = 'aison_cvr_verification';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function CvrVerification({ onVerified, token }) {
  const [expanded, setExpanded] = useState(false);
  const [cvr, setCvr] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | verified | dismissed | rejected | error
  const [result, setResult] = useState(null);   // { name, cvr, industryCode, industryDesc }
  const [errorMsg, setErrorMsg] = useState('');

  // Load persisted verification on mount
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setResult(saved);
      if (saved.verified && saved.dismissed) {
        setStatus('dismissed');
      } else {
        setStatus(saved.verified ? 'verified' : 'rejected');
      }
      setExpanded(false);
    }
  }, []);

  async function verify() {
    const cleaned = cvr.replace(/\s/g, '');
    if (!/^\d{8}$/.test(cleaned)) {
      setErrorMsg('CVR-nummeret skal være 8 cifre.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/cvr?vat=${cleaned}`);

      if (!res.ok) {
        setStatus('error');
        setErrorMsg('Kunne ikke finde CVR-nummer. Prøv igen.');
        return;
      }

      const data = await res.json();

      if (data.error) {
        setStatus('error');
        setErrorMsg('CVR-nummer ikke fundet i CVR-registret.');
        return;
      }

      const industryCode = String(data.industrycode ?? '').replace(/\./g, '');
      const isAllowed = industryCode in ALLOWED_BRANCH_CODES;

      const record = {
        name: data.name,
        cvr: cleaned,
        industryCode,
        industryDesc: data.industrydesc ?? '',
        verified: isAllowed,
      };

      save(record);
      setResult(record);
      setStatus(isAllowed ? 'verified' : 'rejected');

      if (isAllowed && token) {
        fetch(`${BACKEND_URL}/api/v1/auth/cvr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cvrNumber: record.cvr, cvrCompanyName: record.name, cvrIndustryCode: record.industryCode }),
        }).catch(() => {}); // fire-and-forget
      }
    } catch {
      setStatus('error');
      setErrorMsg('Netværksfejl. Tjek din forbindelse og prøv igen.');
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setResult(null);
    setStatus('idle');
    setCvr('');
    setErrorMsg('');
    setExpanded(true);
  }

  // ── Dismissed — minimal row with Skift option ──────────────────────────────
  if (status === 'dismissed' && result) {
    return (
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2 text-green-600">
          <img src="/virk vimpl.png" alt="CVR verificeret" title="Verificeret hos CVR Danmark" className="h-4 w-auto flex-shrink-0" />
          <span className="text-[11px] font-medium truncate max-w-[150px]">{result.name}</span>
        </div>
        <button onClick={reset} className="text-[10px] text-gray-400 hover:text-gray-600 underline flex-shrink-0">Skift</button>
      </div>
    );
  }

  // ── Verified badge — shown until user clicks OK ─────────────────────────────
  if (status === 'verified' && result) {
    function dismiss() {
      const updated = { ...result, dismissed: true };
      save(updated);
      setStatus('dismissed');
      onVerified?.();
    }
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-base">✓</span>
            <div>
              <p className="text-xs font-semibold text-green-700">Verificeret virksomhed</p>
              <p className="text-[11px] text-green-600 truncate max-w-[140px]">{result.name}</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-[11px] font-semibold text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
        <p className="text-[10px] text-green-500 mt-1">CVR {result.cvr} · {result.industryDesc || result.industryCode}</p>
      </div>
    );
  }

  // ── Rejected badge ──────────────────────────────────────────────────────────
  if (status === 'rejected' && result) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-base">✕</span>
            <div>
              <p className="text-xs font-semibold text-red-600">Ikke berettiget branche</p>
              <p className="text-[11px] text-red-400 truncate max-w-[140px]">{result.name}</p>
            </div>
          </div>
          <button onClick={reset} className="text-[10px] text-red-400 hover:text-red-600 underline">Prøv igen</button>
        </div>
        <p className="text-[10px] text-red-400 mt-1">Branchekode {result.industryCode} er ikke på listen</p>
      </div>
    );
  }

  // ── Collapsed entry point ───────────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-100 transition-colors text-left"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Verificér virksomhed (CVR)
      </button>
    );
  }

  // ── Input form ──────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">CVR-verificering</p>
        <button onClick={() => setExpanded(false)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
      </div>
      <p className="text-[11px] text-gray-400 leading-tight">
        Indtast dit 8-cifrede CVR-nummer for at bekræfte, at din virksomhed er inden for de godkendte brancher.
      </p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={8}
        placeholder="12345678"
        value={cvr}
        onChange={e => { setCvr(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
        onKeyDown={e => e.key === 'Enter' && verify()}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-craft focus:ring-1 focus:ring-craft transition-colors tracking-widest font-mono"
      />
      {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}
      <button
        onClick={verify}
        disabled={status === 'loading' || cvr.length !== 8}
        className="w-full py-2 rounded-lg bg-craft text-white text-sm font-semibold hover:bg-craft-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Slår op…' : 'Verificér'}
      </button>
    </div>
  );
}
