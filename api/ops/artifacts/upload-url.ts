import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth.js';
import { artifactUploadSchema } from '../_lib/schemas.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const BLOCKED_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.msi', '.dll', '.scr', '.vbs', '.com']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const parsed = artifactUploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dotIdx = safeName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? safeName.slice(dotIdx).toLowerCase() : '';
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'BLOCKED_FILE_TYPE', message: `Extension ${ext} is not permitted` });
  }

  const artifactId = crypto.randomUUID();
  const storagePath = `${parsed.data.workspace_id}/${artifactId}/${safeName}`;
  const supabase = getSupabaseAdmin();

  const { data: signed, error: signErr } = await supabase.storage
    .from('ops-artifacts')
    .createSignedUploadUrl(storagePath);

  if (signErr || !signed) {
    return res.status(500).json({ error: 'STORAGE_SIGN_FAILED', message: signErr?.message });
  }

  const { data: artifact, error: dbErr } = await supabase
    .from('ops_artifacts')
    .insert({
      id: artifactId,
      workspace_id: parsed.data.workspace_id,
      task_id: parsed.data.task_id ?? null,
      author_type: 'human',
      filename: safeName,
      mime_type: parsed.data.mime_type,
      size_bytes: parsed.data.size_bytes,
      sha256: parsed.data.sha256,
      storage_path: storagePath,
      origin_kind: parsed.data.origin_kind,
    })
    .select('*')
    .single();

  if (dbErr) return res.status(500).json({ error: 'DB_ERROR', message: dbErr.message });

  return res.status(201).json({ artifact, upload_url: signed.signedUrl, token: signed.token });
}
