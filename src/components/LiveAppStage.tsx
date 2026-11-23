import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Laptop,
  Maximize2,
  MonitorPlay,
  RotateCw,
  ShieldAlert,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { DeviceMode, ProjectItem, StageViewMode } from '../types/portfolio';

interface LiveAppStageProps {
  project: ProjectItem;
  totalProjects: number;
  onPrev: () => void;
  onNext: () => void;
}

export const LiveAppStage: React.FC<LiveAppStageProps> = ({
  project,
  totalProjects,
  onPrev,
  onNext,
}) => {
  const [stageView, setStageView] = useState<StageViewMode>('live');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const canEmbedLive = !project.iframeBlocked;
  const effectiveStageView: StageViewMode = canEmbedLive ? stageView : 'hd';

  const handleStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (effectiveStageView !== 'hd') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 8, y: -ny * 6 });
  };

  return (
    <section
      id="live-stage"
      className="live-stage-section"
      style={{ '--stage-accent': project.accentColor } as React.CSSProperties}
    >
      <div className="container">
        {/* Compact Ultra-Visual Header */}
        <div className="stage-header-bar">
          <div className="stage-title-block">
            <div className="stage-badges">
              <span className="stage-index-pill">
                {project.number} / 0{totalProjects}
              </span>
              <span className="stage-cat-pill">{project.categoryBadge}</span>
              <span className="stage-live-status">
                <span className="pulse-dot-green" /> En Producción
              </span>
            </div>
            <h2 className="stage-project-name">{project.name}</h2>
            <p className="stage-short-headline">{project.shortHeadline}</p>
          </div>

          <div className="stage-header-actions">
            <button
              type="button"
              className="stage-nav-circle"
              onClick={onPrev}
              aria-label="Proyecto anterior"
              title="Proyecto anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="stage-nav-circle"
              onClick={onNext}
              aria-label="Siguiente proyecto"
              title="Siguiente proyecto"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="stage-info-btn"
              onClick={() => setDrawerOpen(true)}
            >
              <Info size={15} /> Ficha &amp; Stack
            </button>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="stage-launch-btn"
            >
              Abrir Web <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* 3 Visual KPIs + Feature Pills (Zero Wall of Text) */}
        <div className="stage-kpi-strip">
          {project.kpis.map((kpi) => (
            <div key={kpi.label} className="stage-kpi-chip">
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
          ))}
        </div>

        {/* Studio Controls Toolbar */}
        <div className="studio-toolbar">
          <div className="studio-group">
            <button
              type="button"
              className={`studio-btn ${effectiveStageView === 'live' ? 'active' : ''}`}
              onClick={() => canEmbedLive && setStageView('live')}
              disabled={!canEmbedLive}
              title={
                canEmbedLive
                  ? 'Navegar web real en vivo'
                  : 'Este dominio bloquea iframes por política CSP; usa Vista HD 3D o Abrir Web'
              }
            >
              <MonitorPlay size={15} /> App Real en Vivo
            </button>
            <button
              type="button"
              className={`studio-btn ${effectiveStageView === 'hd' ? 'active' : ''}`}
              onClick={() => setStageView('hd')}
            >
              <Sparkles size={15} /> Vista HD 3D
            </button>
          </div>

          <div className="studio-group">
            <button
              type="button"
              className={`studio-btn ${device === 'desktop' ? 'active' : ''}`}
              onClick={() => setDevice('desktop')}
            >
              <Laptop size={15} /> Desktop
            </button>
            <button
              type="button"
              className={`studio-btn ${device === 'iphone' ? 'active' : ''}`}
              onClick={() => setDevice('iphone')}
            >
              <Smartphone size={15} /> iPhone 16
            </button>
            <button
              type="button"
              className={`studio-btn ${device === 'cinema' ? 'active' : ''}`}
              onClick={() => setDevice('cinema')}
            >
              <Maximize2 size={15} /> Cine
            </button>
          </div>

          <button
            type="button"
            className="studio-reload-btn"
            onClick={() => setIframeKey((k) => k + 1)}
            title="Recargar vista en vivo"
          >
            <RotateCw size={14} /> Recargar
          </button>
        </div>

        {/* THE DEVICE FRAME (85% of attention) */}
        <div
          className={`device-arena mode-${device}`}
          onMouseMove={handleStageMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className="arena-ambient-glow" />

          {device === 'iphone' ? (
            <div
              className="iphone-chassis"
              style={
                effectiveStageView === 'hd'
                  ? { transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }
                  : undefined
              }
            >
              <div className="iphone-island" />
              <div className="iphone-screen">
                {effectiveStageView === 'live' ? (
                  <iframe
                    key={`${project.id}-mobile-${iframeKey}`}
                    src={project.url}
                    title={`${project.name} móvil en vivo`}
                    className="live-iframe"
                    loading="eager"
                  />
                ) : (
                  <img
                    src={project.screenshotPath}
                    alt={`${project.name} vista HD`}
                    className="hd-screen-img"
                  />
                )}
              </div>
            </div>
          ) : (
            <div
              className={`macbook-chassis ${device === 'cinema' ? 'cinema' : ''}`}
              style={
                effectiveStageView === 'hd'
                  ? { transform: `perspective(1400px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }
                  : undefined
              }
            >
              <div className="macbook-topbar">
                <div className="traffic-lights">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="macbook-address-bar">
                  <span className="live-dot-mini" />
                  <span>https://{project.displayUrl}</span>
                </div>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="macbook-ext"
                >
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="macbook-viewport">
                {/* Preloaded screenshot underneath so it never looks blank while iframe loads */}
                <img
                  src={project.screenshotPath}
                  alt={project.name}
                  className="viewport-backdrop-img"
                />

                {effectiveStageView === 'live' && (
                  <iframe
                    key={`${project.id}-desktop-${iframeKey}`}
                    src={project.url}
                    title={`${project.name} en vivo`}
                    className="live-iframe"
                    loading="eager"
                  />
                )}

                {project.iframeBlocked && (
                  <div className="login-wall-chip">
                    <ShieldAlert size={13} />
                    <span>
                      Vista HD en vivo (el dominio protege contra iframe) ·{' '}
                      <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 700 }}>
                        Abrir {project.displayUrl} ↗
                      </a>
                    </span>
                  </div>
                )}

                {project.hasLoginWall && (
                  <div className="login-wall-chip">
                    <ShieldAlert size={13} />
                    <span>
                      Acceso privado con usuario/rol ·{' '}
                      <button type="button" onClick={() => setDrawerOpen(true)}>
                        Ver módulos internos
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ultra-clean 4 feature chips below the screen */}
        <div className="stage-feature-pills">
          {project.featurePills.map((pill) => (
            <span key={pill} className="stage-feature-pill">
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Optional Slide-Over Glass Drawer for Technical Details */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="glass-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <span className="drawer-eyebrow">{project.categoryBadge}</span>
                <h3>{project.name}</h3>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar ficha"
              >
                <X size={18} />
              </button>
            </div>

            <p className="drawer-lead">{project.shortHeadline}</p>

            <div className="drawer-section">
              <span className="drawer-label">Pilares del Sistema</span>
              <div className="drawer-pillars">
                {project.quickPillars.map((pillar) => (
                  <div key={pillar.title} className="drawer-pillar-item">
                    <strong>{pillar.title}</strong>
                    <p>{pillar.shortDesc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Stack Tecnológico</span>
              <div className="drawer-stack">
                {project.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>

            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-cta"
            >
              Visitar {project.displayUrl} <ExternalLink size={15} />
            </a>
          </aside>
        </div>
      )}
    </section>
  );
};
