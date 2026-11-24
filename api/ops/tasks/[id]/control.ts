import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const taskId = String(req.query.id ?? '');
  const { action } = req.body as { action: 'pause' | 'resume' | 'cancel' | 'retry' };

  const statusMap = {
    pause: 'paused',
    resume: 'queued',
    cancel: 'cancelled',
    retry: 'queued',
  } as const;

  const nextStatus = statusMap[action];
  if (!nextStatus) return res.status(400).json({ error: 'INVALID_ACTION' });

  const supabase = getSupabaseAdmin();
  const { data: task, error } = await supabase
    .from('ops_tasks')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select('*')
    .single();

  if (error || !task) return res.status(404).json({ error: 'TASK_NOT_FOUND' });

  await recordAuditAndEvent({
    actorType: 'admin',
    actorId: admin.email,
    action: `task.${action}`,
    resourceType: 'task',
    resourceId: taskId,
    workspaceId: task.workspace_id,
    agentId: task.assigned_agent_id,
    taskId,
    summary: `Tarea "${task.title}" → ${nextStatus} por control humano`,
  });

  return res.status(200).json({ task });
}
