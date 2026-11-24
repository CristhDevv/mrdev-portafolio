#!/usr/bin/env node
import crypto from 'node:crypto';
import os from 'node:os';
import { generateEd25519KeyPair } from './config/cryptoSigner.js';
import { loadIdentity, saveIdentity } from './config/identityStore.js';
import { loadLocalConfig, runDaemon } from './core/daemon.js';
import { createAdapter } from './adapters/registry.js';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const command = process.argv[2] ?? 'status';

async function main() {
  if (command === 'pair') {
    const server = (getArg('--server') ?? 'https://mrdev.lat').replace(/\/+$/, '');
    const token = getArg('--token');
    if (!token) {
      console.error('Uso: mrdev-connector pair --server https://mrdev.lat --token <OTP>');
      process.exit(1);
    }

    const { publicKeyBase64, privateKeyPem } = generateEd25519KeyPair();
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${os.hostname()}-${os.platform()}-${os.arch()}`)
      .digest('hex');

    const localCfg = loadLocalConfig();
    const osType =
      os.platform() === 'win32'
        ? 'windows'
        : os.platform() === 'darwin'
        ? 'macos'
        : os.platform() === 'linux'
        ? 'linux'
        : 'unknown';

    const res = await fetch(`${server}/api/ops/connector/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otp_token: token,
        public_key_ed25519: publicKeyBase64,
        machine_fingerprint: fingerprint,
        os_info: { os_type: osType, os_version: os.release(), arch: os.arch() },
        discovered_agents: localCfg.agents.map((a) => ({
          slug: a.slug,
          name: a.name,
          specialty: a.specialty ?? 'General',
          adapter_type: a.adapter_type,
          capabilities: a.capabilities ?? [],
          tools: a.tools ?? [],
        })),
      }),
    });

    const data = (await res.json()) as {
      machine_id?: string;
      key_fingerprint?: string;
      supabase_url?: string | null;
      error?: string;
    };

    if (!res.ok || !data.machine_id || !data.key_fingerprint) {
      console.error('Error al emparejar:', data);
      process.exit(1);
    }

    saveIdentity({
      serverUrl: server,
      machineId: data.machine_id,
      keyFingerprint: data.key_fingerprint,
      publicKeyBase64,
      privateKeyPem,
      supabaseUrl: data.supabase_url,
    });

    console.log(`Emparejamiento exitoso. Machine ID: ${data.machine_id}`);
    return;
  }

  if (command === 'start') {
    const identity = loadIdentity();
    if (!identity) {
      console.error('Máquina no emparejada. Ejecuta primero: mrdev-connector pair --token <OTP>');
      process.exit(1);
    }
    await runDaemon(identity);
    return;
  }

  if (command === 'doctor') {
    const cfg = loadLocalConfig();
    console.log('Allowed roots:', cfg.allowedRootPaths);
    for (const a of cfg.agents) {
      const adapter = createAdapter(a, cfg.allowedRootPaths);
      const hc = await adapter.healthCheck();
      console.log(`- ${a.slug} (${a.adapter_type}):`, hc);
    }
    return;
  }

  const identity = loadIdentity();
  console.log(identity ? `Conectado como ${identity.machineId} -> ${identity.serverUrl}` : 'Sin emparejar');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
