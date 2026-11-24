import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  buildCanonicalPayload,
  isTimestampWithinWindow,
  verifyEd25519Signature,
} from '../../api/ops/_lib/connectorAuth.js';

test('Ed25519 signature verifies valid canonical payload and rejects tampering', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spkiBase64 = Buffer.from(publicKey.export({ format: 'der', type: 'spki' })).toString('base64');

  const ts = String(Date.now());
  const nonce = crypto.randomUUID();
  const body = JSON.stringify({ machine_status: 'idle' });
  const canonical = buildCanonicalPayload('POST', '/api/ops/connector/heartbeat', ts, nonce, body);
  const sig = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey).toString('base64');

  assert.equal(verifyEd25519Signature(spkiBase64, canonical, sig), true);

  const tampered = buildCanonicalPayload('POST', '/api/ops/connector/heartbeat', ts, nonce, '{"machine_status":"busy"}');
  assert.equal(verifyEd25519Signature(spkiBase64, tampered, sig), false);
});

test('isTimestampWithinWindow enforces +/-60s anti-replay window', () => {
  const now = 1_700_000_000_000;
  assert.equal(isTimestampWithinWindow(String(now - 30_000), now), true);
  assert.equal(isTimestampWithinWindow(String(now - 90_000), now), false);
  assert.equal(isTimestampWithinWindow(String(now + 90_000), now), false);
});
