import { spawn } from 'node:child_process';
import { AgentRuntimeAdapter, AgentTaskPayload } from './types.js';

export class McpClientAdapter implements AgentRuntimeAdapter {
  readonly type = 'mcp-client' as const;

  constructor(private readonly config: { command: string; args?: string[]; toolName?: string }) {}

  async healthCheck() {
    return { healthy: Boolean(this.config.command), detail: `MCP stdio: ${this.config.command}` };
  }

  async executeTask(
    payload: AgentTaskPayload,
    hooks: { onStreamChunk: (chunk: string) => void },
    abortSignal: AbortSignal,
  ) {
    return new Promise<{ summary: string; producedFiles: string[] }>((resolve, reject) => {
      const child = spawn(this.config.command, this.config.args ?? [], {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let out = '';
      const onAbort = () => child.kill('SIGTERM');
      abortSignal.addEventListener('abort', onAbort, { once: true });

      child.stdout.on('data', (d: Buffer) => {
        const txt = d.toString('utf8');
        out += txt;
        hooks.onStreamChunk(txt);
      });
      child.on('error', reject);
      child.on('close', () => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve({ summary: out.trim().slice(-4000) || 'MCP task finished', producedFiles: [] });
      });

      const rpcRequest = {
        jsonrpc: '2.0',
        id: payload.taskId,
        method: 'tools/call',
        params: {
          name: this.config.toolName ?? 'execute_task',
          arguments: { directive: payload.systemDirective, untrustedInputs: payload.untrustedInputs },
        },
      };
      child.stdin.write(JSON.stringify(rpcRequest) + '\n');
      child.stdin.end();
    });
  }

  async sendMessage(message: { conversationId: string; fromLabel: string; content: string }) {
    return { reply: `[MCP ${this.config.command}] Mensaje recibido en ${message.conversationId}` };
  }
}
