export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, lang, answers } = req.body || {};
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const r = await fetch(process.env.SUPABASE_URL + '/rest/v1/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ brand, lang: lang || 'ar', status: 'new', answers: answers || {} })
  });

  if (!r.ok) {
    const detail = await r.text();
    return res.status(500).json({ error: 'DB error', detail });
  }

  return res.status(200).json({ ok: true });
}
