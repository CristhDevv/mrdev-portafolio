import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { opsApi } from '../services/opsApi';
import { OpsAgent, OpsWorkspace, WorkspaceCategory } from '../types/ops';

interface WorkspacesViewProps {
  workspaces: OpsWorkspace[];
  agents: OpsAgent[];
  onRefresh: () => void;
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({
  workspaces,
  agents,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkspaceCategory>('software');
  const [instructions, setInstructions] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await opsApi.createWorkspace({
      name,
      domain_category: category,
      system_instructions: instructions,
      agent_ids: selectedAgents,
    });
    setName('');
    setInstructions('');
    setSelectedAgents([]);
    onRefresh();
  };

  return (
    <div className="ops-stack">
      <form className="ops-panel ops-form-col" onSubmit={handleCreate}>
        <div className="ops-form-row">
          <input
            type="text"
            required
            placeholder="Nombre del espacio (ej. Desarrollo SaaS)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as WorkspaceCategory)}>
            <option value="software">Desarrollo de Software</option>
            <option value="research">Investigación Comercial</option>
            <option value="automation">Automatización Empresarial</option>
            <option value="marketing">Marketing y Publicidad</option>
            <option value="data">Análisis de Datos</option>
            <option value="operations">Operaciones Administrativas</option>
          </select>
          <button type="submit" className="ops-primary-btn">
            <Plus size={15} /> Crear Espacio
          </button>
        </div>
        <textarea
          rows={2}
          placeholder="Instrucciones generales y reglas del espacio de trabajo..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
        {agents.length > 0 && (
          <div className="ops-chip-select">
            <span>Agentes autorizados en este espacio:</span>
            {agents.map((ag) => (
              <button
                key={ag.id}
                type="button"
                className={`ops-chip-btn ${selectedAgents.includes(ag.id) ? 'active' : ''}`}
                onClick={() => toggleAgent(ag.id)}
              >
                {ag.name}
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="ops-cards-grid">
        {workspaces.map((ws) => (
          <div key={ws.id} className="ops-entity-card">
            <div className="ops-entity-head">
              <h3><Users size={15} /> {ws.name}</h3>
              <code>{ws.domain_category}</code>
            </div>
            <p className="ops-muted">{ws.system_instructions || 'Sin instrucciones globales definidas.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
