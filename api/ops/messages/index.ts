import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../_lib/auditLogger.js';
import { createMessageSchema } from '../_lib/schemas.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const conversationId = String(req.query.conversation_id ?? '');
    if (!conversationId) return res.status(400).json({ error: 'MISSING_CONVERSATION_ID' });

    const { data, error } = await supabase
      .from('ops_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('seq', { ascending: true })
      .limit(200);

    if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    return res.status(200).json({ messages: data ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

    const { data: msg, error } = await supabase
      .from('ops_messages')
      .insert({
        workspace_id: parsed.data.workspace_id,
        conversation_id: parsed.data.conversation_id,
        sender_type: 'human',
        target_agent_id: parsed.data.target_agent_id ?? null,
        message_type: parsed.data.message_type,
        content: parsed.data.content,
        artifact_ids: parsed.data.artifact_ids,
        idempotency_key: parsed.data.idempotency_key ?? null,
        delivery_status: 'persisted',
      })
      .select('*')
      .single();

    if (error || !msg) return res.status(400).json({ error: 'DB_ERROR', message: error?.message });

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'message.sent',
      resourceType: 'message',
      resourceId: msg.id,
      workspaceId: msg.workspace_id,
      agentId: msg.target_agent_id,
      summary: `Mensaje (${msg.message_type}) enviado desde Ops Center`,
    });

    return res.status(201).json({ message: msg });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
