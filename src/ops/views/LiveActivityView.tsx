import React from 'react';
import { Activity } from 'lucide-react';
import { OpsActivityEvent, OpsAgent, OpsMachine, OpsTask } from '../types/ops';

interface LiveActivityViewProps {
  machines: OpsMachine[];
  agents: OpsAgent[];
  tasks: OpsTask[];
  events: OpsActivityEvent[];
}

export const LiveActivityView: React.FC<LiveActivityViewProps> = ({
  machines,
  agents,
  tasks,
  events,
}) => {
  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'waiting_approval');

  return (
    <div className="ops-stack">
      <div className="ops-panel">
        <div className="ops-panel-head">
          <strong><Activity size={16} /> Ejecuciones Activas ({activeTasks.length})</strong>
        </div>
        {activeTasks.length === 0 ? (
          <p className="ops-empty">Ningún agente está ejecutando una tarea en este instante.</p>
        ) : (
          <div className="ops-list">
            {activeTasks.map((t) => {
              const ag = agents.find((a) => a.id === t.assigned_agent_id);
              const mc = machines.find((m) => m.id === ag?.machine_id);
              return (
                <div key={t.id} className="ops-list-row">
                  <div>
                    <span className={`ops-status-pill ${t.status}`}>{t.status}</span>
                    <strong>{t.title}</strong>
                    <span className="ops-muted"> · {ag?.name} ({mc?.custom_name})</span>
                  </div>
                  <code>{t.started_at ? new Date(t.started_at).toLocaleTimeString() : 'Pendiente'}</code>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ops-panel">
        <div className="ops-panel-head"><strong>Stream Cronológico en Tiempo Real</strong></div>
        <div className="ops-list">
          {events.map((ev) => (
            <div key={ev.id} className="ops-list-row">
              <div>
                <span className={`ops-sev ${ev.severity}`}>{ev.severity}</span>
                <code>{ev.event_type}</code>
                <span> {ev.summary}</span>
              </div>
              <time>{new Date(ev.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
