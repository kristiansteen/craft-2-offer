export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { vat } = req.query;
  if (!vat || !/^\d{8}$/.test(vat)) {
    return res.status(400).json({ error: 'Invalid CVR number' });
  }

  const upstream = await fetch(
    `https://cvrapi.dk/api?vat=${vat}&country=dk`,
    { headers: { 'User-Agent': 'Aison/1.0 (craft-2-offer)' } }
  );

  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
