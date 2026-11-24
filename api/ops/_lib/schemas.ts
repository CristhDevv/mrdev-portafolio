import { z } from 'zod';

export const createMachineSchema = z.object({
  custom_name: z.string().trim().min(2).max(80),
  os_type: z.enum(['windows', 'macos', 'linux', 'unknown']).default('unknown'),
  allowed_root_paths: z.array(z.string().trim().min(1)).max(20).default([]),
});

export const pairConnectorSchema = z.object({
  otp_token: z.string().trim().min(12),
  public_key_ed25519: z.string().trim().min(20),
  machine_fingerprint: z.string().trim().min(8).max(200),
  os_info: z.object({
    os_type: z.enum(['windows', 'macos', 'linux', 'unknown']),
    os_version: z.string().max(80).optional(),
    arch: z.string().max(40).optional(),
  }),
  discovered_agents: z
    .array(
      z.object({
        slug: z.string().trim().min(2).max(60),
        name: z.string().trim().min(2).max(80),
        specialty: z.string().trim().max(120).default('General'),
        adapter_type: z.enum(['cli-subprocess', 'local-http', 'mcp-client', 'local-ws', 'file-mailbox']),
        capabilities: z.array(z.string()).default([]),
        tools: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const heartbeatSchema = z.object({
  machine_status: z.enum(['connected', 'idle', 'busy', 'error']).default('idle'),
  resources: z
    .object({
      cpu_percent: z.number().min(0).max(100).optional(),
      ram_used_mb: z.number().min(0).optional(),
      ram_total_mb: z.number().min(0).optional(),
      disk_free_gb: z.number().min(0).optional(),
    })
    .default({}),
  agents: z
    .array(
      z.object({
        agent_id: z.string().uuid(),
        status: z.enum(['online', 'busy', 'idle', 'offline', 'error']),
      }),
    )
    .default([]),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  domain_category: z.enum(['software', 'research', 'automation', 'marketing', 'data', 'operations', 'other']),
  description: z.string().max(500).default(''),
  system_instructions: z.string().max(4000).default(''),
  agent_ids: z.array(z.string().uuid()).default([]),
});

export const createMessageSchema = z.object({
  workspace_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  target_agent_id: z.string().uuid().nullable().optional(),
  message_type: z
    .enum(['instruction', 'response', 'info_request', 'context_handoff', 'status_update', 'file_share', 'system_alert'])
    .default('instruction'),
  content: z.string().trim().min(1).max(20000),
  artifact_ids: z.array(z.string().uuid()).max(20).default([]),
  idempotency_key: z.string().trim().min(8).max(100).optional(),
});

export const createWorkflowSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  goal: z.string().max(2000).default(''),
  tasks: z
    .array(
      z.object({
        temp_key: z.string().trim().min(1).max(60),
        assigned_agent_id: z.string().uuid(),
        title: z.string().trim().min(2).max(140),
        instructions: z.string().trim().min(2).max(8000),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        requires_human_approval: z.boolean().default(false),
        depends_on_keys: z.array(z.string()).default([]),
      }),
    )
    .min(1)
    .max(30),
});

export const artifactUploadSchema = z.object({
  workspace_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  filename: z.string().trim().min(1).max(180),
  mime_type: z.string().trim().min(3).max(120),
  size_bytes: z.number().int().min(1).max(25 * 1024 * 1024),
  sha256: z.string().trim().length(64),
  origin_kind: z.enum(['code', 'document', 'image', 'log', 'execution_result', 'other']).default('document'),
});
