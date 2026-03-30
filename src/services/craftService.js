// ── Proxy call helper ─────────────────────────────────────────────────────────
const PROXY_URL = '/api/proxy';

async function callClaude({ system, messages, maxTokens = 2000 }, proxyAuth) {
  const headers = { 'Content-Type': 'application/json' };
  if (proxyAuth?.token) headers['Authorization'] = `Bearer ${proxyAuth.token}`;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API fejl: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function parseJson(text) {
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── analyzeJob ────────────────────────────────────────────────────────────────
// Input: free-form job description (Danish or English)
// Returns: { title, scope, trades[], measurements[], materials[], risks[] }
export async function analyzeJob(input, proxyAuth) {
  const system = `Du er ekspert i bygge- og håndværksbranchen. Analyser følgende jobbeskrivelse og returner struktureret JSON.
Returner KUN gyldigt JSON — ingen forklaring, ingen markdown, ingen preamble.

JSON-skema:
{
  "title": "kort jobtitel",
  "scope": "samlet beskrivelse af omfang (2-4 sætninger)",
  "trades": [
    { "id": "t1", "name": "faggruppe", "description": "hvad skal laves" }
  ],
  "measurements": [
    { "id": "m1", "item": "hvad måles", "value": "mål med enhed", "note": "evt. bemærkning" }
  ],
  "materials": [
    { "id": "mat1", "name": "materialenavn", "quantity": "antal + enhed", "trade": "faggruppe-id" }
  ],
  "risks": [
    { "id": "r1", "description": "risikobeskrivelse", "mitigation": "afhjælpning" }
  ]
}

Regler:
- Identificér alle faggrupper der er nødvendige (murer, elektriker, VVS, tømrer, maler osv.)
- Estimer materialer baseret på mål og scope
- Risici: inkludér kun reelle byggerisici
- Svar på dansk`;

  const text = await callClaude({
    system,
    messages: [{ role: 'user', content: input }],
    maxTokens: 3000,
  }, proxyAuth);

  return parseJson(text);
}

// ── generateOffer ─────────────────────────────────────────────────────────────
// Input: jobBreakdown from analyzeJob
// Returns: offerLines[] — each line has { id, description, trade, qty, unit, unitPrice, total }
export async function generateOffer(jobBreakdown, proxyAuth) {
  const system = `Du er en erfaren byggehåndværker der laver tilbud. Baseret på jobanalysen skal du generere tilbudslinjer med priser.
Returner KUN gyldigt JSON — ingen forklaring, ingen markdown, ingen preamble.

JSON-skema:
{
  "lines": [
    {
      "id": "line1",
      "trade": "faggruppe",
      "description": "hvad udføres",
      "qty": 10,
      "unit": "m2",
      "unitPrice": 450,
      "total": 4500
    }
  ],
  "subtotal": 0,
  "vatRate": 0.25,
  "vat": 0,
  "grandTotal": 0,
  "currency": "DKK",
  "validDays": 30,
  "notes": "eventuelle forbehold"
}

Regler:
- Brug realistiske danske markedspriser (DKK inkl. arbejdsløn)
- Subtotal = sum af alle linjer
- Moms = subtotal × vatRate
- grandTotal = subtotal + moms
- Enhed: stk, m, m2, m3, time, LS (samlet)
- Svar på dansk`;

  const text = await callClaude({
    system,
    messages: [{ role: 'user', content: JSON.stringify(jobBreakdown, null, 2) }],
    maxTokens: 3000,
  }, proxyAuth);

  return parseJson(text);
}

// ── fetchMaterialPrice ────────────────────────────────────────────────────────
// Fetches a price estimate for a single material using Claude web search
export async function fetchMaterialPrice(materialName, quantity, proxyAuth) {
  const system = `Du er en indkøber i byggebranchen. Find den aktuelle markedspris for følgende materiale i Danmark.
Returner KUN gyldigt JSON:
{ "name": "materialenavn", "unitPrice": 0, "unit": "enhed", "source": "kilde eller estimat", "confidence": "high|medium|low" }`;

  const text = await callClaude({
    system,
    messages: [{ role: 'user', content: `Materiale: ${materialName}, Antal: ${quantity}` }],
    maxTokens: 500,
  }, proxyAuth);

  return parseJson(text);
}

// ── generateProjectPlan ───────────────────────────────────────────────────────
// Input: jobBreakdown, offerLines, subcontractors[]
// Returns: { name, overview, tracks[], tasks[], risks[], invitees[] }
export async function generateProjectPlan(jobBreakdown, offerLines, subcontractors, proxyAuth) {
  const system = `Du er en erfaren projektleder i byggebranchen. Lav en detaljeret projektplan baseret på jobanalysen og tilbuddet.
Returner KUN gyldigt JSON — ingen forklaring, ingen markdown.

JSON-skema:
{
  "name": "projektnavn",
  "overview": "kort projektbeskrivelse",
  "tracks": [
    { "id": "track1", "name": "fase/sporname", "color": "#E67E22" }
  ],
  "tasks": [
    {
      "id": "task1",
      "name": "opgavenavn",
      "trackId": "track1",
      "assignee": "faggruppe eller navn",
      "startWeek": 1,
      "durationDays": 3,
      "dependencies": [],
      "notes": ""
    }
  ],
  "risks": [
    { "id": "risk1", "description": "risiko", "impact": "high|medium|low", "mitigation": "afhjælpning" }
  ],
  "invitees": []
}

Regler:
- Organiser opgaver i logiske faser (forberedelse, fundament, råbyg, installationer, færdigbehandling osv.)
- Brug realistiske tidsskøn for danske håndværkere
- Invitees: tilføj underentreprenører fra listen hvis givet
- Svar på dansk`;

  const payload = {
    jobBreakdown,
    offerLines: offerLines?.lines || [],
    subcontractors: subcontractors || [],
  };

  const text = await callClaude({
    system,
    messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    maxTokens: 4000,
  }, proxyAuth);

  return parseJson(text);
}
