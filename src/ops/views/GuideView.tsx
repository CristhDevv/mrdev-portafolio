import React from 'react';
import { BookOpen, CheckCircle2, Cpu, MessageSquare, Monitor, ShieldAlert, Users } from 'lucide-react';

export const GuideView: React.FC = () => {
  return (
    <div className="ops-stack">
      <div className="ops-panel">
        <div className="ops-panel-head">
          <strong><BookOpen size={17} /> Guía Rápida de Uso (Solo Administradores)</strong>
        </div>
        <p className="ops-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          Bienvenido a tu <strong>oficina virtual de control remoto</strong>. Desde aquí manejas a tus
          agentes de IA aunque estén en computadores distintos, sin necesidad de abrir cada PC por
          separado. Tú decides quién participa, qué puede hacer y apruebas cualquier acción delicada.
        </p>
      </div>

      <div className="ops-cards-grid">
        <div className="ops-entity-card">
          <div className="ops-entity-head">
            <h3><Monitor size={16} /> 1. Conecta un Computador</h3>
            <code>Máquinas</code>
          </div>
          <p className="ops-muted">
            Ve a <strong>Máquinas</strong>, escribe un nombre (ej. <em>cris1</em>) y pulsa{' '}
            <strong>Registrar Máquina</strong>. Copia el comando único que aparece y ejecútalo una sola
            vez en ese computador dentro de la carpeta del conector local (ej. <code>C:\mrdev-connector</code> o <code>connectors/mrdev-connector</code>):
          </p>
          <pre className="ops-code-block" style={{ marginBottom: 0 }}>
            node dist/cli.js pair --server https://mrdev.lat --token TU_TOKEN{'\n'}
            node dist/cli.js start
          </pre>
        </div>

        <div className="ops-entity-card">
          <div className="ops-entity-head">
            <h3><Cpu size={16} /> 2. Revisa tus Agentes</h3>
            <code>Agentes</code>
          </div>
          <p className="ops-muted">
            Cada agente es un trabajador (investigador, programador, revisor, etc.). En{' '}
            <strong>Agentes</strong> puedes ver en qué PC vive, qué sabe hacer y prenderlo o apagarlo en
            cualquier momento con un clic.
          </p>
        </div>

        <div className="ops-entity-card">
          <div className="ops-entity-head">
            <h3><Users size={16} /> 3. Crea Espacios Separados</h3>
            <code>Espacios</code>
          </div>
          <p className="ops-muted">
            Crea una sala por proyecto (ej. <em>Desarrollo SaaS</em> o <em>Marketing</em>) y marca
            solo a los agentes que deben trabajar ahí. Ningún agente puede ver archivos o chats de otro
            espacio al que no pertenezca.
          </p>
        </div>

        <div className="ops-entity-card">
          <div className="ops-entity-head">
            <h3><MessageSquare size={16} /> 4. Habla u Orquesta Tareas</h3>
            <code>Comunicaciones / DAG</code>
          </div>
          <p className="ops-muted">
            Usa <strong>Comunicaciones</strong> para chatear con uno o varios agentes a la vez. Usa{' '}
            <strong>Orquestador DAG</strong> cuando quieras encadenar pasos en orden (por ejemplo:{' '}
            <em>Paso 1 investiga → Paso 2 programa → Paso 3 revisa</em>).
          </p>
        </div>
      </div>

      <div className="ops-panel">
        <div className="ops-panel-head">
          <strong><CheckCircle2 size={16} /> ¿Para qué sirve cada botón del menú?</strong>
        </div>
        <div className="ops-list">
          <div className="ops-list-row">
            <strong>Resumen</strong>
            <span className="ops-muted">Vista rápida de PCs encendidos, tareas activas y alertas pendientes.</span>
          </div>
          <div className="ops-list-row">
            <strong>Máquinas</strong>
            <span className="ops-muted">Conecta computadores nuevos, revisa su estado o usa el Kill Switch.</span>
          </div>
          <div className="ops-list-row">
            <strong>Agentes</strong>
            <span className="ops-muted">Administra tus trabajadores de IA y habilita o deshabilita su acceso.</span>
          </div>
          <div className="ops-list-row">
            <strong>Espacios</strong>
            <span className="ops-muted">Separa proyectos, instrucciones y permisos por área de negocio.</span>
          </div>
          <div className="ops-list-row">
            <strong>Comunicaciones</strong>
            <span className="ops-muted">Envía instrucciones o deja que dos agentes intercambien contexto bajo tu control.</span>
          </div>
          <div className="ops-list-row">
            <strong>Orquestador DAG</strong>
            <span className="ops-muted">Crea flujos de varios pasos en secuencia o paralelo, pausarlos o reintentarlos.</span>
          </div>
          <div className="ops-list-row">
            <strong>Actividad en Vivo / Historial</strong>
            <span className="ops-muted">Mira qué está pasando en este instante y todo lo ocurrido por fecha y hora.</span>
          </div>
          <div className="ops-list-row">
            <strong>Archivos / Seguridad</strong>
            <span className="ops-muted">Descarga entregables producidos por agentes y audita cada acción ejecutada.</span>
          </div>
        </div>
      </div>

      <div className="ops-panel warning">
        <div className="ops-panel-head">
          <strong><ShieldAlert size={16} /> Seguridad y Aprobaciones</strong>
        </div>
        <p className="ops-muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
          Si una tarea intenta hacer algo delicado (instalar paquetes, subir cambios o tocar comandos de
          riesgo), <strong>se pausa automáticamente</strong> y te aparece una alerta en{' '}
          <strong>Resumen</strong> para que tú pulses <em>Aprobar</em> o <em>Rechazar</em>. Si un PC
          comprometido o fuera de control necesita cortarse al instante, usa el botón rojo{' '}
          <strong>Kill Switch</strong> en <strong>Máquinas</strong>.
        </p>
      </div>
    </div>
  );
};
