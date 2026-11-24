export type MachineStatus =
  | 'connected'
  | 'disconnected'
  | 'busy'
  | 'idle'
  | 'error'
  | 'reconnecting'
  | 'revoked';

export type AgentStatus =
  | 'online'
  | 'busy'
  | 'idle'
  | 'offline'
  | 'disabled'
  | 'error'
  | 'revoked';

export type AdapterType =
  | 'cli-subprocess'
  | 'local-http'
  | 'mcp-client'
  | 'local-ws'
  | 'file-mailbox';

export type TaskStatus =
  | 'draft'
  | 'pending_dependencies'
  | 'queued'
  | 'dispatched'
  | 'running'
  | 'waiting_approval'
  | 'paused'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type WorkspaceCategory =
  | 'software'
  | 'research'
  | 'automation'
  | 'marketing'
  | 'data'
  | 'operations'
  | 'other';

export interface OpsMachine {
  id: string;
  custom_name: string;
  machine_fingerprint: string | null;
  os_type: 'windows' | 'macos' | 'linux' | 'unknown';
  os_version: string | null;
  arch: string | null;
  status: MachineStatus;
  capabilities: string[];
  allowed_root_paths: string[];
  resource_snapshot: {
    cpu_percent?: number;
    ram_used_mb?: number;
    ram_total_mb?: number;
    disk_free_gb?: number;
  };
  last_error: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsAgent {
  id: string;
  machine_id: string;
  name: string;
  slug: string;
  specialty: string;
  description: string;
  adapter_type: AdapterType;
  adapter_config: Record<string, unknown>;
  tools: string[];
  capabilities: string[];
  status: AgentStatus;
  is_enabled: boolean;
  max_concurrency: number;
  created_at: string;
  updated_at: string;
}

export interface OpsWorkspace {
  id: string;
  name: string;
  slug: string;
  domain_category: WorkspaceCategory;
  description: string;
  system_instructions: string;
  shared_context: string;
  participation_rules: {
    require_human_approval_for_shell?: boolean;
    allow_inter_agent_comms?: boolean;
    max_parallel_tasks?: number;
  };
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpsConversation {
  id: string;
  workspace_id: string;
  title: string;
  kind: 'direct_human_agent' | 'peer_agent_agent' | 'group' | 'broadcast';
  created_by_type: 'human' | 'agent' | 'system';
  created_by_agent_id: string | null;
  created_at: string;
}

export interface OpsMessage {
  id: string;
  seq: number;
  workspace_id: string;
  conversation_id: string;
  sender_type: 'human' | 'agent' | 'system';
  sender_agent_id: string | null;
  target_agent_id: string | null;
  message_type:
    | 'instruction'
    | 'response'
    | 'info_request'
    | 'context_handoff'
    | 'status_update'
    | 'file_share'
    | 'system_alert';
  content: string;
  metadata: Record<string, unknown>;
  artifact_ids: string[];
  correlation_id: string | null;
  delivery_status: 'persisted' | 'dispatched' | 'delivered' | 'acknowledged' | 'failed';
  created_at: string;
}

export interface OpsWorkflow {
  id: string;
  workspace_id: string;
  title: string;
  goal: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface OpsTask {
  id: string;
  seq: number;
  workspace_id: string;
  workflow_id: string | null;
  assigned_agent_id: string;
  title: string;
  instructions: string;
  priority: TaskPriority;
  status: TaskStatus;
  requires_human_approval: boolean;
  max_retries: number;
  retry_count: number;
  timeout_seconds: number;
  input_context: Record<string, unknown>;
  output_summary: string | null;
  output_artifact_ids: string[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsApprovalRequest {
  id: string;
  workspace_id: string;
  task_id: string;
  machine_id: string;
  agent_id: string;
  risk_level: 'medium' | 'high' | 'critical';
  action_type: string;
  action_summary: string;
  action_payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface OpsArtifact {
  id: string;
  workspace_id: string;
  task_id: string | null;
  author_type: 'human' | 'agent' | 'system';
  author_agent_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  storage_path: string;
  origin_kind: 'code' | 'document' | 'image' | 'log' | 'execution_result' | 'other';
  created_at: string;
}

export interface OpsActivityEvent {
  id: string;
  seq: number;
  workspace_id: string | null;
  machine_id: string | null;
  agent_id: string | null;
  task_id: string | null;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OpsAuditLog {
  id: string;
  actor_type: 'admin' | 'connector' | 'agent' | 'system';
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface OpsOverviewResponse {
  machines: OpsMachine[];
  agents: OpsAgent[];
  workspaces: OpsWorkspace[];
  tasks: OpsTask[];
  approvals: OpsApprovalRequest[];
  events: OpsActivityEvent[];
  auditLogs: OpsAuditLog[];
}
