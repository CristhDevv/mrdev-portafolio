import { useEffect, useState } from 'react';
import { ContactModal } from './components/ContactModal';
import { Hero3DDeck } from './components/Hero3DDeck';
import { LiveAppStage } from './components/LiveAppStage';
import { MacDock } from './components/MacDock';
import { MRDEV_CONTACT, PROJECTS } from './data/projects';
import { ProjectItem } from './types/portfolio';

export function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [cursor, setCursor] = useState({ x: 50, y: 20 });

  const activeProject = PROJECTS[activeIndex];

  const handleSelectProject = (project: ProjectItem) => {
    const idx = PROJECTS.findIndex((p) => p.id === project.id);
    if (idx !== -1) setActiveIndex(idx);
    const stage = document.getElementById('live-stage');
    stage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + PROJECTS.length) % PROJECTS.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % PROJECTS.length);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActiveIndex((p) => (p + 1) % PROJECTS.length);
      if (e.key === 'ArrowLeft') setActiveIndex((p) => (p - 1 + PROJECTS.length) % PROJECTS.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className="aurora-app"
      style={
        {
          '--active-accent': activeProject.accentColor,
          '--active-secondary': activeProject.secondaryGlow,
          '--cursor-x': `${cursor.x}%`,
          '--cursor-y': `${cursor.y}%`,
        } as React.CSSProperties
      }
      onMouseMove={(e) => {
        const x = Math.round((e.clientX / window.innerWidth) * 100);
        const y = Math.round((e.clientY / window.innerHeight) * 100);
        setCursor({ x, y });
      }}
    >
      {/* Dynamic Aurora Ambient Background */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-orb orb-1" />
        <div className="aurora-orb orb-2" />
        <div className="aurora-grid" />
        <div className="cursor-spotlight" />
      </div>

      <main>
        <Hero3DDeck
          projects={PROJECTS}
          activeProjectId={activeProject.id}
          onSelectProject={handleSelectProject}
          onOpenContact={() => setContactOpen(true)}
        />

        <LiveAppStage
          project={activeProject}
          totalProjects={PROJECTS.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </main>

      <footer className="cinema-footer">
        <div className="container cinema-footer-inner">
          <div>
            <strong>mrdev · {MRDEV_CONTACT.owner}</strong>
            <span>
              {MRDEV_CONTACT.whatsappDisplay} · {MRDEV_CONTACT.email}
            </span>
          </div>
          <button
            type="button"
            className="footer-cta-btn"
            onClick={() => setContactOpen(true)}
          >
            Iniciar Proyecto con mrdev
          </button>
        </div>
      </footer>

      <MacDock
        projects={PROJECTS}
        activeProjectId={activeProject.id}
        onSelectProject={handleSelectProject}
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenContact={() => setContactOpen(true)}
      />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        activeProjectName={activeProject.name}
      />
    </div>
  );
}

export default App;
