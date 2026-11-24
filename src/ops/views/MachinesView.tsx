import React, { useState } from 'react';
import { KeyRound, Monitor, Plus, ShieldOff } from 'lucide-react';
import { opsApi } from '../services/opsApi';
import { OpsMachine } from '../types/ops';

interface MachinesViewProps {
  machines: OpsMachine[];
  onShowPairing: (pairing: { otp_token: string; expires_at: string; cli_command: string }) => void;
  onRefresh: () => void;
}

export const MachinesView: React.FC<MachinesViewProps> = ({
  machines,
  onShowPairing,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [osType, setOsType] = useState('windows');
  const [rootPath, setRootPath] = useState('C:\\Users\\USER\\Desktop\\workspace');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await opsApi.createMachine({
        custom_name: name,
        os_type: osType,
        allowed_root_paths: rootPath ? [rootPath] : [],
      });
      setName('');
      onShowPairing(res.pairing);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la máquina');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ops-stack">
      <form className="ops-panel ops-form-row" onSubmit={handleCreate}>
        <input
          type="text"
          required
          placeholder="Nombre de la máquina (ej. PC-Principal-Bogota)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={osType} onChange={(e) => setOsType(e.target.value)}>
          <option value="windows">Windows</option>
          <option value="linux">Linux</option>
          <option value="macos">macOS</option>
        </select>
        <input
          type="text"
          placeholder="Ruta raíz permitida (sandbox)"
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
        />
        <button type="submit" className="ops-primary-btn" disabled={busy}>
          <Plus size={15} /> {busy ? 'Registrando...' : 'Registrar Máquina'}
        </button>
      </form>

      {error && <div className="ops-error-box">{error}</div>}

      <div className="ops-cards-grid">
        {machines.length === 0 ? (
          <div className="ops-panel">
            <p className="ops-empty">No hay máquinas registradas todavía.</p>
          </div>
        ) : (
          machines.map((m) => (
            <div key={m.id} className="ops-entity-card">
              <div className="ops-entity-head">
                <div>
                  <span className={`ops-status-pill ${m.status}`}>{m.status}</span>
                  <h3><Monitor size={15} /> {m.custom_name}</h3>
                </div>
                <code>{m.os_type}</code>
              </div>

              <div className="ops-meta-grid">
                <span>ID: <code>{m.id.slice(0, 8)}</code></span>
                <span>Heartbeat: {m.last_heartbeat_at ? new Date(m.last_heartbeat_at).toLocaleTimeString() : 'Nunca'}</span>
                {m.resource_snapshot?.cpu_percent !== undefined && (
                  <span>CPU: {m.resource_snapshot.cpu_percent}%</span>
                )}
                {m.resource_snapshot?.ram_used_mb !== undefined && (
                  <span>RAM: {m.resource_snapshot.ram_used_mb} / {m.resource_snapshot.ram_total_mb} MB</span>
                )}
              </div>

              {m.last_error && <div className="ops-error-box">{m.last_error}</div>}

              <div className="ops-row-actions">
                <button
                  type="button"
                  className="ops-ghost-btn"
                  onClick={async () => {
                    try {
                      setError(null);
                      const p = await opsApi.rotatePairingToken(m.id);
                      onShowPairing(p);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Error generando token');
                    }
                  }}
                >
                  <KeyRound size={14} /> Nuevo Token
                </button>
                {m.status !== 'revoked' && (
                  <button
                    type="button"
                    className="ops-danger-btn sm"
                    onClick={async () => {
                      try {
                        setError(null);
                        await opsApi.revokeMachine(m.id, 'Revocación manual desde panel');
                        onRefresh();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Error revocando máquina');
                      }
                    }}
                  >
                    <ShieldOff size={14} /> Kill Switch
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
