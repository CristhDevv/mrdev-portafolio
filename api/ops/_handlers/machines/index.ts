import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../../_lib/httpTypes.js';
import { requireAdmin } from '../../_lib/adminAuth.js';
import { recordAuditAndEvent } from '../../_lib/auditLogger.js';
import { createMachineSchema } from '../../_lib/schemas.js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('ops_machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    return res.status(200).json({ machines: data ?? [] });
  }

  if (req.method === 'POST') {
    const parsed = createMachineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
    }

    const { data: machine, error } = await supabase
      .from('ops_machines')
      .insert({
        custom_name: parsed.data.custom_name,
        os_type: parsed.data.os_type,
        allowed_root_paths: parsed.data.allowed_root_paths,
        status: 'disconnected',
      })
      .select('*')
      .single();

    if (error || !machine) {
      return res.status(500).json({ error: 'DB_ERROR', message: error?.message });
    }

    const rawOtp = `mrpair_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    await supabase.from('ops_pairing_tokens').insert({
      machine_id: machine.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    await recordAuditAndEvent({
      actorType: 'admin',
      actorId: admin.email,
      action: 'machine.registered',
      resourceType: 'machine',
      resourceId: machine.id,
      machineId: machine.id,
      summary: `Máquina "${machine.custom_name}" registrada; token de emparejamiento emitido`,
    });

    return res.status(201).json({
      machine,
      pairing: {
        otp_token: rawOtp,
        expires_at: expiresAt,
        cli_command: `node dist/cli.js pair --server https://mrdev.lat --token ${rawOtp}`,
      },
    });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
