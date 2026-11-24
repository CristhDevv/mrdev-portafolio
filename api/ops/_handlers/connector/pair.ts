import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { pairConnectorSchema } from '../../_lib/schemas.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const parsed = pairConnectorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });

  const supabase = getSupabaseAdmin();
  const tokenHash = crypto.createHash('sha256').update(parsed.data.otp_token).digest('hex');

  const { data: tokenRow, error: tErr } = await supabase
    .from('ops_pairing_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .single();

  if (tErr || !tokenRow) {
    return res.status(401).json({ error: 'INVALID_OTP', message: 'Pairing token not found or already used' });
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'OTP_EXPIRED', message: 'Pairing token expired' });
  }

  // Mark OTP used atomically
  const { data: claimedToken, error: claimErr } = await supabase
    .from('ops_pairing_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .is('used_at', null)
    .select('id')
    .single();

  if (claimErr || !claimedToken) {
    return res.status(401).json({ error: 'OTP_ALREADY_USED' });
  }

  const keyFingerprint = crypto
    .createHash('sha256')
    .update(parsed.data.public_key_ed25519)
    .digest('hex');

  await Promise.all([
    supabase
      .from('ops_machines')
      .update({
        machine_fingerprint: parsed.data.machine_fingerprint,
        os_type: parsed.data.os_info.os_type,
        os_version: parsed.data.os_info.os_version ?? null,
        arch: parsed.data.os_info.arch ?? null,
        status: 'connected',
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRow.machine_id),
    supabase.from('ops_machine_credentials').insert({
      machine_id: tokenRow.machine_id,
      public_key_ed25519: parsed.data.public_key_ed25519,
      key_fingerprint: keyFingerprint,
      is_active: true,
    }),
  ]);

  if (parsed.data.discovered_agents.length > 0) {
    for (const agent of parsed.data.discovered_agents) {
      await supabase.from('ops_agents').upsert(
        {
          machine_id: tokenRow.machine_id,
          slug: agent.slug,
          name: agent.name,
          specialty: agent.specialty,
          adapter_type: agent.adapter_type,
          capabilities: agent.capabilities,
          tools: agent.tools,
          status: 'online',
          is_enabled: true,
        },
        { onConflict: 'machine_id,slug' },
      );
    }
  }

  await recordAuditAndEvent({
    actorType: 'connector',
    actorId: tokenRow.machine_id,
    action: 'machine.paired',
    resourceType: 'machine',
    resourceId: tokenRow.machine_id,
    machineId: tokenRow.machine_id,
    summary: `Máquina emparejada exitosamente (${parsed.data.os_info.os_type}) con ${parsed.data.discovered_agents.length} agente(s)`,
  });

  return res.status(200).json({
    machine_id: tokenRow.machine_id,
    key_fingerprint: keyFingerprint,
    supabase_url: process.env.SUPABASE_URL ?? null,
  });
}
