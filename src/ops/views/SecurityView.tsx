import React from 'react';
import { Shield } from 'lucide-react';
import { OpsAuditLog } from '../types/ops';

interface SecurityViewProps {
  auditLogs: OpsAuditLog[];
}

export const SecurityView: React.FC<SecurityViewProps> = ({ auditLogs }) => {
  return (
    <div className="ops-panel">
      <div className="ops-panel-head">
        <strong><Shield size={16} /> Registro Inmutable de Auditoría y Seguridad</strong>
      </div>
      {auditLogs.length === 0 ? (
        <p className="ops-empty">Sin registros de auditoría todavía.</p>
      ) : (
        <div className="ops-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="ops-list-row">
              <div>
                <code>{log.actor_type}:{log.actor_id.slice(0, 14)}</code>{' '}
                <strong>{log.action}</strong> → {log.resource_type} ({log.resource_id.slice(0, 8)})
              </div>
              <time>{new Date(log.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
