import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../_lib/auditLogger.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('ops_agents').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    return res.status(200).json({ agents: data ?? [] });
  }

  if (req.method === 'POST') {
    const body = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('ops_agents')
      .insert({
        machine_id: body.machine_id,
        name: body.name,
        slug: body.slug,
        specialty: body.specialty ?? 'General',
        description: body.description ?? '',
        adapter_type: body.adapter_type ?? 'cli-subprocess',
        adapter_config: body.adapter_config ?? {},
        tools: body.tools ?? [],
        capabilities: body.capabilities ?? [],
        status: 'offline',
        is_enabled: true,
      })
      .select('*')
      .single();

    if (error || !data) return res.status(400).json({ error: 'CREATE_AGENT_FAILED', message: error?.message });

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'agent.registered',
      resourceType: 'agent',
      resourceId: data.id,
      machineId: data.machine_id,
      agentId: data.id,
      summary: `Agente "${data.name}" (${data.adapter_type}) registrado`,
    });

    return res.status(201).json({ agent: data });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
