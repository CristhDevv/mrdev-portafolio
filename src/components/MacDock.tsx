import React from 'react';
import { LayoutGrid, Mail, MessageCircle } from 'lucide-react';
import { MRDEV_CONTACT } from '../data/projects';
import { ProjectItem } from '../types/portfolio';

interface MacDockProps {
  projects: ProjectItem[];
  activeProjectId: string;
  onSelectProject: (project: ProjectItem) => void;
  onScrollTop: () => void;
  onOpenContact: () => void;
}

export const MacDock: React.FC<MacDockProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onScrollTop,
  onOpenContact,
}) => {
  return (
    <div className="mac-dock-wrap" aria-label="Dock de proyectos mrdev">
      <div className="mac-dock">
        <button
          type="button"
          className="dock-item dock-home"
          onClick={onScrollTop}
          title="Vista 3D General"
        >
          <LayoutGrid size={18} />
          <span className="dock-tooltip">Vista 3D</span>
        </button>

        <div className="dock-divider" />

        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          return (
            <button
              key={proj.id}
              type="button"
              className={`dock-item ${isActive ? 'active' : ''}`}
              style={{ '--dock-accent': proj.accentColor } as React.CSSProperties}
              onClick={() => onSelectProject(proj)}
            >
              <span className="dock-app-icon">{proj.iconText}</span>
              <span className="dock-tooltip">{proj.shortName}</span>
              {isActive && <span className="dock-active-dot" />}
            </button>
          );
        })}

        <div className="dock-divider" />

        <a
          href={`https://wa.me/${MRDEV_CONTACT.whatsappRaw}?text=${encodeURIComponent(
            'Hola mrdev, vi tu portafolio y quiero hablar sobre un proyecto.',
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="dock-item dock-wa"
          title={`WhatsApp ${MRDEV_CONTACT.whatsappDisplay}`}
        >
          <MessageCircle size={18} />
          <span className="dock-tooltip">WhatsApp</span>
        </a>

        <button
          type="button"
          className="dock-item dock-mail"
          onClick={onOpenContact}
          title="Contacto Directo"
        >
          <Mail size={18} />
          <span className="dock-tooltip">Contacto</span>
        </button>
      </div>
    </div>
  );
};
