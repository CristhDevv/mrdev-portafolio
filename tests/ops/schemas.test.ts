import assert from 'node:assert/strict';
import test from 'node:test';
import {
  artifactUploadSchema,
  createMachineSchema,
  createMessageSchema,
  createWorkflowSchema,
  createWorkspaceSchema,
  heartbeatSchema,
  pairConnectorSchema,
} from '../../api/ops/_lib/schemas.js';

test('createMachineSchema validates valid payload and rejects empty name', () => {
  const ok = createMachineSchema.safeParse({
    custom_name: 'cris1',
    os_type: 'windows',
    allowed_root_paths: ['C:\\Users\\USER\\Desktop\\workspace'],
  });
  assert.equal(ok.success, true);

  const bad = createMachineSchema.safeParse({ custom_name: 'x', os_type: 'windows' });
  assert.equal(bad.success, false);
});

test('pairConnectorSchema validates OTP + Ed25519 key + discovered agents', () => {
  const ok = pairConnectorSchema.safeParse({
    otp_token: 'mrpair_1234567890abcdef',
    public_key_ed25519: 'MCowBQYDK2VwAyEA1234567890abcdef',
    machine_fingerprint: 'sha256:abcdef123456',
    os_info: { os_type: 'windows', os_version: '11', arch: 'x64' },
    discovered_agents: [
      { slug: 'dev-agent', name: 'Dev Agent', adapter_type: 'cli-subprocess', capabilities: ['code'] },
    ],
  });
  assert.equal(ok.success, true);
});

test('heartbeatSchema validates machine resources and agent statuses', () => {
  const ok = heartbeatSchema.safeParse({
    machine_status: 'idle',
    resources: { cpu_percent: 12.5, ram_used_mb: 4096, ram_total_mb: 16384 },
    agents: [{ agent_id: '550e8400-e29b-41d4-a716-446655440000', status: 'online' }],
  });
  assert.equal(ok.success, true);
});

test('createWorkspaceSchema, createMessageSchema, createWorkflowSchema, artifactUploadSchema validate strictly', () => {
  const wsId = '550e8400-e29b-41d4-a716-446655440000';
  const convId = '550e8400-e29b-41d4-a716-446655440001';
  const agentId = '550e8400-e29b-41d4-a716-446655440002';

  assert.equal(
    createWorkspaceSchema.safeParse({ name: 'Desarrollo', domain_category: 'software', agent_ids: [agentId] }).success,
    true,
  );
  assert.equal(
    createMessageSchema.safeParse({
      workspace_id: wsId,
      conversation_id: convId,
      target_agent_id: agentId,
      content: 'Analiza el módulo POS',
    }).success,
    true,
  );
  assert.equal(
    createWorkflowSchema.safeParse({
      workspace_id: wsId,
      title: 'Pipeline',
      tasks: [{ temp_key: 'step-1', assigned_agent_id: agentId, title: 'T1', instructions: 'Haz T1' }],
    }).success,
    true,
  );
  assert.equal(
    artifactUploadSchema.safeParse({
      workspace_id: wsId,
      filename: 'report.md',
      mime_type: 'text/markdown',
      size_bytes: 1024,
      sha256: 'a'.repeat(64),
    }).success,
    true,
  );
  // Reject >25MB artifacts
  assert.equal(
    artifactUploadSchema.safeParse({
      workspace_id: wsId,
      filename: 'huge.bin',
      mime_type: 'application/octet-stream',
      size_bytes: 30 * 1024 * 1024,
      sha256: 'a'.repeat(64),
    }).success,
    false,
  );
});
