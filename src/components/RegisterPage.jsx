import { useState } from 'react';
import { BACKEND_URL } from '../lib/api.js';

export default function RegisterPage({ onLogin, onSwitchToLogin }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function passwordStrength(pw) {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw))   score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 2) return { label: 'Svag', color: 'text-red-500' };
    if (score <= 3) return { label: 'Medium', color: 'text-amber-500' };
    return { label: 'Stærk', color: 'text-green-600' };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Adgangskoden skal være mindst 8 tegn.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name, signupSource: 'craft2offer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registrering fejlede');
      onLogin(data.accessToken);
    } catch (err) {
      setError(err.message || 'Noget gik galt. Prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    const state = btoa(JSON.stringify({ origin: window.location.origin, source: 'craft2offer' }));
    window.location.href = `${BACKEND_URL}/api/v1/auth/google?state=${state}`;
  }

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Mobile compact header ── */}
      <div
        className="lg:hidden flex items-center justify-center py-6 px-6 text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #1c1917 0%, #431407 100%)' }}
      >
        <div style={{ fontFamily: "'Birthstone', cursive", fontSize: '3rem', lineHeight: 1, background: 'linear-gradient(135deg, #E67E22 0%, #F5A553 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Aison
        </div>
      </div>

      {/* ── Left hero — desktop only ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #1c1917 0%, #431407 100%)' }}
      >
        <div className="max-w-sm text-center">
          <div className="mb-6" style={{ fontFamily: "'Birthstone', cursive", fontSize: '6rem', lineHeight: 1, background: 'linear-gradient(135deg, #E67E22 0%, #F5A553 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Aison
          </div>
          <div className="text-sm text-white/60 mb-8">fra Vimpl</div>
          <h2 className="text-2xl font-bold mb-4 leading-snug">Kom i gang gratis</h2>
          <p className="text-white/70 leading-relaxed">
            Opret din konto og begynd at spare tid på tilbud og projektplaner — fra dag ét.
          </p>
          <div className="mt-10 space-y-3 text-left text-sm text-white/70">
            {['7 dages gratis prøveperiode', 'Ingen kreditkort påkrævet', 'Tilbud på under 5 minutter'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#E67E22' }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Opret konto</h1>
          <p className="text-slate-500 text-sm mb-8">Kom i gang med Aison i dag.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Navn</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dit navn"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-craft focus:ring-2 focus:ring-craft/20 transition bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="din@email.dk"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-craft focus:ring-2 focus:ring-craft/20 transition bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mindst 8 tegn"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-craft focus:ring-2 focus:ring-craft/20 transition bg-white"
              />
              {strength && (
                <p className={`mt-1 text-xs font-medium ${strength.color}`}>{strength.label} adgangskode</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60"
              style={{ background: loading ? '#CA6F1E' : '#E67E22' }}
            >
              {loading ? 'Opretter konto…' : 'Opret konto'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">eller</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Fortsæt med Google
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Ved at oprette en konto accepterer du vores{' '}
            <a href="https://app.vimpl.com/terms.html" target="_blank" rel="noreferrer" className="underline">vilkår</a>
            {' '}og{' '}
            <a href="https://app.vimpl.com/privacy.html" target="_blank" rel="noreferrer" className="underline">privatlivspolitik</a>.
          </p>

          <p className="mt-4 text-center text-sm text-slate-500">
            Har du allerede en konto?{' '}
            <button onClick={onSwitchToLogin} className="font-semibold" style={{ color: '#E67E22' }}>
              Log ind
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
