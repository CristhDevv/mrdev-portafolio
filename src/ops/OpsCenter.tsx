import React, { useCallback, useEffect, useState } from 'react';
import './ops.css';
import { OpsLayout, OpsTab } from './components/OpsLayout';
import { OpsLoginGate } from './components/OpsLoginGate';
import { PairingModal } from './components/PairingModal';
import { useOpsAuth } from './hooks/useOpsAuth';
import { useOpsRealtime } from './hooks/useOpsRealtime';
import { opsApi } from './services/opsApi';
import { OpsOverviewResponse } from './types/ops';
import { AgentsView } from './views/AgentsView';
import { ArtifactsView } from './views/ArtifactsView';
import { CommsView } from './views/CommsView';
import { GuideView } from './views/GuideView';
import { HistoryView } from './views/HistoryView';
import { LiveActivityView } from './views/LiveActivityView';
import { MachinesView } from './views/MachinesView';
import { OrchestratorView } from './views/OrchestratorView';
import { OverviewView } from './views/OverviewView';
import { SecurityView } from './views/SecurityView';
import { WorkspacesView } from './views/WorkspacesView';

interface OpsCenterProps {
  onExitOps: () => void;
}

const EMPTY_OVERVIEW: OpsOverviewResponse = {
  machines: [],
  agents: [],
  workspaces: [],
  tasks: [],
  approvals: [],
  events: [],
  auditLogs: [],
};

export const OpsCenter: React.FC<OpsCenterProps> = ({ onExitOps }) => {
  const { configured, loading, userEmail, error, signIn, signOut } = useOpsAuth();
  const [activeTab, setActiveTab] = useState<OpsTab>('overview');
  const [overview, setOverview] = useState<OpsOverviewResponse>(EMPTY_OVERVIEW);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pairingInfo, setPairingInfo] = useState<{
    otp_token: string;
    expires_at: string;
    cli_command: string;
  } | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!userEmail) return;
    try {
      setApiError(null);
      const data = await opsApi.getOverview();
      setOverview(data);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error cargando Ops Center');
    }
  }, [userEmail]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useOpsRealtime(Boolean(userEmail), fetchOverview);

  if (loading) {
    return (
      <div className="ops-login-wrap">
        <div className="ops-login-card">Verificando sesión segura...</div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <OpsLoginGate
        configured={configured}
        error={error}
        onSignIn={signIn}
        onExitOps={onExitOps}
      />
    );
  }

  const pendingApprovalsCount = overview.approvals.filter((a) => a.status === 'pending').length;

  return (
    <>
      <OpsLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userEmail={userEmail}
        pendingApprovalsCount={pendingApprovalsCount}
        onRefresh={fetchOverview}
        onSignOut={signOut}
        onExitOps={onExitOps}
      >
        {apiError && <div className="ops-error-box">{apiError}</div>}

        {activeTab === 'overview' && (
          <OverviewView
            data={overview}
            onDecideApproval={async (id, decision) => {
              await opsApi.decideApproval(id, decision);
              await fetchOverview();
            }}
          />
        )}
        {activeTab === 'guide' && <GuideView />}
        {activeTab === 'machines' && (
          <MachinesView
            machines={overview.machines}
            onShowPairing={setPairingInfo}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'agents' && (
          <AgentsView
            agents={overview.agents}
            machines={overview.machines}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'workspaces' && (
          <WorkspacesView
            workspaces={overview.workspaces}
            agents={overview.agents}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'comms' && (
          <CommsView workspaces={overview.workspaces} agents={overview.agents} />
        )}
        {activeTab === 'orchestrator' && (
          <OrchestratorView
            workspaces={overview.workspaces}
            agents={overview.agents}
            tasks={overview.tasks}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'live' && (
          <LiveActivityView
            machines={overview.machines}
            agents={overview.agents}
            tasks={overview.tasks}
            events={overview.events}
          />
        )}
        {activeTab === 'artifacts' && <ArtifactsView tasks={overview.tasks} />}
        {activeTab === 'history' && <HistoryView events={overview.events} />}
        {activeTab === 'security' && <SecurityView auditLogs={overview.auditLogs} />}
      </OpsLayout>

      <PairingModal pairing={pairingInfo} onClose={() => setPairingInfo(null)} />
    </>
  );
};

export default OpsCenter;
