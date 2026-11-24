import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const agentId = String(req.query.id ?? '');
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of ['name', 'specialty', 'description', 'is_enabled', 'status', 'capabilities', 'tools']) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('ops_agents').update(updates).eq('id', agentId).select('*').single();

  if (error || !data) return res.status(400).json({ error: 'UPDATE_AGENT_FAILED', message: error?.message });

  await recordAuditAndEvent({
    actorType: 'admin',
    actorId: admin.email,
    action: 'agent.updated',
    resourceType: 'agent',
    resourceId: agentId,
    machineId: data.machine_id,
    agentId,
    summary: `Agente "${data.name}" actualizado (enabled=${data.is_enabled}, status=${data.status})`,
  });

  return res.status(200).json({ agent: data });
}
