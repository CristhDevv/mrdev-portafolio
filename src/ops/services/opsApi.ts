import {
  OpsAgent,
  OpsApprovalRequest,
  OpsArtifact,
  OpsConversation,
  OpsMessage,
  OpsOverviewResponse,
  OpsWorkflow,
  OpsWorkspace,
} from '../types/ops';
import { getOpsSupabaseClient } from './supabaseClient';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getOpsSupabaseClient();
  if (!supabase) throw new Error('Supabase no configurado en variables de entorno');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesión no iniciada');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { message?: string; error?: string }).message ?? (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const opsApi = {
  getOverview: () => apiRequest<OpsOverviewResponse>('/api/ops/overview'),

  createMachine: (payload: { custom_name: string; os_type: string; allowed_root_paths: string[] }) =>
    apiRequest<{
      machine: unknown;
      pairing: { otp_token: string; expires_at: string; cli_command: string };
    }>('/api/ops/machines', { method: 'POST', body: JSON.stringify(payload) }),

  rotatePairingToken: (machineId: string) =>
    apiRequest<{ otp_token: string; expires_at: string; cli_command: string }>(
      `/api/ops/machines/${machineId}/pairing-token`,
      { method: 'POST', body: '{}' },
    ),

  revokeMachine: (machineId: string, reason: string) =>
    apiRequest<{ ok: boolean }>(`/api/ops/machines/${machineId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  registerAgent: (payload: Record<string, unknown>) =>
    apiRequest<{ agent: OpsAgent }>('/api/ops/agents', { method: 'POST', body: JSON.stringify(payload) }),

  updateAgent: (agentId: string, payload: Record<string, unknown>) =>
    apiRequest<{ agent: OpsAgent }>(`/api/ops/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createWorkspace: (payload: Record<string, unknown>) =>
    apiRequest<{ workspace: OpsWorkspace }>('/api/ops/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getConversations: (workspaceId?: string) =>
    apiRequest<{ conversations: OpsConversation[] }>(
      workspaceId ? `/api/ops/conversations?workspace_id=${workspaceId}` : '/api/ops/conversations',
    ),

  createConversation: (payload: Record<string, unknown>) =>
    apiRequest<{ conversation: OpsConversation }>('/api/ops/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMessages: (conversationId: string) =>
    apiRequest<{ messages: OpsMessage[] }>(`/api/ops/messages?conversation_id=${conversationId}`),

  sendMessage: (payload: Record<string, unknown>) =>
    apiRequest<{ message: OpsMessage }>('/api/ops/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createWorkflow: (payload: Record<string, unknown>) =>
    apiRequest<{ workflow: OpsWorkflow }>('/api/ops/workflows', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  controlTask: (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') =>
    apiRequest<{ task: unknown }>(`/api/ops/tasks/${taskId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  decideApproval: (approvalId: string, decision: 'approved' | 'rejected', note?: string) =>
    apiRequest<{ approval: OpsApprovalRequest }>(`/api/ops/approvals/${approvalId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    }),

  getArtifactDownloadUrl: (artifactId: string) =>
    apiRequest<{ artifact: OpsArtifact; download_url: string }>(`/api/ops/artifacts/${artifactId}/download-url`),
};
