# Documento 9 — Instrucciones de Handoff para el Subagente Programador

> **Reglas globales para el subagente programador:**
> 1. Ejecuta las tareas estrictamente en el orden `TASK-01` → `TASK-12`.
> 2. **NO modifiques** `src/components/Hero3DDeck.tsx`, `src/components/LiveAppStage.tsx`, `src/components/ContactModal.tsx`, `src/data/projects.ts` ni `public/screenshots/*`.
> 3. **NO inventes** nuevos proveedores ni servidores WebSocket propios: usa exclusivamente Vercel Serverless (`/api/ops/*`) + Supabase (PostgreSQL, Auth, Realtime, Storage).
> 4. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en archivos bajo `src/`.

---

### `TASK-01` — Migración SQL y Políticas RLS
- **Contexto / Dependencias:** Base de datos PostgreSQL en Supabase (sin dependencias previas).
- **Objetivo:** Crear la migración completa del esquema `ops_*` y el bucket privado `ops-artifacts`.
- **Archivos a crear:** `supabase/migrations/20261124_001_ops_schema.sql`.
- **Archivos prohibidos:** Todo `src/**`.
- **Contratos / Seguridad:** Incluir exactamente las 18 tablas, índices, `CHECK` constraints y políticas RLS definidas en `MULTIAGENT_PLATFORM/04_DATA_MODEL.md`. Cero políticas para rol `anon`.
- **Resultado esperado / Pruebas:** Script SQL ejecutable de forma idempotente; validar con consulta de prueba que `anon` no puede leer ni insertar en ninguna tabla `ops_*`.

### `TASK-02` — Configuración Base, Tipos Compartidos y Helpers de Servidor
- **Contexto / Dependencias:** `TASK-01`.
- **Objetivo:** Instalar `@supabase/supabase-js`, `zod` y `@vercel/node`; configurar `tsconfig.api.json`, `vercel.json` (rewrites `/ops` excluyendo `/api/*` y `connect-src` ampliado a `https://*.supabase.co wss://*.supabase.co`), tipos y helpers de seguridad backend.
- **Archivos a crear/modificar:** `package.json`, `tsconfig.api.json`, `vercel.json`, `src/ops/types/ops.ts`, `api/ops/_lib/{supabaseAdmin,adminAuth,connectorAuth,auditLogger,schemas}.ts`.
- **Archivos prohibidos:** `src/components/Hero3DDeck.tsx`, `src/components/LiveAppStage.tsx`, `src/components/ContactModal.tsx`.
- **Contratos / Seguridad:** `adminAuth.ts` debe validar JWT de Supabase + `email === process.env.OPS_OWNER_EMAIL`. `connectorAuth.ts` debe validar firma Ed25519 + ventana `±60s` + inserción única en `ops_used_nonces`.
- **Pruebas obligatorias:** `tests/ops/connectorAuth.test.ts` (firma válida, firma inválida, timestamp expirado, nonce repetido).

### `TASK-03` — API de Máquinas, Emparejamiento OTP y Kill Switch
- **Contexto / Dependencias:** `TASK-02`.
- **Objetivo:** Implementar endpoints de administración de máquinas (`GET/POST /api/ops/machines`, `pairing-token`, `revoke`) y endpoints del conector (`pair`, `heartbeat`, `sync`).
- **Archivos a crear:** `api/ops/machines/index.ts`, `api/ops/machines/[id]/pairing-token.ts`, `api/ops/machines/[id]/revoke.ts`, `api/ops/connector/{pair,heartbeat,sync}.ts`.
- **Contratos / Seguridad:** Los OTP en `ops_pairing_tokens` deben guardarse solo como hash SHA-256, expirar a los 10 minutos y marcarse `used_at` atómicamente en `pair.ts`. `revoke.ts` desactiva `ops_machine_credentials` e inserta en `ops_audit_logs`.
- **Pruebas obligatorias:** Verificar que un OTP usado dos veces devuelve `401` y una máquina revocada recibe `403` en `heartbeat.ts`.

### `TASK-04` — Núcleo del Conector Local (`mrdev-connector`) y Primeros 2 Adaptadores
- **Contexto / Dependencias:** `TASK-03`.
- **Objetivo:** Crear el paquete CLI `connectors/mrdev-connector/` con comandos `pair`, `start`, `status`, `doctor`, guardia local de sandbox (`securityGuard.ts`), heartbeats cada 20s, suscripción a Supabase Realtime + fallback `sync`, `CliSubprocessAdapter` y `LocalHttpAdapter`.
- **Archivos a crear:** `connectors/mrdev-connector/package.json`, `tsconfig.json`, `agents.example.json`, `src/cli.ts`, `src/config/*`, `src/core/*`, `src/adapters/{types,registry,cliSubprocessAdapter,localHttpAdapter}.ts`.
- **Requisitos de seguridad:** `CliSubprocessAdapter` debe usar `child_process.spawn` con `shell: false`. `LocalHttpAdapter` debe rechazar cualquier host distinto de `127.0.0.1` o `localhost`. `securityGuard.ts` debe validar `allowed_root_paths` con `fs.realpathSync`.
- **Pruebas obligatorias:** `tests/ops/securityGuard.test.ts` probando bloqueo de `../` y rutas fuera de `allowed_root_paths`.

### `TASK-05` — API de Agentes, Workspaces y Comunicaciones Intermediadas
- **Contexto / Dependencias:** `TASK-03`.
- **Objetivo:** Implementar endpoints para administrar agentes (`/api/ops/agents/*`), workspaces (`/api/ops/workspaces/*`), conversaciones y mensajes (`/api/ops/conversations`, `/api/ops/messages`, `/api/ops/connector/messages`).
- **Archivos a crear:** `api/ops/agents/{index.ts,[id].ts}`, `api/ops/workspaces/{index.ts,[id]/members.ts}`, `api/ops/conversations/index.ts`, `api/ops/messages/index.ts`, `api/ops/connector/messages.ts`.
- **Contratos / Seguridad:** Rechazar con `403` cualquier mensaje o lectura entre agentes que no compartan membresía activa en `ops_workspace_members` para ese `workspace_id`. Todo mensaje debe quedar persistido con `idempotency_key` y auditado.
- **Pruebas obligatorias:** `tests/ops/workspaceIsolation.test.ts`.

### `TASK-06` — Motor DAG, Tareas, Aprobaciones Humanas y Endpoints de Ejecución
- **Contexto / Dependencias:** `TASK-05`.
- **Objetivo:** Implementar `dagEngine.ts` (detección de ciclos DFS + desbloqueo de dependientes) y los endpoints de workflows, control manual de tareas, aprobaciones humanas, y `claim`/`request-approval`/`complete`/`fail` del conector.
- **Archivos a crear:** `api/ops/_lib/dagEngine.ts`, `api/ops/overview.ts`, `api/ops/workflows/index.ts`, `api/ops/tasks/[id]/control.ts`, `api/ops/approvals/[id]/decision.ts`, `api/ops/connector/tasks/[id]/{claim,request-approval,complete,fail}.ts`.
- **Contratos / Seguridad:** `claim` debe ser atómico (`WHERE status = 'queued'`) devolviendo `409` si ya fue reclamada. Toda tarea con `requires_human_approval = true` o riesgo `high` pasa a `waiting_approval` antes de ejecutarse.
- **Pruebas obligatorias:** `tests/ops/dagEngine.test.ts` (ciclo `A->B->A` rechazado con `422`, desbloqueo secuencial y paralelo).

### `TASK-07` — API de Artefactos con URLs Firmadas (Storage)
- **Contexto / Dependencias:** `TASK-05`, `TASK-06`.
- **Objetivo:** Implementar generación de URLs firmadas de subida y descarga en Supabase Storage (`ops-artifacts`) respetando aislamiento por `workspace_id` y límites de tamaño (25 MB).
- **Archivos a crear:** `api/ops/artifacts/{upload-url.ts,[id]/download-url.ts}`.
- **Requisitos de seguridad:** Sanitizar nombres de archivo, bloquear extensiones ejecutables binarias, validar membresía en `workspace_id` antes de emitir URL de descarga (TTL 120s).

### `TASK-08` — Integración Mínima en el Portafolio y Gate de Autenticación (`/ops`)
- **Contexto / Dependencias:** `TASK-02`.
- **Objetivo:** Conectar la ruta `/ops` en `src/App.tsx` mediante `React.lazy`, añadir acceso discreto en `src/components/MacDock.tsx` y crear `OpsLoginGate`, `OpsLayout`, `useOpsAuth` y `useOpsRealtime`.
- **Archivos a crear/modificar:** `src/App.tsx`, `src/components/MacDock.tsx`, `src/ops/ops.css`, `src/ops/services/{supabaseClient,opsApi}.ts`, `src/ops/hooks/{useOpsAuth,useOpsRealtime}.ts`, `src/ops/components/{OpsLoginGate,OpsLayout}.tsx`.
- **Archivos prohibidos:** `Hero3DDeck.tsx`, `LiveAppStage.tsx`, `ContactModal.tsx`, `projects.ts`.
- **Pruebas obligatorias:** Verificar que `/` (el portafolio) sigue cargando idéntico y sin requerir login, y que `/ops` bloquea todo contenido tras `OpsLoginGate` si no hay sesión válida.

### `TASK-09` — Vistas UI del MVP (Resumen, Máquinas, Agentes, Comunicaciones, Actividad)
- **Contexto / Dependencias:** `TASK-03`, `TASK-05`, `TASK-08`.
- **Objetivo:** Construir las vistas `OverviewView`, `MachinesView` (+ `PairingModal`), `AgentsView`, `CommsView`, `LiveActivityView` y `HistoryView` manteniendo la estética *Aurora & Glass*.
- **Archivos a crear:** `src/ops/components/PairingModal.tsx`, `src/ops/views/{OverviewView,MachinesView,AgentsView,CommsView,LiveActivityView,HistoryView}.tsx`.
- **Regla estricta:** Prohibido mostrar datos falsos o métricas simuladas; usar únicamente datos reales de `/api/ops/*` y Realtime, con estados vacíos claros.

### `TASK-10` — Vistas UI Avanzadas (Workspaces, Orquestador DAG, Artefactos, Seguridad)
- **Contexto / Dependencias:** `TASK-06`, `TASK-07`, `TASK-09`.
- **Objetivo:** Construir `WorkspacesView`, `OrchestratorView` (+ `DagWorkflowBuilder` y `ApprovalBanner`), `ArtifactsView` y `SecurityView`.
- **Archivos a crear:** `src/ops/components/{DagWorkflowBuilder,ApprovalBanner}.tsx`, `src/ops/views/{WorkspacesView,OrchestratorView,ArtifactsView,SecurityView}.tsx`.
- **Pruebas obligatorias:** Verificar en navegador escritorio (`1440x900`) y móvil (`390x844`) sin desbordamiento horizontal.

### `TASK-11` — Adaptadores Avanzados del Conector (`MCP`, `WebSocket Local`, `File Mailbox`)
- **Contexto / Dependencias:** `TASK-04`, `TASK-07`.
- **Objetivo:** Implementar `McpClientAdapter`, `LocalWsAdapter` y `FileMailboxAdapter`, además de subida/descarga automática de artefactos en `daemon.ts`.
- **Archivos a crear/modificar:** `connectors/mrdev-connector/src/adapters/{mcpClientAdapter,localWsAdapter,fileMailboxAdapter,registry}.ts`, `connectors/mrdev-connector/src/core/daemon.ts`.
- **Requisitos de seguridad:** Mantener restricción `127.0.0.1`/`localhost` en `LocalWsAdapter` y validación de rutas en `FileMailboxAdapter`.

### `TASK-12` — Verificación Integral, CI de Seguridad y Despliegue Final
- **Contexto / Dependencias:** Todas las tareas anteriores (`TASK-01` a `TASK-11`).
- **Objetivo:** Actualizar `.github/workflows/security.yml` para cubrir `api/ops` y `connectors/mrdev-connector`, ejecutar todas las suites de prueba, verificar `npm run build` y probar el flujo E2E de MVP + DAG + Kill Switch en entorno controlado antes de publicar en `https://mrdev.lat`.
- **Criterio de finalización:** 100% de tests unitarios e integración pasando, `npm audit --audit-level=high` en verde en raíz y conector, 0 regresiones en el portafolio público y cabeceras HTTP verificadas en producción.
