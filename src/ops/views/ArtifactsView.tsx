import React from 'react';
import { FolderGit2 } from 'lucide-react';
import { OpsTask } from '../types/ops';

interface ArtifactsViewProps {
  tasks: OpsTask[];
}

export const ArtifactsView: React.FC<ArtifactsViewProps> = ({ tasks }) => {
  const tasksWithArtifacts = tasks.filter((t) => t.output_artifact_ids.length > 0);

  return (
    <div className="ops-panel">
      <div className="ops-panel-head">
        <strong><FolderGit2 size={16} /> Archivos y Artefactos Compartidos</strong>
      </div>
      {tasksWithArtifacts.length === 0 ? (
        <p className="ops-empty">
          Los archivos producidos por agentes aparecerán aquí con enlaces firmados temporales (120s) desde Supabase Storage.
        </p>
      ) : (
        <div className="ops-list">
          {tasksWithArtifacts.map((t) => (
            <div key={t.id} className="ops-list-row">
              <div>
                <strong>{t.title}</strong>
                <span className="ops-muted"> · {t.output_artifact_ids.length} artefacto(s)</span>
              </div>
              <code>{t.workspace_id.slice(0, 8)}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
