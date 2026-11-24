import React from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  FolderGit2,
  GitBranch,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Monitor,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';

export type OpsTab =
  | 'overview'
  | 'guide'
  | 'machines'
  | 'agents'
  | 'workspaces'
  | 'comms'
  | 'orchestrator'
  | 'live'
  | 'artifacts'
  | 'history'
  | 'security';

interface OpsLayoutProps {
  activeTab: OpsTab;
  onSelectTab: (tab: OpsTab) => void;
  userEmail: string;
  pendingApprovalsCount: number;
  onRefresh: () => void;
  onSignOut: () => void;
  onExitOps: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: OpsTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Resumen', icon: <LayoutDashboard size={16} /> },
  { id: 'guide', label: 'Guía de Uso', icon: <BookOpen size={16} /> },
  { id: 'machines', label: 'Máquinas', icon: <Monitor size={16} /> },
  { id: 'agents', label: 'Agentes', icon: <Bot size={16} /> },
  { id: 'workspaces', label: 'Espacios', icon: <Users size={16} /> },
  { id: 'comms', label: 'Comunicaciones', icon: <MessageSquare size={16} /> },
  { id: 'orchestrator', label: 'Orquestador DAG', icon: <GitBranch size={16} /> },
  { id: 'live', label: 'Actividad en Vivo', icon: <Activity size={16} /> },
  { id: 'artifacts', label: 'Archivos', icon: <FolderGit2 size={16} /> },
  { id: 'history', label: 'Historial', icon: <History size={16} /> },
  { id: 'security', label: 'Seguridad', icon: <Shield size={16} /> },
];

export const OpsLayout: React.FC<OpsLayoutProps> = ({
  activeTab,
  onSelectTab,
  userEmail,
  pendingApprovalsCount,
  onRefresh,
  onSignOut,
  onExitOps,
  children,
}) => {
  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <span className="ops-brand-dot" />
          <div>
            <strong>mrdev Ops Center</strong>
            <span>Orquestación Multiagente</span>
          </div>
        </div>

        <nav className="ops-nav" aria-label="Navegación Ops Center">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ops-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'orchestrator' && pendingApprovalsCount > 0 && (
                <span className="ops-nav-badge">{pendingApprovalsCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="ops-sidebar-footer">
          <div className="ops-user-chip">{userEmail}</div>
          <div className="ops-footer-actions">
            <button type="button" className="ops-ghost-btn" onClick={onExitOps}>
              <ArrowLeft size={14} /> Portafolio
            </button>
            <button type="button" className="ops-ghost-btn danger" onClick={onSignOut}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar">
          <h2>{NAV_ITEMS.find((i) => i.id === activeTab)?.label}</h2>
          <button type="button" className="ops-ghost-btn" onClick={onRefresh}>
            <RefreshCw size={14} /> Sincronizar
          </button>
        </header>
        <div className="ops-content">{children}</div>
      </div>
    </div>
  );
};
