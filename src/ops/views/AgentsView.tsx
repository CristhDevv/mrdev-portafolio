import React, { useState } from 'react';
import { Bot, Plus, Power } from 'lucide-react';
import { opsApi } from '../services/opsApi';
import { AdapterType, OpsAgent, OpsMachine } from '../types/ops';

interface AgentsViewProps {
  agents: OpsAgent[];
  machines: OpsMachine[];
  onRefresh: () => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, machines, onRefresh }) => {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Desarrollador Full-Stack');
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '');
  const [adapterType, setAdapterType] = useState<AdapterType>('cli-subprocess');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId && !machines[0]?.id) return;
    await opsApi.registerAgent({
      machine_id: machineId || machines[0].id,
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      specialty,
      adapter_type: adapterType,
    });
    setName('');
    onRefresh();
  };

  return (
    <div className="ops-stack">
      <form className="ops-panel ops-form-row" onSubmit={handleCreate}>
        <input
          type="text"
          required
          placeholder="Nombre del agente (ej. Agente Arquitecto)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Especialidad"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        />
        <select value={machineId || machines[0]?.id || ''} onChange={(e) => setMachineId(e.target.value)}>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.custom_name}</option>
          ))}
        </select>
        <select value={adapterType} onChange={(e) => setAdapterType(e.target.value as AdapterType)}>
          <option value="cli-subprocess">CLI Subprocess</option>
          <option value="local-http">HTTP Local (127.0.0.1)</option>
          <option value="mcp-client">MCP Client</option>
          <option value="local-ws">WebSocket Local</option>
          <option value="file-mailbox">File Mailbox</option>
        </select>
        <button type="submit" className="ops-primary-btn" disabled={machines.length === 0}>
          <Plus size={15} /> Registrar Agente
        </button>
      </form>

      <div className="ops-cards-grid">
        {agents.length === 0 ? (
          <div className="ops-panel"><p className="ops-empty">No hay agentes registrados.</p></div>
        ) : (
          agents.map((ag) => {
            const host = machines.find((m) => m.id === ag.machine_id);
            return (
              <div key={ag.id} className="ops-entity-card">
                <div className="ops-entity-head">
                  <div>
                    <span className={`ops-status-pill ${ag.status}`}>{ag.status}</span>
                    <h3><Bot size={15} /> {ag.name}</h3>
                  </div>
                  <code>{ag.adapter_type}</code>
                </div>
                <p className="ops-muted">{ag.specialty} · Máquina: {host?.custom_name ?? ag.machine_id.slice(0, 8)}</p>
                <div className="ops-row-actions">
                  <button
                    type="button"
                    className="ops-ghost-btn"
                    onClick={async () => {
                      await opsApi.updateAgent(ag.id, { is_enabled: !ag.is_enabled });
                      onRefresh();
                    }}
                  >
                    <Power size={14} /> {ag.is_enabled ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
