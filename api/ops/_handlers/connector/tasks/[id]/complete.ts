import type { VercelRequest, VercelResponse } from '../../../../_lib/httpTypes.js';
import { recordAuditAndEvent } from '../../../../_lib/auditLogger.js';
import { requireConnector } from '../../../../_lib/connectorAuth.js';
import { findNewlyUnblockedTasks } from '../../../../_lib/dagEngine.js';
import { getSupabaseAdmin } from '../../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const taskId = String(req.query.id ?? '');
  const { output_summary = '', output_artifact_ids = [] } = req.body as {
    output_summary?: string;
    output_artifact_ids?: string[];
  };

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: task, error } = await supabase
    .from('ops_tasks')
    .update({
      status: 'completed',
      output_summary,
      output_artifact_ids,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .select('*')
    .single();

  if (error || !task) return res.status(404).json({ error: 'TASK_NOT_FOUND' });

  let unblockedIds: string[] = [];
  if (task.workflow_id) {
    const [wfTasksRes, depsRes] = await Promise.all([
      supabase.from('ops_tasks').select('id, status, requires_human_approval').eq('workflow_id', task.workflow_id),
      supabase.from('ops_task_dependencies').select('task_id, depends_on_task_id'),
    ]);

    const wfTasks = wfTasksRes.data ?? [];
    unblockedIds = findNewlyUnblockedTasks({
      tasks: wfTasks,
      dependencies: depsRes.data ?? [],
    });

    for (const nextId of unblockedIds) {
      const nextTask = wfTasks.find((t) => t.id === nextId);
      const nextStatus = nextTask?.requires_human_approval ? 'waiting_approval' : 'queued';
      await supabase
        .from('ops_tasks')
        .update({
          status: nextStatus,
          input_context: { parent_task_id: task.id, parent_summary: output_summary, parent_artifacts: output_artifact_ids },
          updated_at: now,
        })
        .eq('id', nextId);
    }

    const allCompleted = wfTasks.every((t) => t.id === task.id || t.status === 'completed');
    if (allCompleted) {
      await supabase.from('ops_workflows').update({ status: 'completed', updated_at: now }).eq('id', task.workflow_id);
    }
  }

  await recordAuditAndEvent({
    actorType: 'connector',
    actorId: conn.machineId,
    action: 'task.completed',
    resourceType: 'task',
    resourceId: taskId,
    workspaceId: task.workspace_id,
    machineId: conn.machineId,
    agentId: task.assigned_agent_id,
    taskId,
    summary: `Tarea "${task.title}" completada (${unblockedIds.length} descendiente(s) desbloqueadas)`,
  });

  return res.status(200).json({ task, unblocked_task_ids: unblockedIds });
}
