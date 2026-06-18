import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase
    .from('submissions')
    .select('id, created_at, brand, lang, status, answers')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
