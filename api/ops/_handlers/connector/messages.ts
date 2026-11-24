import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { requireConnector } from '../../_lib/connectorAuth.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const body = req.body as {
    workspace_id: string;
    conversation_id: string;
    sender_agent_id: string;
    target_agent_id?: string | null;
    message_type?: string;
    content: string;
    artifact_ids?: string[];
    idempotency_key?: string;
  };

  if (!body.workspace_id || !body.conversation_id || !body.sender_agent_id || !body.content) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const supabase = getSupabaseAdmin();

  // Verify sender agent belongs to this machine
  const { data: senderAgent } = await supabase
    .from('ops_agents')
    .select('id, machine_id, is_enabled, status')
    .eq('id', body.sender_agent_id)
    .eq('machine_id', conn.machineId)
    .single();

  if (!senderAgent || !senderAgent.is_enabled || senderAgent.status === 'revoked') {
    return res.status(403).json({ error: 'AGENT_NOT_AUTHORIZED_ON_MACHINE' });
  }

  // Verify workspace membership for sender and optional target (anti lateral movement)
  const { data: senderMember } = await supabase
    .from('ops_workspace_members')
    .select('id, can_initiate_messages')
    .eq('workspace_id', body.workspace_id)
    .eq('agent_id', body.sender_agent_id)
    .single();

  if (!senderMember) {
    return res.status(403).json({ error: 'SENDER_NOT_IN_WORKSPACE' });
  }

  if (body.target_agent_id) {
    const { data: targetMember } = await supabase
      .from('ops_workspace_members')
      .select('id')
      .eq('workspace_id', body.workspace_id)
      .eq('agent_id', body.target_agent_id)
      .single();

    if (!targetMember) {
      return res.status(403).json({ error: 'TARGET_NOT_IN_WORKSPACE' });
    }
  }

  const { data: msg, error } = await supabase
    .from('ops_messages')
    .insert({
      workspace_id: body.workspace_id,
      conversation_id: body.conversation_id,
      sender_type: 'agent',
      sender_agent_id: body.sender_agent_id,
      target_agent_id: body.target_agent_id ?? null,
      message_type: body.message_type ?? 'response',
      content: body.content.slice(0, 20000),
      artifact_ids: body.artifact_ids ?? [],
      idempotency_key: body.idempotency_key ?? null,
      delivery_status: 'persisted',
    })
    .select('*')
    .single();

  if (error || !msg) return res.status(400).json({ error: 'DB_ERROR', message: error?.message });

  await recordAuditAndEvent({
    actorType: 'agent',
    actorId: body.sender_agent_id,
    action: 'message.peer_sent',
    resourceType: 'message',
    resourceId: msg.id,
    workspaceId: body.workspace_id,
    machineId: conn.machineId,
    agentId: body.sender_agent_id,
    summary: `Mensaje inter-agente mediado por el Hub (${msg.message_type})`,
  });

  return res.status(201).json({ message: msg });
}
