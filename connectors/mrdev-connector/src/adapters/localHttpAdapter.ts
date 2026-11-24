import { isLoopbackUrl } from '../core/securityGuard.js';
import { AgentRuntimeAdapter, AgentTaskPayload } from './types.js';

export class LocalHttpAdapter implements AgentRuntimeAdapter {
  readonly type = 'local-http' as const;

  constructor(private readonly endpoint: string) {
    if (!isLoopbackUrl(endpoint)) {
      throw new Error(`SSRF Guard: LocalHttpAdapter only allows loopback endpoints (127.0.0.1/localhost), got ${endpoint}`);
    }
  }

  async healthCheck() {
    try {
      const res = await fetch(this.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      return { healthy: res.ok, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { healthy: false, detail: err instanceof Error ? err.message : 'Unreachable' };
    }
  }

  async executeTask(
    payload: AgentTaskPayload,
    hooks: { onStreamChunk: (chunk: string) => void },
    abortSignal: AbortSignal,
  ) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });
    if (!res.ok) throw new Error(`Local HTTP agent returned ${res.status}`);
    const data = (await res.json()) as { summary?: string; producedFiles?: string[] };
    const summary = data.summary ?? JSON.stringify(data);
    hooks.onStreamChunk(summary);
    return { summary, producedFiles: data.producedFiles ?? [] };
  }

  async sendMessage(message: {
    conversationId: string;
    fromLabel: string;
    content: string;
    isUntrustedPeer: boolean;
  }) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'message', ...message }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Local HTTP agent message failed: ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    return { reply: data.reply };
  }
}
