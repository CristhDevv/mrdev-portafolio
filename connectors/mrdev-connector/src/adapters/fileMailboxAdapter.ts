import fs from 'node:fs';
import path from 'node:path';
import { isPathWithinAllowedRoots } from '../core/securityGuard.js';
import { AgentRuntimeAdapter, AgentTaskPayload } from './types.js';

export class FileMailboxAdapter implements AgentRuntimeAdapter {
  readonly type = 'file-mailbox' as const;

  constructor(
    private readonly config: {
      mailboxDir: string;
      allowedRoots: string[];
    },
  ) {
    if (!isPathWithinAllowedRoots(config.mailboxDir, config.allowedRoots)) {
      throw new Error(`Mailbox directory outside allowed_root_paths: ${config.mailboxDir}`);
    }
  }

  async healthCheck() {
    return { healthy: fs.existsSync(this.config.mailboxDir), detail: `Mailbox: ${this.config.mailboxDir}` };
  }

  async executeTask(payload: AgentTaskPayload) {
    const inbox = path.join(this.config.mailboxDir, 'inbox');
    fs.mkdirSync(inbox, { recursive: true });
    const file = path.join(inbox, `${payload.taskId}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    return { summary: `Task written to mailbox: ${file}`, producedFiles: [] };
  }

  async sendMessage(message: { conversationId: string; fromLabel: string; content: string }) {
    const inbox = path.join(this.config.mailboxDir, 'inbox');
    fs.mkdirSync(inbox, { recursive: true });
    const file = path.join(inbox, `msg-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(message, null, 2), 'utf8');
    return { reply: `Mensaje depositado en buzón ${file}` };
  }
}
