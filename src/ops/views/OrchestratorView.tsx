import React, { useState } from 'react';
import { GitBranch, Pause, Play, Plus, RotateCw, Trash2, XCircle } from 'lucide-react';
import { opsApi } from '../services/opsApi';
import { OpsAgent, OpsTask, OpsWorkspace, TaskPriority } from '../types/ops';

interface OrchestratorViewProps {
  workspaces: OpsWorkspace[];
  agents: OpsAgent[];
  tasks: OpsTask[];
  onRefresh: () => void;
}

interface DraftNode {
  temp_key: string;
  title: string;
  assigned_agent_id: string;
  instructions: string;
  priority: TaskPriority;
  requires_human_approval: boolean;
  depends_on_keys: string[];
}

export const OrchestratorView: React.FC<OrchestratorViewProps> = ({
  workspaces,
  agents,
  tasks,
  onRefresh,
}) => {
  const [wsId, setWsId] = useState(workspaces[0]?.id ?? '');
  const [wfTitle, setWfTitle] = useState('');
  const [nodes, setNodes] = useState<DraftNode[]>([
    {
      temp_key: 'step-1',
      title: 'Análisis inicial',
      assigned_agent_id: agents[0]?.id ?? '',
      instructions: '',
      priority: 'normal',
      requires_human_approval: false,
      depends_on_keys: [],
    },
  ]);
  const [err, setErr] = useState<string | null>(null);

  const addNode = () => {
    const idx = nodes.length + 1;
    const prevKey = nodes[nodes.length - 1]?.temp_key;
    setNodes((prev) => [
      ...prev,
      {
        temp_key: `step-${idx}`,
        title: `Paso ${idx}`,
        assigned_agent_id: agents[0]?.id ?? '',
        instructions: '',
        priority: 'normal',
        requires_human_approval: false,
        depends_on_keys: prevKey ? [prevKey] : [],
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await opsApi.createWorkflow({
        workspace_id: wsId || workspaces[0]?.id,
        title: wfTitle,
        tasks: nodes.map((n) => ({
          ...n,
          assigned_agent_id: n.assigned_agent_id || agents[0]?.id,
        })),
      });
      setWfTitle('');
      onRefresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Error creando workflow');
    }
  };

  return (
    <div className="ops-stack">
      <form className="ops-panel ops-form-col" onSubmit={handleSubmit}>
        <div className="ops-panel-head">
          <strong><GitBranch size={16} /> Nuevo Flujo DAG Multiagente</strong>
          <button type="button" className="ops-ghost-btn" onClick={addNode}>
            <Plus size={14} /> Añadir Paso
          </button>
        </div>

        <div className="ops-form-row">
          <select value={wsId || workspaces[0]?.id || ''} onChange={(e) => setWsId(e.target.value)}>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Título del Workflow (ej. Nueva funcionalidad ERP)"
            value={wfTitle}
            onChange={(e) => setWfTitle(e.target.value)}
          />
          <button
            type="submit"
            className="ops-primary-btn"
            disabled={workspaces.length === 0 || agents.length === 0}
          >
            Lanzar Orquestación
          </button>
        </div>

        {err && <div className="ops-error-box">{err}</div>}

        <div className="ops-dag-list">
          {nodes.map((node, idx) => (
            <div key={node.temp_key} className="ops-dag-node">
              <div className="ops-form-row">
                <code>{node.temp_key}</code>
                <input
                  type="text"
                  required
                  placeholder="Título de tarea"
                  value={node.title}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
                <select
                  value={node.assigned_agent_id || agents[0]?.id || ''}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, assigned_agent_id: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <label className="ops-check">
                  <input
                    type="checkbox"
                    checked={node.requires_human_approval}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, requires_human_approval: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  Aprobación Humana
                </label>
                {nodes.length > 1 && (
                  <button
                    type="button"
                    className="ops-ghost-btn danger"
                    onClick={() => setNodes((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                required
                placeholder="Instrucciones específicas para este agente..."
                value={node.instructions}
                onChange={(e) =>
                  setNodes((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, instructions: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}
        </div>
      </form>

      <div className="ops-panel">
        <div className="ops-panel-head"><strong>Cola y Estado de Tareas</strong></div>
        <div className="ops-list">
          {tasks.length === 0 ? (
            <p className="ops-empty">Sin tareas creadas aún.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="ops-list-row">
                <div>
                  <span className={`ops-status-pill ${t.status}`}>{t.status}</span>
                  <strong>{t.title}</strong>
                  {t.output_summary && <p className="ops-muted">{t.output_summary}</p>}
                </div>
                <div className="ops-row-actions">
                  {t.status === 'running' || t.status === 'queued' ? (
                    <button
                      type="button"
                      className="ops-ghost-btn"
                      onClick={async () => {
                        await opsApi.controlTask(t.id, 'pause');
                        onRefresh();
                      }}
                    >
                      <Pause size={13} />
                    </button>
                  ) : null}
                  {t.status === 'paused' ? (
                    <button
                      type="button"
                      className="ops-ghost-btn"
                      onClick={async () => {
                        await opsApi.controlTask(t.id, 'resume');
                        onRefresh();
                      }}
                    >
                      <Play size={13} />
                    </button>
                  ) : null}
                  {t.status === 'failed' ? (
                    <button
                      type="button"
                      className="ops-ghost-btn"
                      onClick={async () => {
                        await opsApi.controlTask(t.id, 'retry');
                        onRefresh();
                      }}
                    >
                      <RotateCw size={13} />
                    </button>
                  ) : null}
                  {t.status !== 'completed' && t.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="ops-ghost-btn danger"
                      onClick={async () => {
                        await opsApi.controlTask(t.id, 'cancel');
                        onRefresh();
                      }}
                    >
                      <XCircle size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
