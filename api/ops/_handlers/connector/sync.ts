import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireConnector } from '../../_lib/connectorAuth.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res, '');
  if (!conn) return;

  const sinceTaskSeq = Number(req.query.since_task_seq ?? 0) || 0;
  const sinceMsgSeq = Number(req.query.since_msg_seq ?? 0) || 0;

  const supabase = getSupabaseAdmin();

  const { data: agents } = await supabase
    .from('ops_agents')
    .select('id')
    .eq('machine_id', conn.machineId)
    .eq('is_enabled', true)
    .neq('status', 'revoked');

  const agentIds = (agents ?? []).map((a) => a.id);
  if (agentIds.length === 0) {
    return res.status(200).json({ tasks: [], messages: [] });
  }

  const [tasksRes, msgsRes] = await Promise.all([
    supabase
      .from('ops_tasks')
      .select('*')
      .in('assigned_agent_id', agentIds)
      .eq('status', 'queued')
      .gt('seq', sinceTaskSeq)
      .order('seq', { ascending: true })
      .limit(20),
    supabase
      .from('ops_messages')
      .select('*')
      .in('target_agent_id', agentIds)
      .in('delivery_status', ['persisted', 'dispatched'])
      .gt('seq', sinceMsgSeq)
      .order('seq', { ascending: true })
      .limit(50),
  ]);

  return res.status(200).json({
    tasks: tasksRes.data ?? [],
    messages: msgsRes.data ?? [],
  });
}
