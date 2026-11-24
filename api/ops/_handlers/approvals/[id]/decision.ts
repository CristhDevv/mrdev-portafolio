import type { VercelRequest, VercelResponse } from '../../../_lib/httpTypes.js';
import { requireAdmin } from '../../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const approvalId = String(req.query.id ?? '');
  const { decision, note } = req.body as { decision: 'approved' | 'rejected'; note?: string };
  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ error: 'INVALID_DECISION' });
  }

  const supabase = getSupabaseAdmin();
  const { data: approval, error } = await supabase
    .from('ops_approval_requests')
    .update({
      status: decision,
      decision_note: note ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !approval) {
    return res.status(404).json({ error: 'APPROVAL_NOT_FOUND_OR_DECIDED' });
  }

  const nextTaskStatus = decision === 'approved' ? 'queued' : 'cancelled';
  await supabase
    .from('ops_tasks')
    .update({ status: nextTaskStatus, updated_at: new Date().toISOString() })
    .eq('id', approval.task_id);

  await recordAuditAndEvent({
    actorType: 'admin',
    actorId: admin.email,
    action: `approval.${decision}`,
    resourceType: 'approval',
    resourceId: approvalId,
    workspaceId: approval.workspace_id,
    machineId: approval.machine_id,
    agentId: approval.agent_id,
    taskId: approval.task_id,
    severity: decision === 'rejected' ? 'warning' : 'info',
    summary: `Solicitud de aprobación (${approval.risk_level}) ${decision === 'approved' ? 'aprobada' : 'rechazada'}`,
    details: { note },
  });

  return res.status(200).json({ approval, next_task_status: nextTaskStatus });
}
