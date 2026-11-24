import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { createWorkspaceSchema } from '../../_lib/schemas.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const [workspaces, members] = await Promise.all([
      supabase.from('ops_workspaces').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('ops_workspace_members').select('*'),
    ]);
    return res.status(200).json({ workspaces: workspaces.data ?? [], members: members.data ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

    const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const { data: ws, error } = await supabase
      .from('ops_workspaces')
      .insert({
        name: parsed.data.name,
        slug,
        domain_category: parsed.data.domain_category,
        description: parsed.data.description,
        system_instructions: parsed.data.system_instructions,
      })
      .select('*')
      .single();

    if (error || !ws) return res.status(400).json({ error: 'DB_ERROR', message: error?.message });

    if (parsed.data.agent_ids.length > 0) {
      await supabase.from('ops_workspace_members').insert(
        parsed.data.agent_ids.map((agentId) => ({
          workspace_id: ws.id,
          agent_id: agentId,
          role: 'contributor',
        })),
      );
    }

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: ws.id,
      workspaceId: ws.id,
      summary: `Espacio de trabajo "${ws.name}" creado con ${parsed.data.agent_ids.length} agente(s)`,
    });

    return res.status(201).json({ workspace: ws });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
