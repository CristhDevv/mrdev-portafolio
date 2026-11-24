import { spawn } from 'node:child_process';
import { isPathWithinAllowedRoots } from '../core/securityGuard.js';
import { AgentRuntimeAdapter, AgentTaskPayload } from './types.js';

export class CliSubprocessAdapter implements AgentRuntimeAdapter {
  readonly type = 'cli-subprocess' as const;

  constructor(
    private readonly config: {
      command: string;
      args?: string[];
      allowedRoots: string[];
    },
  ) {}

  async healthCheck() {
    return { healthy: Boolean(this.config.command), detail: `CLI: ${this.config.command}` };
  }

  async executeTask(
    payload: AgentTaskPayload,
    hooks: { onStreamChunk: (chunk: string) => void },
    abortSignal: AbortSignal,
  ) {
    if (!isPathWithinAllowedRoots(payload.workingDirectory, this.config.allowedRoots)) {
      throw new Error(`Working directory outside allowed_root_paths: ${payload.workingDirectory}`);
    }

    return new Promise<{ summary: string; producedFiles: string[] }>((resolve, reject) => {
      const child = spawn(this.config.command, this.config.args ?? [], {
        cwd: payload.workingDirectory,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      const timer = setTimeout(() => child.kill('SIGTERM'), payload.timeoutSeconds * 1000);
      const onAbort = () => child.kill('SIGTERM');
      abortSignal.addEventListener('abort', onAbort, { once: true });

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        output += text;
        hooks.onStreamChunk(text);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        hooks.onStreamChunk(`[stderr] ${chunk.toString('utf8')}`);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        abortSignal.removeEventListener('abort', onAbort);
        if (code === 0) {
          resolve({ summary: output.trim().slice(-4000) || 'Completed', producedFiles: [] });
        } else {
          reject(new Error(`CLI exited with code ${code}`));
        }
      });

      // Deliver structured prompt over stdin (never via shell interpolation)
      child.stdin.write(
        JSON.stringify({
          taskId: payload.taskId,
          systemDirective: payload.systemDirective,
          untrustedInputs: payload.untrustedInputs,
        }) + '\n',
      );
      child.stdin.end();
    });
  }

  async sendMessage(message: {
    conversationId: string;
    fromLabel: string;
    content: string;
    isUntrustedPeer: boolean;
  }) {
    return {
      reply: `[CLI ${this.config.command}] Recibido (${message.isUntrustedPeer ? 'peer' : 'admin'}): ${message.content.slice(0, 140)}`,
    };
  }
}
