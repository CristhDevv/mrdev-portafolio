import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const workspaceId = req.query.workspace_id ? String(req.query.workspace_id) : null;
    let query = supabase.from('ops_conversations').select('*').order('created_at', { ascending: false });
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    return res.status(200).json({ conversations: data ?? [] });
  }

  if (req.method === 'POST') {
    const { workspace_id, title, kind, participant_agent_ids = [] } = req.body as {
      workspace_id: string;
      title: string;
      kind: 'direct_human_agent' | 'peer_agent_agent' | 'group' | 'broadcast';
      participant_agent_ids?: string[];
    };

    const { data: conv, error } = await supabase
      .from('ops_conversations')
      .insert({
        workspace_id,
        title,
        kind,
        created_by_type: 'human',
      })
      .select('*')
      .single();

    if (error || !conv) return res.status(400).json({ error: 'DB_ERROR', message: error?.message });

    if (participant_agent_ids.length > 0) {
      await supabase.from('ops_conversation_participants').insert(
        participant_agent_ids.map((agentId) => ({
          conversation_id: conv.id,
          agent_id: agentId,
        })),
      );
    }

    return res.status(201).json({ conversation: conv });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
