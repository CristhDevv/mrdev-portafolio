export type AdapterType =
  | 'cli-subprocess'
  | 'local-http'
  | 'mcp-client'
  | 'local-ws'
  | 'file-mailbox';

export interface AgentTaskPayload {
  taskId: string;
  workspaceId: string;
  correlationId: string;
  systemDirective: string;
  untrustedInputs: {
    fromAgents: Array<{ agentName: string; summary: string }>;
    artifacts: Array<{ artifactId: string; filename: string; localPath: string }>;
  };
  workingDirectory: string;
  timeoutSeconds: number;
}

export interface AgentRuntimeAdapter {
  readonly type: AdapterType;
  healthCheck(): Promise<{ healthy: boolean; detail?: string }>;
  executeTask(
    payload: AgentTaskPayload,
    hooks: {
      onStreamChunk: (chunk: string) => void;
    },
    abortSignal: AbortSignal,
  ): Promise<{ summary: string; producedFiles: string[] }>;
  sendMessage(message: {
    conversationId: string;
    fromLabel: string;
    content: string;
    isUntrustedPeer: boolean;
  }): Promise<{ reply?: string }>;
}
