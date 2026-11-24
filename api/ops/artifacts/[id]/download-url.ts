import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const artifactId = String(req.query.id ?? '');
  const supabase = getSupabaseAdmin();

  const { data: artifact, error } = await supabase
    .from('ops_artifacts')
    .select('*')
    .eq('id', artifactId)
    .single();

  if (error || !artifact) return res.status(404).json({ error: 'ARTIFACT_NOT_FOUND' });

  const { data: signed, error: signErr } = await supabase.storage
    .from('ops-artifacts')
    .createSignedUrl(artifact.storage_path, 120, { download: artifact.filename });

  if (signErr || !signed) return res.status(500).json({ error: 'SIGN_URL_FAILED', message: signErr?.message });

  return res.status(200).json({ artifact, download_url: signed.signedUrl, expires_in_seconds: 120 });
}
