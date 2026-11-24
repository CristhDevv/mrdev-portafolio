import type { VercelRequest, VercelResponse } from '../../../_lib/httpTypes.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const machineId = String(req.query.id ?? '');
  const reason = String((req.body as { reason?: string })?.reason ?? 'Revocación manual desde Ops Center');

  const supabase = getSupabaseAdmin();

  await Promise.all([
    supabase.from('ops_machines').update({ status: 'revoked', last_error: reason }).eq('id', machineId),
    supabase
      .from('ops_machine_credentials')
      .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq('machine_id', machineId)
      .eq('is_active', true),
    supabase.from('ops_agents').update({ status: 'revoked', is_enabled: false }).eq('machine_id', machineId),
  ]);

  await recordAuditAndEvent({
    actorType: 'admin',
    actorId: admin.email,
    action: 'machine.revoked',
    resourceType: 'machine',
    resourceId: machineId,
    machineId,
    severity: 'critical',
    summary: `Kill Switch activado: máquina revocada (${reason})`,
    details: { reason },
  });

  return res.status(200).json({ ok: true, machine_id: machineId, status: 'revoked' });
}
