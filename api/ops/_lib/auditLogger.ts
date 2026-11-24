import { getSupabaseAdmin } from './supabaseAdmin.js';

export async function recordAuditAndEvent(params: {
  actorType: 'admin' | 'connector' | 'agent' | 'system';
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  workspaceId?: string | null;
  machineId?: string | null;
  agentId?: string | null;
  taskId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  await Promise.all([
    supabase.from('ops_audit_logs').insert({
      actor_type: params.actorType,
      actor_id: params.actorId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      ip_address: params.ipAddress ?? null,
      details: params.details ?? {},
    }),
    supabase.from('ops_activity_events').insert({
      workspace_id: params.workspaceId ?? null,
      machine_id: params.machineId ?? null,
      agent_id: params.agentId ?? null,
      task_id: params.taskId ?? null,
      event_type: params.action,
      severity: params.severity ?? 'info',
      summary: params.summary,
      payload: params.details ?? {},
    }),
  ]);
}
