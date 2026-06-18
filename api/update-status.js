export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });

  const r = await fetch(
    process.env.SUPABASE_URL + '/rest/v1/submissions?id=eq.' + encodeURIComponent(id),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status })
    }
  );

  if (!r.ok) {
    const detail = await r.text();
    return res.status(500).json({ error: 'DB error', detail });
  }

  return res.status(200).json({ ok: true });
}
