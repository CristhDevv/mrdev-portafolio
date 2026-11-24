import React from 'react';
import { Activity, AlertTriangle, Bot, Monitor, ShieldCheck } from 'lucide-react';
import { OpsOverviewResponse } from '../types/ops';

interface OverviewViewProps {
  data: OpsOverviewResponse;
  onDecideApproval: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, onDecideApproval }) => {
  const connectedMachines = data.machines.filter((m) => m.status === 'connected' || m.status === 'idle' || m.status === 'busy').length;
  const activeAgents = data.agents.filter((a) => a.is_enabled && a.status !== 'offline' && a.status !== 'revoked').length;
  const runningTasks = data.tasks.filter((t) => t.status === 'running' || t.status === 'queued').length;
  const pendingApprovals = data.approvals.filter((a) => a.status === 'pending');

  return (
    <div className="ops-stack">
      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <Monitor size={18} />
          <span>Máquinas Conectadas</span>
          <strong>{connectedMachines} / {data.machines.length}</strong>
        </div>
        <div className="ops-kpi-card">
          <Bot size={18} />
          <span>Agentes Activos</span>
          <strong>{activeAgents} / {data.agents.length}</strong>
        </div>
        <div className="ops-kpi-card">
          <Activity size={18} />
          <span>Tareas en Curso / Cola</span>
          <strong>{runningTasks}</strong>
        </div>
        <div className="ops-kpi-card">
          <ShieldCheck size={18} />
          <span>Aprobaciones Pendientes</span>
          <strong>{pendingApprovals.length}</strong>
        </div>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="ops-panel warning">
          <div className="ops-panel-head">
            <AlertTriangle size={16} /> <strong>Solicitudes de Aprobación Humana</strong>
          </div>
          <div className="ops-list">
            {pendingApprovals.map((app) => (
              <div key={app.id} className="ops-list-row">
                <div>
                  <span className="ops-risk-pill">{app.risk_level.toUpperCase()}</span>
                  <strong>{app.action_summary}</strong>
                </div>
                <div className="ops-row-actions">
                  <button
                    type="button"
                    className="ops-primary-btn sm"
                    onClick={() => onDecideApproval(app.id, 'approved')}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="ops-danger-btn sm"
                    onClick={() => onDecideApproval(app.id, 'rejected')}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ops-panel">
        <div className="ops-panel-head">
          <strong>Últimos Eventos del Ecosistema</strong>
        </div>
        {data.events.length === 0 ? (
          <p className="ops-empty">Aún no hay eventos registrados. Registra una máquina para comenzar.</p>
        ) : (
          <div className="ops-list">
            {data.events.slice(0, 12).map((ev) => (
              <div key={ev.id} className="ops-list-row">
                <div>
                  <span className={`ops-sev ${ev.severity}`}>{ev.severity}</span>
                  <span>{ev.summary}</span>
                </div>
                <time>{new Date(ev.created_at).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
