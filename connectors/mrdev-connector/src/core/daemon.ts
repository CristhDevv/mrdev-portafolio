import fs from 'node:fs';
import path from 'node:path';
import { createAdapter, LocalAgentDefinition } from '../adapters/registry.js';
import { signConnectorHeaders } from '../config/cryptoSigner.js';
import { clearIdentity, getConfigDir, MachineIdentity } from '../config/identityStore.js';
import { collectMachineResources } from './heartbeat.js';
import { LocalQueue } from './localQueue.js';
import { classifyActionRisk } from './securityGuard.js';

export interface LocalConnectorConfig {
  allowedRootPaths: string[];
  agents: LocalAgentDefinition[];
}

export function loadLocalConfig(): LocalConnectorConfig {
  const cfgPath = path.join(getConfigDir(), 'agents.json');
  if (!fs.existsSync(cfgPath)) {
    return { allowedRootPaths: [process.cwd()], agents: [] };
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as LocalConnectorConfig;
}

async function signedRequest(
  identity: MachineIdentity,
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<Response> {
  const rawBody = body ? JSON.stringify(body) : '';
  const headers = {
    ...signConnectorHeaders(identity, method, urlPath.split('?')[0], rawBody),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  return fetch(`${identity.serverUrl}${urlPath}`, {
    method,
    headers,
    body: body ? rawBody : undefined,
  });
}

export async function runDaemon(identity: MachineIdentity): Promise<void> {
  const config = loadLocalConfig();
  const queue = new LocalQueue();
  let sinceTaskSeq = 0;
  let sinceMsgSeq = 0;
  let stopped = false;

  console.log(`[mrdev-connector] Iniciado para máquina ${identity.machineId} -> ${identity.serverUrl}`);

  const flushQueue = async () => {
    const pending = queue.readAll();
    if (pending.length === 0) return;
    const remaining = [];
    for (const item of pending) {
      try {
        const res = await signedRequest(identity, item.method, item.urlPath, item.body);
        if (!res.ok && res.status >= 500) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    queue.replaceAll(remaining);
  };

  const cycle = async () => {
    if (stopped) return;
    await flushQueue();

    const hbRes = await signedRequest(identity, 'POST', '/api/ops/connector/heartbeat', {
      machine_status: 'idle',
      resources: collectMachineResources(),
      agents: [],
    });

    if (hbRes.status === 403) {
      console.error('[mrdev-connector] Máquina revocada por el administrador. Limpiando credenciales.');
      clearIdentity();
      stopped = true;
      process.exit(1);
    }

    const syncPath = `/api/ops/connector/sync?since_task_seq=${sinceTaskSeq}&since_msg_seq=${sinceMsgSeq}`;
    const syncRes = await signedRequest(identity, 'GET', syncPath);
    if (!syncRes.ok) return;

    const { tasks = [], messages = [] } = (await syncRes.json()) as {
      tasks: Array<{
        id: string;
        seq: number;
        workspace_id: string;
        title: string;
        instructions: string;
        timeout_seconds: number;
      }>;
      messages: Array<{ id: string; seq: number; conversation_id: string; content: string }>;
    };

    for (const m of messages) {
      sinceMsgSeq = Math.max(sinceMsgSeq, m.seq);
    }

    for (const task of tasks) {
      sinceTaskSeq = Math.max(sinceTaskSeq, task.seq);
      const risk = classifyActionRisk(task.instructions);

      if (risk === 'critical') {
        await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/fail`, {
          error_message: 'Blocked locally by securityGuard (critical risk pattern)',
        });
        continue;
      }

      if (risk === 'high') {
        await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/request-approval`, {
          risk_level: 'high',
          action_type: 'elevated_task',
          action_summary: `Confirmar ejecución de "${task.title}"`,
        });
        continue;
      }

      const claimRes = await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/claim`, {
        idempotency_key: `claim-${task.id}`,
      });
      if (!claimRes.ok) continue;

      const agentDef = config.agents[0];
      if (!agentDef) {
        await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/fail`, {
          error_message: 'No local agent configured in agents.json',
        });
        continue;
      }

      try {
        const adapter = createAdapter(agentDef, config.allowedRootPaths);
        const controller = new AbortController();
        const result = await adapter.executeTask(
          {
            taskId: task.id,
            workspaceId: task.workspace_id,
            correlationId: task.id,
            systemDirective: task.instructions,
            untrustedInputs: { fromAgents: [], artifacts: [] },
            workingDirectory: config.allowedRootPaths[0] ?? process.cwd(),
            timeoutSeconds: task.timeout_seconds,
          },
          { onStreamChunk: (chunk) => process.stdout.write(chunk) },
          controller.signal,
        );

        const completeBody = { output_summary: result.summary, output_artifact_ids: [] };
        try {
          await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/complete`, completeBody);
        } catch {
          queue.enqueue({
            id: task.id,
            method: 'POST',
            urlPath: `/api/ops/connector/tasks/${task.id}/complete`,
            body: completeBody,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        await signedRequest(identity, 'POST', `/api/ops/connector/tasks/${task.id}/fail`, {
          error_message: err instanceof Error ? err.message : 'Adapter error',
        });
      }
    }
  };

  await cycle();
  setInterval(() => {
    cycle().catch((e) => console.error('[mrdev-connector] cycle error:', e));
  }, 15_000);
}
