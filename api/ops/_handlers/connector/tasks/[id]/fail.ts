import type { VercelRequest, VercelResponse } from '../../../../_lib/httpTypes.js';
import { recordAuditAndEvent } from '../../../../_lib/auditLogger.js';
import { requireConnector } from '../../../../_lib/connectorAuth.js';
import { getSupabaseAdmin } from '../../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const taskId = String(req.query.id ?? '');
  const { error_message = 'Execution failed' } = req.body as { error_message?: string };

  const supabase = getSupabaseAdmin();
  const { data: task } = await supabase.from('ops_tasks').select('*').eq('id', taskId).single();
  if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' });

  const canRetry = task.retry_count < task.max_retries;
  const nextStatus = canRetry ? 'queued' : 'failed';

  const { data: updated } = await supabase
    .from('ops_tasks')
    .update({
      status: nextStatus,
      retry_count: task.retry_count + 1,
      error_message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*')
    .single();

  await recordAuditAndEvent({
    actorType: 'connector',
    actorId: conn.machineId,
    action: canRetry ? 'task.retrying' : 'task.failed',
    resourceType: 'task',
    resourceId: taskId,
    workspaceId: task.workspace_id,
    machineId: conn.machineId,
    agentId: task.assigned_agent_id,
    taskId,
    severity: canRetry ? 'warning' : 'error',
    summary: `Tarea "${task.title}" falló: ${error_message} (${canRetry ? 'reencolada' : 'agotó reintentos'})`,
  });

  return res.status(200).json({ task: updated });
}
