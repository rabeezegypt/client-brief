export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const r = await fetch(
    process.env.SUPABASE_URL + '/rest/v1/submissions?select=id,created_at,brand,lang,status,answers&order=created_at.desc',
    {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_KEY
      }
    }
  );

  if (!r.ok) {
    const detail = await r.text();
    return res.status(500).json({ error: 'DB error', detail });
  }

  return res.status(200).json(await r.json());
}
