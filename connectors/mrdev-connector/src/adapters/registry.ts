import { CliSubprocessAdapter } from './cliSubprocessAdapter.js';
import { FileMailboxAdapter } from './fileMailboxAdapter.js';
import { LocalHttpAdapter } from './localHttpAdapter.js';
import { LocalWsAdapter } from './localWsAdapter.js';
import { McpClientAdapter } from './mcpClientAdapter.js';
import { AdapterType, AgentRuntimeAdapter } from './types.js';

export interface LocalAgentDefinition {
  slug: string;
  name: string;
  specialty?: string;
  adapter_type: AdapterType;
  capabilities?: string[];
  tools?: string[];
  command?: string;
  args?: string[];
  endpoint?: string;
  wsUrl?: string;
  mailboxDir?: string;
  toolName?: string;
}

export function createAdapter(def: LocalAgentDefinition, allowedRoots: string[]): AgentRuntimeAdapter {
  switch (def.adapter_type) {
    case 'cli-subprocess':
      return new CliSubprocessAdapter({
        command: def.command ?? 'node',
        args: def.args,
        allowedRoots,
      });
    case 'local-http':
      return new LocalHttpAdapter(def.endpoint ?? 'http://127.0.0.1:8787/task');
    case 'mcp-client':
      return new McpClientAdapter({
        command: def.command ?? 'npx',
        args: def.args,
        toolName: def.toolName,
      });
    case 'local-ws':
      return new LocalWsAdapter(def.wsUrl ?? 'ws://127.0.0.1:8788');
    case 'file-mailbox':
      return new FileMailboxAdapter({
        mailboxDir: def.mailboxDir ?? allowedRoots[0] ?? process.cwd(),
        allowedRoots,
      });
  }
}
