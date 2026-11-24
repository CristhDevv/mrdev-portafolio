import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../../../../_lib/httpTypes.js';
import { recordAuditAndEvent } from '../../../../_lib/auditLogger.js';
import { requireConnector } from '../../../../_lib/connectorAuth.js';
import { getSupabaseAdmin } from '../../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const taskId = String(req.query.id ?? '');
  const idempotencyKey = String((req.body as { idempotency_key?: string })?.idempotency_key ?? crypto.randomUUID());

  const supabase = getSupabaseAdmin();

  const { data: agents } = await supabase
    .from('ops_agents')
    .select('id')
    .eq('machine_id', conn.machineId)
    .eq('is_enabled', true);

  const agentIds = (agents ?? []).map((a) => a.id);
  if (agentIds.length === 0) return res.status(403).json({ error: 'NO_ACTIVE_AGENTS' });

  // Atomic claim: only succeeds if status is still 'queued' and assigned to this machine's agent
  const { data: claimedTask, error } = await supabase
    .from('ops_tasks')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'queued')
    .in('assigned_agent_id', agentIds)
    .select('*')
    .single();

  if (error || !claimedTask) {
    return res.status(409).json({ error: 'TASK_ALREADY_CLAIMED_OR_NOT_QUEUED' });
  }

  await supabase.from('ops_task_runs').insert({
    task_id: claimedTask.id,
    machine_id: conn.machineId,
    agent_id: claimedTask.assigned_agent_id,
    attempt_number: claimedTask.retry_count + 1,
    status: 'running',
    idempotency_key: idempotencyKey,
  });

  await recordAuditAndEvent({
    actorType: 'connector',
    actorId: conn.machineId,
    action: 'task.claimed',
    resourceType: 'task',
    resourceId: claimedTask.id,
    workspaceId: claimedTask.workspace_id,
    machineId: conn.machineId,
    agentId: claimedTask.assigned_agent_id,
    taskId: claimedTask.id,
    summary: `Tarea "${claimedTask.title}" reclamada y en ejecución`,
  });

  return res.status(200).json({ task: claimedTask });
}
