# Documento 8 — Plan de Implementación por Etapas (MVP → Avanzado)

## Resumen de la Estrategia
Las **Etapas 0 a 4** conforman el **MVP Funcional y Verificable** (registrar máquina, conectar conector, registrar agente, mensajería 1:1 y agente↔agente, asignar tarea simple y ver historial en vivo). Las **Etapas 5 a 7** añaden aislamiento avanzado por workspaces, intercambio de archivos/artefactos, orquestador DAG con aprobaciones humanas y hardening final.

---

### Etapa 0 — Base de Datos, Variables de Entorno y Esqueleto API
- **Objetivo:** Preparar Supabase (tablas `ops_*`, RLS y bucket `ops-artifacts`) y configuración de Vercel/TypeScript sin alterar el portafolio público.
- **Archivos involucrados:** `supabase/migrations/20261124_001_ops_schema.sql`, `package.json`, `tsconfig.api.json`, `vercel.json` (rewrites `/ops` + `connect-src` Supabase).
- **Dependencias:** Ninguna.
- **Criterios de aceptación:** Migración SQL ejecutada sin errores; todas las 18 tablas con `RLS = true`; `npm run build` del portafolio sigue pasando intacto.
- **Pruebas / Validaciones:** Verificar con consultas SQL como `anon` que todas las tablas retornan `0` filas / `permission denied`.
- **Riesgos:** Romper rutas del portafolio o CSP existente → *Mitigación:* excluir `/api/*` de rewrites y probar `https://mrdev.lat` tras el ajuste de `vercel.json`.

---

### Etapa 1 — Autenticación de Admin (`/ops`) y Registro de Máquinas (MVP)
- **Objetivo:** Proteger `/ops` con Supabase Auth (acceso exclusivo `OPS_OWNER_EMAIL`) y permitir crear máquinas + generar tokens OTP de emparejamiento de 10 minutos + Kill Switch.
- **Archivos involucrados:** `api/ops/_lib/{supabaseAdmin,adminAuth,auditLogger,schemas}.ts`, `api/ops/machines/{index.ts,[id]/pairing-token.ts,[id]/revoke.ts}`, `src/ops/services/{supabaseClient,opsApi}.ts`, `src/ops/components/{OpsLoginGate,OpsLayout,PairingModal}.tsx`, `src/ops/views/MachinesView.tsx`, `src/App.tsx`, `src/components/MacDock.tsx`.
- **Dependencias:** Etapa 0.
- **Criterios de aceptación:** Usuario no autenticado en `/ops` solo ve `OpsLoginGate`; llamadas sin JWT válido a `/api/ops/machines` devuelven `401`; el OTP generado expira a los 10 minutos y se almacena solo su hash SHA-256.
- **Pruebas:** Test de autenticación negativa (`401`/`403`) y test de rotación/revocación de máquina.

---

### Etapa 2 — Conector Local (`mrdev-connector`), Emparejamiento y Adaptadores Base (MVP)
- **Objetivo:** Construir el conector instalable multiplataforma que empareja con OTP, firma peticiones con Ed25519, envía heartbeats cada 20s y expone los primeros 2 adaptadores (`CliSubprocessAdapter` y `LocalHttpAdapter`).
- **Archivos involucrados:** `api/ops/_lib/connectorAuth.ts`, `api/ops/connector/{pair.ts,heartbeat.ts,sync.ts}`, `connectors/mrdev-connector/**` (CLI + daemon + crypto + securityGuard + registry + `cliSubprocessAdapter` + `localHttpAdapter`).
- **Dependencias:** Etapa 1.
- **Criterios de aceptación:** Ejecutar `mrdev-connector pair --token <OTP>` registra la máquina en estado `connected`; el heartbeat actualiza recursos reales (CPU/RAM/disco) en UI; peticiones con firma inválida o nonce repetido devuelven `401`/`409`.
- **Pruebas:** `tests/ops/connectorAuth.test.ts` (firma válida, firma alterada, timestamp expirado >60s, replay nonce) y `tests/ops/securityGuard.test.ts` (bloqueo de Path Traversal).

---

### Etapa 3 — Registro de Agentes y Comunicación Multiagente Intermediada (MVP)
- **Objetivo:** Registrar/detectar agentes locales, ver su estado en UI y permitir conversaciones Humano ↔ Agente y Agente ↔ Agente pasando obligatoriamente por el hub central.
- **Archivos involucrados:** `api/ops/agents/*`, `api/ops/conversations/index.ts`, `api/ops/messages/index.ts`, `api/ops/connector/messages.ts`, `src/ops/views/{AgentsView,CommsView}.tsx`.
- **Dependencias:** Etapa 2.
- **Criterios de aceptación:** Un mensaje enviado desde `/ops` llega al conector en <2s vía Realtime (o en el siguiente ciclo de `sync`), el agente responde y la respuesta aparece en `CommsView`; dos agentes en máquinas distintas intercambian mensajes quedando ambos trazados en `ops_messages` y `ops_audit_logs`.
- **Pruebas:** Prueba de mensajería bidireccional entre dos conectores simulados en terminales locales distintas.

---

### Etapa 4 — Tareas Simples, Panel en Vivo e Historial (MVP Completo)
- **Objetivo:** Crear y asignar una tarea manual a un agente, reclamarla atómicamente (`claim`), ver su progreso en tiempo real en `LiveActivityView` y consultar el historial cronológico.
- **Archivos involucrados:** `api/ops/overview.ts`, `api/ops/workflows/index.ts` (modo tarea única), `api/ops/connector/tasks/[id]/{claim,complete,fail}.ts`, `src/ops/hooks/useOpsRealtime.ts`, `src/ops/views/{OverviewView,LiveActivityView,HistoryView}.tsx`.
- **Dependencias:** Etapa 3.
- **Criterios de aceptación:** El MVP completo de 10 pasos (sección 9 del prompt) funciona end-to-end; dos intentos simultáneos de `claim` sobre la misma tarea solo permiten que 1 la tome (`200` vs `409`).

---

### Etapa 5 — Espacios de Trabajo Aislados y Gestión de Artefactos
- **Objetivo:** Activar creación/administración de Workspaces con membresías estrictas y flujo completo de subida/descarga de archivos con URLs firmadas de Supabase Storage.
- **Archivos involucrados:** `api/ops/workspaces/*`, `api/ops/artifacts/{upload-url.ts,[id]/download-url.ts}`, `src/ops/views/{WorkspacesView,ArtifactsView}.tsx`, soporte de artefactos en `mrdev-connector`.
- **Dependencias:** Etapa 4.
- **Criterios de aceptación:** Un agente fuera de `workspace_id` recibe `403` al intentar descargar un artefacto o leer mensajes de ese espacio; los archivos subidos por Agente A son descargados y leídos automáticamente por Agente B al recibir la referencia `artifact_id`.
- **Pruebas:** `tests/ops/workspaceIsolation.test.ts`.

---

### Etapa 6 — Orquestador DAG Completo, Aprobaciones Humanas y Adaptadores Restantes
- **Objetivo:** Activar flujos secuenciales y paralelos con dependencias DAG, controles (`pause`, `resume`, `cancel`, `retry`), cola de aprobaciones humanas (`waiting_approval`) y los 3 adaptadores restantes (`McpClientAdapter`, `LocalWsAdapter`, `FileMailboxAdapter`).
- **Archivos involucrados:** `api/ops/_lib/dagEngine.ts`, `api/ops/tasks/[id]/control.ts`, `api/ops/approvals/[id]/decision.ts`, `api/ops/connector/tasks/[id]/request-approval.ts`, `src/ops/components/{DagWorkflowBuilder,ApprovalBanner}.tsx`, `src/ops/views/{OrchestratorView,SecurityView}.tsx`, los 3 adaptadores restantes en `connectors/mrdev-connector/src/adapters/`.
- **Dependencias:** Etapa 5.
- **Criterios de aceptación:** Un workflow de 5 pasos (Investigador → Arquitecto → Dev [en paralelo con Tests] → Revisor) ejecuta en el orden exacto de dependencias; toda acción `high` detiene la tarea en `waiting_approval` hasta que el admin pulsa `Aprobar`.
- **Pruebas:** `tests/ops/dagEngine.test.ts` (detección de ciclos, desbloqueo paralelo, propagación de fallos).

---

### Etapa 7 — Hardening Final, Pruebas E2E y Despliegue en `mrdev.lat`
- **Objetivo:** Verificar cobertura de seguridad, responsividad móvil/escritorio de `/ops`, bundle público intacto y despliegue en producción.
- **Archivos involucrados:** `.github/workflows/security.yml`, `tests/ops/*`, documentación de cierre.
- **Dependencias:** Etapa 6.
- **Criterios de aceptación:** `npm run build` y suites de test en verde; portafolio público `/` sin degradación visual ni de carga; cabeceras CSP y endpoints `/api/ops/*` validados contra accesos no autenticados.
