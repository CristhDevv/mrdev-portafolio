import type { VercelRequest, VercelResponse } from '@vercel/node';
import agentsIdHandler from './_handlers/agents/[id].js';
import agentsHandler from './_handlers/agents/index.js';
import approvalDecisionHandler from './_handlers/approvals/[id]/decision.js';
import artifactDownloadHandler from './_handlers/artifacts/[id]/download-url.js';
import artifactUploadHandler from './_handlers/artifacts/upload-url.js';
import connectorHeartbeatHandler from './_handlers/connector/heartbeat.js';
import connectorMessagesHandler from './_handlers/connector/messages.js';
import connectorPairHandler from './_handlers/connector/pair.js';
import connectorSyncHandler from './_handlers/connector/sync.js';
import connectorTaskClaimHandler from './_handlers/connector/tasks/[id]/claim.js';
import connectorTaskCompleteHandler from './_handlers/connector/tasks/[id]/complete.js';
import connectorTaskFailHandler from './_handlers/connector/tasks/[id]/fail.js';
import connectorTaskApprovalHandler from './_handlers/connector/tasks/[id]/request-approval.js';
import conversationsHandler from './_handlers/conversations/index.js';
import machinesPairingHandler from './_handlers/machines/[id]/pairing-token.js';
import machinesRevokeHandler from './_handlers/machines/[id]/revoke.js';
import machinesHandler from './_handlers/machines/index.js';
import messagesHandler from './_handlers/messages/index.js';
import overviewHandler from './_handlers/overview.js';
import taskControlHandler from './_handlers/tasks/[id]/control.js';
import workflowsHandler from './_handlers/workflows/index.js';
import workspaceMembersHandler from './_handlers/workspaces/[id]/members.js';
import workspacesHandler from './_handlers/workspaces/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = (req.url ?? '/').split('?')[0];
  const subPath = rawUrl.replace(/^\/api\/ops\/?/, '').replace(/\/+$/, '');

  // Static routes
  if (subPath === 'overview') return overviewHandler(req, res);
  if (subPath === 'machines') return machinesHandler(req, res);
  if (subPath === 'agents') return agentsHandler(req, res);
  if (subPath === 'workspaces') return workspacesHandler(req, res);
  if (subPath === 'conversations') return conversationsHandler(req, res);
  if (subPath === 'messages') return messagesHandler(req, res);
  if (subPath === 'workflows') return workflowsHandler(req, res);
  if (subPath === 'artifacts/upload-url') return artifactUploadHandler(req, res);
  if (subPath === 'connector/pair') return connectorPairHandler(req, res);
  if (subPath === 'connector/heartbeat') return connectorHeartbeatHandler(req, res);
  if (subPath === 'connector/sync') return connectorSyncHandler(req, res);
  if (subPath === 'connector/messages') return connectorMessagesHandler(req, res);

  // Dynamic routes
  let m = subPath.match(/^machines\/([^/]+)\/pairing-token$/);
  if (m) {
    req.query.id = m[1];
    return machinesPairingHandler(req, res);
  }

  m = subPath.match(/^machines\/([^/]+)\/revoke$/);
  if (m) {
    req.query.id = m[1];
    return machinesRevokeHandler(req, res);
  }

  m = subPath.match(/^agents\/([^/]+)$/);
  if (m) {
    req.query.id = m[1];
    return agentsIdHandler(req, res);
  }

  m = subPath.match(/^workspaces\/([^/]+)\/members$/);
  if (m) {
    req.query.id = m[1];
    return workspaceMembersHandler(req, res);
  }

  m = subPath.match(/^tasks\/([^/]+)\/control$/);
  if (m) {
    req.query.id = m[1];
    return taskControlHandler(req, res);
  }

  m = subPath.match(/^approvals\/([^/]+)\/decision$/);
  if (m) {
    req.query.id = m[1];
    return approvalDecisionHandler(req, res);
  }

  m = subPath.match(/^artifacts\/([^/]+)\/download-url$/);
  if (m) {
    req.query.id = m[1];
    return artifactDownloadHandler(req, res);
  }

  m = subPath.match(/^connector\/tasks\/([^/]+)\/claim$/);
  if (m) {
    req.query.id = m[1];
    return connectorTaskClaimHandler(req, res);
  }

  m = subPath.match(/^connector\/tasks\/([^/]+)\/request-approval$/);
  if (m) {
    req.query.id = m[1];
    return connectorTaskApprovalHandler(req, res);
  }

  m = subPath.match(/^connector\/tasks\/([^/]+)\/complete$/);
  if (m) {
    req.query.id = m[1];
    return connectorTaskCompleteHandler(req, res);
  }

  m = subPath.match(/^connector\/tasks\/([^/]+)\/fail$/);
  if (m) {
    req.query.id = m[1];
    return connectorTaskFailHandler(req, res);
  }

  return res.status(404).json({ error: 'OPS_ROUTE_NOT_FOUND', path: subPath });
}
