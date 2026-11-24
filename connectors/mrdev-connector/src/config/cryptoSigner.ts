import crypto from 'node:crypto';
import { MachineIdentity } from './identityStore.js';

export function generateEd25519KeyPair(): { publicKeyBase64: string; privateKeyPem: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spkiDer = publicKey.export({ format: 'der', type: 'spki' });
  const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  return {
    publicKeyBase64: Buffer.from(spkiDer).toString('base64'),
    privateKeyPem: privatePem,
  };
}

export function signConnectorHeaders(
  identity: MachineIdentity,
  method: string,
  urlPath: string,
  rawBody: string,
): Record<string, string> {
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const canonical = `${method.toUpperCase()}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyHash}`;

  const signature = crypto
    .sign(null, Buffer.from(canonical, 'utf8'), crypto.createPrivateKey(identity.privateKeyPem))
    .toString('base64');

  return {
    'X-Ops-Machine-Id': identity.machineId,
    'X-Ops-Key-Fingerprint': identity.keyFingerprint,
    'X-Ops-Timestamp': timestamp,
    'X-Ops-Nonce': nonce,
    'X-Ops-Signature': signature,
  };
}
