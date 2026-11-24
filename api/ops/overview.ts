import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/adminAuth.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  const [machines, agents, workspaces, tasks, approvals, events, auditLogs] = await Promise.all([
    supabase.from('ops_machines').select('*').order('created_at', { ascending: false }),
    supabase.from('ops_agents').select('*').order('created_at', { ascending: false }),
    supabase.from('ops_workspaces').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
    supabase.from('ops_tasks').select('*').order('seq', { ascending: false }).limit(80),
    supabase.from('ops_approval_requests').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('ops_activity_events').select('*').order('seq', { ascending: false }).limit(60),
    supabase.from('ops_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  return res.status(200).json({
    machines: machines.data ?? [],
    agents: agents.data ?? [],
    workspaces: workspaces.data ?? [],
    tasks: tasks.data ?? [],
    approvals: approvals.data ?? [],
    events: events.data ?? [],
    auditLogs: auditLogs.data ?? [],
  });
}
