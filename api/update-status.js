import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
