# Documento 6 — Estructura Completa del Proyecto (Integrada en `portafolio`)

## 1. Principio de Integración Limpia
El portafolio público (`Hero3DDeck`, `LiveAppStage`, `MacDock`, `ContactModal`) mantiene intacta su estructura actual. La plataforma multiagente se añade en módulos desacoplados:
- Frontend del Centro de Operaciones bajo `src/ops/` (cargado de forma perezosa con `React.lazy` para no impactar la velocidad de `https://mrdev.lat`).
- Backend Serverless en `api/ops/` (nativo de Vercel).
- Conector instalable por máquina en `connectors/mrdev-connector/` (paquete aislado con su propio `package.json`).
- Migraciones SQL en `supabase/migrations/`.

---

## 2. Árbol Completo de Directorios y Archivos

```text
portafolio/
├── .github/
│   └── workflows/
│       └── security.yml                    # [MODIFICAR] Añadir check de api/ops y connectors
├── MULTIAGENT_PLATFORM/                    # [ACTUAL] Documentación arquitectónica (9 docs)
├── SECURITY_AUDIT/                         # [ACTUAL] Auditoría de seguridad existente
├── api/                                    # [NUEVO] Vercel Serverless Functions (/api/ops/*)
│   └── ops/
│       ├── _lib/
│       │   ├── supabaseAdmin.ts            # Cliente Supabase con service_role (solo servidor)
│       │   ├── adminAuth.ts                # Verificador JWT de Supabase + owner check
│       │   ├── connectorAuth.ts            # Verificador Ed25519 + timestamp + nonce anti-replay
│       │   ├── dagEngine.ts                # Validación acíclica + desbloqueo de dependencias
│       │   ├── auditLogger.ts              # Escritura obligatoria en ops_audit_logs y eventos
│       │   └── schemas.ts                  # Esquemas Zod de validación estricta de entradas
│       ├── overview.ts                     # GET /api/ops/overview
│       ├── machines/
│       │   ├── index.ts                    # GET / POST /api/ops/machines
│       │   └── [id]/
│       │       ├── pairing-token.ts        # POST /api/ops/machines/:id/pairing-token
│       │       └── revoke.ts               # POST /api/ops/machines/:id/revoke (Kill Switch)
│       ├── agents/
│       │   ├── index.ts                    # GET / POST /api/ops/agents
│       │   └── [id].ts                     # PATCH / DELETE /api/ops/agents/:id
│       ├── workspaces/
│       │   ├── index.ts                    # GET / POST /api/ops/workspaces
│       │   └── [id]/members.ts             # POST / DELETE miembros del workspace
│       ├── conversations/
│       │   └── index.ts                    # GET / POST /api/ops/conversations
│       ├── messages/
│       │   └── index.ts                    # GET / POST /api/ops/messages
│       ├── workflows/
│       │   └── index.ts                    # GET / POST /api/ops/workflows (creación DAG)
│       ├── tasks/
│       │   └── [id]/control.ts             # POST pause | resume | cancel | retry
│       ├── approvals/
│       │   └── [id]/decision.ts            # POST approved | rejected
│       ├── artifacts/
│       │   ├── upload-url.ts               # POST URL firmada de subida
│       │   └── [id]/download-url.ts        # GET URL firmada de descarga
│       └── connector/
│           ├── pair.ts                     # POST intercambio de OTP único -> clave máquina
│           ├── heartbeat.ts                # POST estado máquina + recursos + agentes
│           ├── sync.ts                     # GET tareas y mensajes pendientes por cursor
│           ├── messages.ts                 # POST envío de mensaje inter-agente validado
│           └── tasks/
│               └── [id]/
│                   ├── claim.ts            # POST lock atómico de tarea
│                   ├── request-approval.ts # POST bloqueo por aprobación humana
│                   ├── complete.ts         # POST resultado + desbloqueo DAG
│                   └── fail.ts             # POST fallo controlado + política reintento
├── connectors/
│   └── mrdev-connector/                    # [NUEVO] Conector ligero para cada máquina
│       ├── package.json                    # Dependencias mínimas (@supabase/supabase-js, ws, zod)
│       ├── tsconfig.json
│       ├── agents.example.json             # Ejemplo declarativo de agentes locales
│       └── src/
│           ├── cli.ts                      # Comandos: pair | start | status | doctor
│           ├── config/
│           │   ├── identityStore.ts        # Almacenamiento seguro de llave privada Ed25519
│           │   └── cryptoSigner.ts         # Firma de cabeceras Ed25519 + Nonce
│           ├── core/
│           │   ├── daemon.ts               # Loop principal + Realtime + fallback sync
│           │   ├── heartbeat.ts            # Telemetría real de OS (CPU/RAM/disco)
│           │   ├── localQueue.ts           # Cola persistente para desconexiones temporales
│           │   └── securityGuard.ts        # Sandbox de rutas permitidas + detector de riesgo
│           └── adapters/
│               ├── types.ts                # Interfaz AgentRuntimeAdapter
│               ├── registry.ts             # Fábrica y enrutador de adaptadores
│               ├── cliSubprocessAdapter.ts # Claude/Gemini/Codex CLI/Scripts
│               ├── localHttpAdapter.ts     # APIs locales en 127.0.0.1
│               ├── mcpClientAdapter.ts     # Clientes MCP stdio/SSE
│               ├── localWsAdapter.ts       # WebSockets locales en loopback
│               └── fileMailboxAdapter.ts   # Buzón de archivos inbox/outbox
├── public/
│   └── screenshots/                        # [INTACTO] Capturas del portafolio
├── src/
│   ├── components/
│   │   ├── ContactModal.tsx                # [INTACTO]
│   │   ├── Hero3DDeck.tsx                  # [INTACTO]
│   │   ├── LiveAppStage.tsx                # [INTACTO]
│   │   └── MacDock.tsx                     # [MODIFICAR MÍNIMO] Botón discreto hacia /ops
│   ├── data/projects.ts                    # [INTACTO]
│   ├── types/portfolio.ts                  # [INTACTO]
│   ├── App.tsx                             # [MODIFICAR MÍNIMO] Lazy mount de OpsCenter cuando ruta = /ops
│   ├── index.css                           # [INTACTO]
│   └── ops/                                # [NUEVO] Interfaz del Centro de Operaciones
│       ├── ops.css                         # Estilos Aurora & Glass dedicados a /ops
│       ├── types/ops.ts                    # Tipos compartidos UI <-> API
│       ├── services/
│       │   ├── supabaseClient.ts           # Cliente Supabase Auth + Realtime en navegador
│       │   └── opsApi.ts                   # Cliente HTTP autenticado hacia /api/ops/*
│       ├── hooks/
│       │   ├── useOpsAuth.ts               # Sesión de administrador y cierre seguro
│       │   └── useOpsRealtime.ts           # Suscripción Presence + Broadcast + Postgres Changes
│       ├── components/
│       │   ├── OpsLayout.tsx               # Sidebar/Topbar responsiva + volver al portafolio
│       │   ├── OpsLoginGate.tsx            # Pantalla de autenticación segura para /ops
│       │   ├── PairingModal.tsx            # Generador de OTP y comando CLI de conexión
│       │   ├── DagWorkflowBuilder.tsx      # Constructor visual de tareas con dependencias
│       │   └── ApprovalBanner.tsx          # Alerta y aprobación humana en 1 clic
│       └── views/
│           ├── OverviewView.tsx            # Resumen general (máquinas, tareas, alertas reales)
│           ├── MachinesView.tsx            # Registro, recursos, logs y Revocación (Kill Switch)
│           ├── AgentsView.tsx              # Perfiles, capacidades, habilitar/deshabilitar
│           ├── WorkspacesView.tsx          # Espacios de trabajo y reglas de aislamiento
│           ├── CommsView.tsx               # Centro de comunicaciones 1:1, grupal y broadcast
│           ├── OrchestratorView.tsx        # Orquestador de tareas y flujos DAG
│           ├── LiveActivityView.tsx        # Panel en tiempo real y streaming de ejecución
│           ├── ArtifactsView.tsx           # Archivos compartidos y descargas firmadas
│           ├── HistoryView.tsx             # Historial cronológico filtrable
│           └── SecurityView.tsx            # Auditoría inmutable, tokens y políticas
├── supabase/
│   └── migrations/
│       └── 20261124_001_ops_schema.sql     # [NUEVO] Esquema completo de Document 4
├── tests/
│   └── ops/
│       ├── dagEngine.test.ts               # Pruebas unitarias de DAG y ciclos
│       ├── connectorAuth.test.ts           # Pruebas de firma Ed25519 y anti-replay
│       ├── workspaceIsolation.test.ts      # Pruebas de aislamiento entre workspaces
│       └── securityGuard.test.ts           # Pruebas de bloqueo de rutas fuera de sandbox
├── index.html                              # [INTACTO]
├── package.json                            # [MODIFICAR] Añadir @supabase/supabase-js, zod y @vercel/node
├── tsconfig.json                           # [INTACTO o extender paths sin romper src]
├── tsconfig.api.json                       # [NUEVO] Typecheck exclusivo para api/ops/
└── vercel.json                             # [MODIFICAR] Rewrites /ops -> index.html (excluyendo /api) y ampliar connect-src para Supabase
```
