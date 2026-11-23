import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import { MRDEV_CONTACT } from '../data/projects';
import { ProjectItem } from '../types/portfolio';

interface Hero3DDeckProps {
  projects: ProjectItem[];
  activeProjectId: string;
  onSelectProject: (project: ProjectItem) => void;
  onOpenContact: () => void;
}

export const Hero3DDeck: React.FC<Hero3DDeckProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenContact,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const deckStageRef = useRef<HTMLDivElement>(null);

  const scrollDeck = (direction: -1 | 1) => {
    const el = deckStageRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 232, behavior: 'smooth' });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 14, y: -ny * 10 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <section className="hero-cinema" onMouseMove={handleMouseMove} onMouseLeave={resetTilt}>
      <div className="container hero-cinema-inner">
        <div className="hero-top-bar">
          <div className="hero-brand-pill">
            <span className="pulse-dot-green" />
            <strong>mrdev</strong>
            <span className="divider-dot">·</span>
            <span>{MRDEV_CONTACT.owner}</span>
            <span className="divider-dot">·</span>
            <span>7 Sistemas Reales en Producción</span>
          </div>

          <div className="hero-top-actions">
            <a
              href={`https://wa.me/${MRDEV_CONTACT.whatsappRaw}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill-btn whatsapp"
            >
              <MessageCircle size={15} /> {MRDEV_CONTACT.whatsappDisplay}
            </a>
            <a href={`mailto:${MRDEV_CONTACT.email}`} className="glass-pill-btn">
              <Mail size={15} /> {MRDEV_CONTACT.email}
            </a>
          </div>
        </div>

        <div className="hero-headline-wrap">
          <h1 className="hero-cinema-title">
            No te cuento lo que programo.
            <br />
            <span className="hero-gradient-text">Pruébalo en vivo aquí mismo.</span>
          </h1>
          <p className="hero-cinema-sub">
            Haz clic en cualquiera de mis <strong>7 plataformas en producción</strong> para
            explorarla en tiempo real.
          </p>

          <div className="hero-cta-row">
            <button
              type="button"
              className="cta-glow-btn"
              onClick={() => onSelectProject(projects[0])}
            >
              <Play size={16} fill="currentColor" /> Explorar Escenario en Vivo
            </button>
            <button type="button" className="cta-glass-btn" onClick={onOpenContact}>
              <Sparkles size={16} /> Cotizar un Proyecto
            </button>
          </div>
        </div>

        {/* 3D Floating Deck of all 7 real screens */}
        <div
          ref={deckStageRef}
          className="deck-3d-stage"
          style={{
            transform: `perspective(1400px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          }}
        >
          <div className="deck-3d-fan">
            {projects.map((proj, idx) => {
              const centerOffset = idx - 3; // -3 .. +3
              const isActive = proj.id === activeProjectId;
              const isHovered = hoveredIdx === idx;
              const isFeatured = isHovered || (hoveredIdx === null && isActive);
              const baseTranslateX = centerOffset * 128;
              const baseTranslateZ = -Math.abs(centerOffset) * 55;
              const baseRotateY = centerOffset * -9;
              const baseRotateZ = centerOffset * 1.4;

              return (
                <button
                  key={proj.id}
                  type="button"
                  className={`deck-card ${isFeatured ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectProject(proj)}
                  style={
                    {
                      '--deck-accent': proj.accentColor,
                      zIndex: isHovered ? 40 : isActive ? 30 : 10 - Math.abs(centerOffset),
                      transform: isFeatured
                        ? `translateX(${baseTranslateX}px) translateY(-34px) translateZ(150px) scale(1.1) rotateY(0deg) rotateZ(0deg)`
                        : `translateX(${baseTranslateX}px) translateZ(${baseTranslateZ}px) rotateY(${baseRotateY}deg) rotateZ(${baseRotateZ}deg)`,
                    } as React.CSSProperties
                  }
                >
                  <div className="deck-card-glow" />
                  <div className="deck-card-chrome">
                    <span className="deck-num">{proj.number}</span>
                    <span className="deck-name">{proj.shortName}</span>
                    <ArrowUpRight size={13} className="deck-arrow" />
                  </div>
                  <div className="deck-card-img-wrap">
                    <img src={proj.screenshotPath} alt={proj.name} loading="eager" />
                  </div>
                  <div className="deck-card-footer">
                    <span>{proj.categoryBadge}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mobile-deck-controls">
          <button
            type="button"
            className="mobile-deck-arrow"
            onClick={() => scrollDeck(-1)}
            aria-label="Mover proyectos a la izquierda"
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          <button
            type="button"
            className="mobile-deck-arrow"
            onClick={() => scrollDeck(1)}
            aria-label="Mover proyectos a la derecha"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        </div>

        <div className="scroll-cue">
          <ArrowDown size={15} />
          <span>Usa el Dock inferior o haz clic en cualquier pantalla para abrirla en grande</span>
        </div>
      </div>
    </section>
  );
};
