import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, lang, answers } = req.body || {};
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase
    .from('submissions')
    .insert({ brand, lang: lang || 'ar', status: 'new', answers: answers || {} });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
