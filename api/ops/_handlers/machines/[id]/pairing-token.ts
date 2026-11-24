import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../../../_lib/httpTypes.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const machineId = String(req.query.id ?? '');
  if (!machineId) return res.status(400).json({ error: 'MISSING_MACHINE_ID' });

  const supabase = getSupabaseAdmin();
  const rawOtp = `mrpair_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error } = await supabase.from('ops_pairing_tokens').insert({
    machine_id: machineId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  await recordAuditAndEvent({
    actorType: 'admin',
    actorId: admin.email,
    action: 'machine.pairing_token_rotated',
    resourceType: 'machine',
    resourceId: machineId,
    machineId,
    summary: 'Nuevo token de emparejamiento de un solo uso generado (10 min)',
  });

  return res.status(201).json({
    otp_token: rawOtp,
    expires_at: expiresAt,
    cli_command: `npx mrdev-connector pair --server https://mrdev.lat --token ${rawOtp}`,
  });
}
