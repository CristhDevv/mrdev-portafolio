import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { requireConnector } from '../../_lib/connectorAuth.js';
import { heartbeatSchema } from '../../_lib/schemas.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const conn = await requireConnector(req, res);
  if (!conn) return;

  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from('ops_machines')
    .update({
      status: parsed.data.machine_status,
      resource_snapshot: parsed.data.resources,
      last_heartbeat_at: now,
      updated_at: now,
    })
    .eq('id', conn.machineId);

  for (const ag of parsed.data.agents) {
    await supabase
      .from('ops_agents')
      .update({ status: ag.status, updated_at: now })
      .eq('id', ag.agent_id)
      .eq('machine_id', conn.machineId)
      .neq('status', 'revoked');
  }

  return res.status(200).json({ ok: true, server_time: now });
}
