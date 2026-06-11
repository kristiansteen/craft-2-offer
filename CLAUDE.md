# Aison / craft-2-offer — CLAUDE.md

Vercel project: `craft-2-offer` → https://craft-2-offer.vercel.app
GitHub repo: `kristiansteen/craft-2-offer` — auto-deploys from `main`. Never use `vercel --prod` manually.
Stack: React + Tailwind + Vite. Entry: `src/main.jsx`. Build: `npm run dev` / `npm run build`.
Brand name: **Aison** ("fra Vimpl"). Target audience: Danish tradespeople.

---

## Auth

craft-2-offer has its own `LoginPage.jsx` and `RegisterPage.jsx` — users never redirect to the `frontend` project.

Auth flow:
1. User signs in/registers via in-app LoginPage/RegisterPage → receives JWT
2. JWT stored in `localStorage['craft2offer_vimpl_config']`
3. Every API call sends `Authorization: Bearer <jwt>` to `/api/proxy`, `/api/tts`, or `/api/cvr`
4. Proxy validates JWT via `GET ${BACKEND_URL}/api/v1/auth/me`

---

## Serverless Functions (`api/`)

| Function | Purpose |
|---|---|
| `api/proxy.js` | Anthropic API — validates vimpl JWT, forwards to Claude |
| `api/tts.js` | ElevenLabs TTS — validates vimpl JWT, returns audio |
| `api/cvr.js` | CVR lookup — queries Danish CVR register by org number |

---

## Required Vercel Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic key for proxy |
| `ELEVENLABS_API_KEY` | ElevenLabs key for TTS proxy |
| `VIMPL_BACKEND_URL` | Backend URL for JWT validation |

---

## UI Panels (left → right workflow)

1. **Indtal** — Voice/text input; Aison (ElevenLabs TTS + Anthropic) interviews the tradesperson
2. **Efterse** — Review parsed job breakdown: tasks, materials, risks
3. **Tilbud** — Editable offer lines with auto-calculated totals; generates PDF
4. **Koordiner** — Coordination/scheduling (future)
5. **Projektplan** — Project plan export

---

## Key Features

- **Ryd (Clear) button**: available even when Aison is active. Opens amber confirmation bar: "Gem dit input og fortsæt på en anden måde?" with options "Kopier & ryd", "Bare ryd", "Annuller"
- **Material line items**: always visible in Efterse with "+ Tilføj materiale" button
- **Risk contingency line**: approved risks in Efterse generate a "Reservering til uforudsete udgifter" line in Tilbud. Formula: `avg(probability/100 × consequence/100)`, clamped 5–25%, rounded to nearest 100 DKK
- **CVR verification**: users look up company by CVR number; data stored in `localStorage['aison_cvr_verification']` (`name`, `cvr`, `industryCode`, `industryDesc`, `verified`, `dismissed`). Shown in burger menu. Verification indicator uses `/virk vimpl.png` logo with tooltip "Verificeret hos CVR Danmark"
- **PDF with company info**: generated offer PDF includes company name + CVR (if verified), user name, and email from vimpl account

---

## Aison Email Templates

Onboarding emails: `backend/src/email-templates/aison/AisonDay0.html` through `AisonDay7.html`

Color scheme (orange on dark gradient):
- `.aison-header` text: `#fddcb5`
- "fra Vimpl" subtitle: `#f4a261`
- Logo divider: `rgba(230,126,34,0.4)`
- Tagline paragraph: `#fddcb5`
