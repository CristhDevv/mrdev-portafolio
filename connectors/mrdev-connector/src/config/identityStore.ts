import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface MachineIdentity {
  serverUrl: string;
  machineId: string;
  keyFingerprint: string;
  publicKeyBase64: string;
  privateKeyPem: string;
  supabaseUrl?: string | null;
}

export function getConfigDir(): string {
  return path.join(os.homedir(), '.mrdev-connector');
}

export function saveIdentity(identity: MachineIdentity): void {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const filePath = path.join(dir, 'identity.json');
  fs.writeFileSync(filePath, JSON.stringify(identity, null, 2), { mode: 0o600 });
}

export function loadIdentity(): MachineIdentity | null {
  const filePath = path.join(getConfigDir(), 'identity.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as MachineIdentity;
}

export function clearIdentity(): void {
  const filePath = path.join(getConfigDir(), 'identity.json');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
