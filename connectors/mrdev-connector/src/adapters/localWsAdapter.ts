import WebSocket from 'ws';
import { isLoopbackUrl } from '../core/securityGuard.js';
import { AgentRuntimeAdapter, AgentTaskPayload } from './types.js';

export class LocalWsAdapter implements AgentRuntimeAdapter {
  readonly type = 'local-ws' as const;

  constructor(private readonly wsUrl: string) {
    if (!isLoopbackUrl(wsUrl)) {
      throw new Error(`SSRF Guard: LocalWsAdapter only allows loopback WebSocket URLs, got ${wsUrl}`);
    }
  }

  async healthCheck() {
    return { healthy: isLoopbackUrl(this.wsUrl), detail: `WS: ${this.wsUrl}` };
  }

  async executeTask(
    payload: AgentTaskPayload,
    hooks: { onStreamChunk: (chunk: string) => void },
    abortSignal: AbortSignal,
  ) {
    return new Promise<{ summary: string; producedFiles: string[] }>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      const chunks: string[] = [];
      const onAbort = () => ws.close();
      abortSignal.addEventListener('abort', onAbort, { once: true });

      ws.on('open', () => ws.send(JSON.stringify({ type: 'task', payload })));
      ws.on('message', (data) => {
        const text = data.toString();
        chunks.push(text);
        hooks.onStreamChunk(text);
      });
      ws.on('error', reject);
      ws.on('close', () => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve({ summary: chunks.join('\n').slice(-4000) || 'WS task completed', producedFiles: [] });
      });
    });
  }

  async sendMessage(message: { conversationId: string; fromLabel: string; content: string }) {
    return { reply: `[WS ${this.wsUrl}] Mensaje enrutado (${message.conversationId})` };
  }
}
