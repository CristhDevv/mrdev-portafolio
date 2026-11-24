import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const workspaceId = String(req.query.id ?? '');
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { agent_id, role = 'contributor' } = req.body as { agent_id: string; role?: string };
    const { data, error } = await supabase
      .from('ops_workspace_members')
      .upsert({ workspace_id: workspaceId, agent_id, role }, { onConflict: 'workspace_id,agent_id' })
      .select('*')
      .single();
    if (error) return res.status(400).json({ error: 'DB_ERROR', message: error.message });

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'workspace.member_added',
      resourceType: 'workspace_member',
      resourceId: data.id,
      workspaceId,
      agentId: agent_id,
      summary: `Agente añadido al espacio de trabajo (${role})`,
    });

    return res.status(200).json({ member: data });
  }

  if (req.method === 'DELETE') {
    const { agent_id } = req.body as { agent_id: string };
    await supabase.from('ops_workspace_members').delete().eq('workspace_id', workspaceId).eq('agent_id', agent_id);

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'workspace.member_removed',
      resourceType: 'workspace',
      resourceId: workspaceId,
      workspaceId,
      agentId: agent_id,
      summary: 'Agente removido del espacio de trabajo',
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
