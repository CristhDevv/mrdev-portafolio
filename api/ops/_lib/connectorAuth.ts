import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './supabaseAdmin.js';

export const REPLAY_WINDOW_MS = 60_000;

export function buildCanonicalPayload(
  method: string,
  path: string,
  timestampMs: string,
  nonce: string,
  rawBody: string,
): string {
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  return `${method.toUpperCase()}\n${path}\n${timestampMs}\n${nonce}\n${bodyHash}`;
}

export function verifyEd25519Signature(
  publicKeyPemOrSpkiBase64: string,
  canonicalMessage: string,
  signatureBase64: string,
): boolean {
  try {
    const keyObj = publicKeyPemOrSpkiBase64.includes('BEGIN PUBLIC KEY')
      ? crypto.createPublicKey(publicKeyPemOrSpkiBase64)
      : crypto.createPublicKey({
          key: Buffer.from(publicKeyPemOrSpkiBase64, 'base64'),
          format: 'der',
          type: 'spki',
        });

    return crypto.verify(
      null,
      Buffer.from(canonicalMessage, 'utf8'),
      keyObj,
      Buffer.from(signatureBase64, 'base64'),
    );
  } catch {
    return false;
  }
}

export function isTimestampWithinWindow(timestampMs: string, nowMs = Date.now()): boolean {
  const parsed = Number(timestampMs);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(nowMs - parsed) <= REPLAY_WINDOW_MS;
}

export interface VerifiedConnector {
  machineId: string;
  keyFingerprint: string;
}

export async function requireConnector(
  req: VercelRequest,
  res: VercelResponse,
  rawBodyString?: string,
): Promise<VerifiedConnector | null> {
  const machineId = String(req.headers['x-ops-machine-id'] ?? '');
  const keyFingerprint = String(req.headers['x-ops-key-fingerprint'] ?? '');
  const timestampMs = String(req.headers['x-ops-timestamp'] ?? '');
  const nonce = String(req.headers['x-ops-nonce'] ?? '');
  const signature = String(req.headers['x-ops-signature'] ?? '');

  if (!machineId || !keyFingerprint || !timestampMs || !nonce || !signature) {
    res.status(401).json({ error: 'MISSING_CONNECTOR_HEADERS', message: 'Missing authentication headers' });
    return null;
  }

  if (!isTimestampWithinWindow(timestampMs)) {
    res.status(401).json({ error: 'TIMESTAMP_EXPIRED', message: 'Request timestamp outside +/-60s window' });
    return null;
  }

  const supabase = getSupabaseAdmin();

  // Check machine status & active credential
  const { data: machine } = await supabase
    .from('ops_machines')
    .select('id, status')
    .eq('id', machineId)
    .single();

  if (!machine || machine.status === 'revoked') {
    res.status(403).json({ error: 'MACHINE_REVOKED', message: 'Machine is revoked or unknown' });
    return null;
  }

  const { data: cred } = await supabase
    .from('ops_machine_credentials')
    .select('id, public_key_ed25519, is_active')
    .eq('machine_id', machineId)
    .eq('key_fingerprint', keyFingerprint)
    .eq('is_active', true)
    .single();

  if (!cred) {
    res.status(401).json({ error: 'INVALID_CREDENTIAL', message: 'No active credential for machine' });
    return null;
  }

  const bodyText =
    rawBodyString ??
    (typeof req.body === 'string'
      ? req.body
      : req.body && Object.keys(req.body).length > 0
      ? JSON.stringify(req.body)
      : '');

  const pathOnly = (req.url ?? '/').split('?')[0];
  const canonical = buildCanonicalPayload(req.method ?? 'GET', pathOnly, timestampMs, nonce, bodyText);

  if (!verifyEd25519Signature(cred.public_key_ed25519, canonical, signature)) {
    res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Ed25519 signature verification failed' });
    return null;
  }

  // Anti-replay nonce check
  const expiresAt = new Date(Date.now() + REPLAY_WINDOW_MS * 2).toISOString();
  const { error: nonceErr } = await supabase.from('ops_used_nonces').insert({
    nonce,
    machine_id: machineId,
    expires_at: expiresAt,
  });

  if (nonceErr) {
    res.status(409).json({ error: 'REPLAY_DETECTED', message: 'Nonce already used' });
    return null;
  }

  return { machineId, keyFingerprint };
}
