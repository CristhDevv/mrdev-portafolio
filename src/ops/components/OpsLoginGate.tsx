import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';

interface OpsLoginGateProps {
  configured: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onExitOps: () => void;
}

export const OpsLoginGate: React.FC<OpsLoginGateProps> = ({
  configured,
  error,
  onSignIn,
  onExitOps,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSignIn(email, password);
    setSubmitting(false);
  };

  return (
    <div className="ops-login-wrap">
      <div className="ops-login-card">
        <button type="button" className="ops-back-link" onClick={onExitOps}>
          <ArrowLeft size={15} /> Volver al Portafolio
        </button>

        <div className="ops-login-badge">
          <Lock size={16} /> Acceso Restringido · mrdev Ops Center
        </div>

        <h1>Centro de Orquestación Multiagente</h1>
        <p>
          Inicia sesión con tu cuenta de administrador autorizada para gestionar máquinas,
          agentes, espacios de trabajo y flujos DAG.
        </p>

        {!configured && (
          <div className="ops-alert-box">
            <ShieldAlert size={16} />
            <span>
              Entorno pendiente de variables <code>VITE_SUPABASE_URL</code> y{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> en Vercel. El acceso permanece bloqueado por
              seguridad.
            </span>
          </div>
        )}

        {error && <div className="ops-error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="ops-login-form">
          <label>
            <span>Correo de Administrador</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="camilovelascoofficial@gmail.com"
              disabled={!configured}
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={!configured}
            />
          </label>
          <button type="submit" className="ops-primary-btn" disabled={!configured || submitting}>
            {submitting ? 'Verificando...' : 'Ingresar a Ops Center'}
          </button>
        </form>
      </div>
    </div>
  );
};
