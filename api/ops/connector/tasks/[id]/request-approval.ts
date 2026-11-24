import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recordAuditAndEvent } from '../../../_lib/auditLogger.js';
import { requireConnector } from '../../../_lib/connectorAuth.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const taskId = String(req.query.id ?? '');
  const { risk_level = 'high', action_type, action_summary, action_payload = {} } = req.body as {
    risk_level?: 'medium' | 'high' | 'critical';
    action_type: string;
    action_summary: string;
    action_payload?: Record<string, unknown>;
  };

  const supabase = getSupabaseAdmin();
  const { data: task } = await supabase.from('ops_tasks').select('*').eq('id', taskId).single();
  if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' });

  const { data: approval, error } = await supabase
    .from('ops_approval_requests')
    .insert({
      workspace_id: task.workspace_id,
      task_id: taskId,
      machine_id: conn.machineId,
      agent_id: task.assigned_agent_id,
      risk_level,
      action_type: action_type ?? 'sensitive_action',
      action_summary: action_summary ?? 'Acción sensible requiere autorización humana',
      action_payload,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !approval) return res.status(400).json({ error: 'DB_ERROR', message: error?.message });

  await supabase
    .from('ops_tasks')
    .update({ status: 'waiting_approval', updated_at: new Date().toISOString() })
    .eq('id', taskId);

  await recordAuditAndEvent({
    actorType: 'connector',
    actorId: conn.machineId,
    action: 'approval.requested',
    resourceType: 'approval',
    resourceId: approval.id,
    workspaceId: task.workspace_id,
    machineId: conn.machineId,
    agentId: task.assigned_agent_id,
    taskId,
    severity: 'warning',
    summary: `Aprobación humana requerida (${risk_level}): ${approval.action_summary}`,
  });

  return res.status(201).json({ approval });
}
