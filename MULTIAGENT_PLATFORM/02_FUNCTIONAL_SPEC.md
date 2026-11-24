# Documento 2 — Especificación Funcional (`mrdev Ops Center`)

## 1. Actores del Sistema

| Actor | Descripción | Alcance y Capacidades |
| :--- | :--- | :--- |
| **Administrador (`mrdev` / Owner)** | Propietario único autenticado en `/ops`. | Registra máquinas, genera tokens de emparejamiento, administra agentes, crea espacios de trabajo, diseña flujos de tareas, envía mensajes, aprueba acciones sensibles y revoca accesos. |
| **Conector Local (`mrdev-connector`)** | Servicio ligero ejecutándose en cada computador físico o VM. | Mantiene conexión saliente cifrada, reporta heartbeats y recursos, descubre/verifica agentes locales, recibe tareas firmadas, ejecuta adaptadores, sube artefactos y respeta límites locales de seguridad. |
| **Agente de IA Local** | Trabajador autónomo dentro de una máquina (CLI, servidor HTTP, MCP, etc.). | Ejecuta subtareas o responde mensajes dentro del alcance del espacio de trabajo autorizado, produciendo logs, respuestas y artefactos. |
| **Orquestador Central (`/api/ops/*` + PostgreSQL)** | Núcleo de coordinación y auditoría en Vercel + Supabase. | Valida permisos, registra toda comunicación, evalúa dependencias DAG, encola/desbloquea tareas, exige aprobaciones humanas y emite eventos en tiempo real. |

---

## 2. Especificación por Módulo Funcional

### Módulo A — Registro y Administración de Máquinas
- **Objetivo:** Administrar todos los computadores donde residen agentes desde una sola interfaz sin exponer puertos entrantes en las máquinas.
- **Datos por máquina:**
  - `custom_name` (nombre personalizado, ej. `PC-Principal-Bogota`, `VPS-Scraping-01`).
  - `id` (UUID único global) + `machine_fingerprint` (hash no reversible de hostname + MAC/OS ID).
  - `os_type` (`windows` | `macos` | `linux`), `os_version`, `arch`.
  - `status`: **`connected` | `disconnected` | `busy` | `idle` | `error` | `reconnecting`**.
  - `last_heartbeat_at` (última comunicación).
  - Lista de agentes instalados, capacidades declaradas (`terminal`, `code`, `browser`, `files`, `api`, `documents`), recursos en tiempo real cuando el OS los provea (`cpu_percent`, `ram_used_mb`, `ram_total_mb`, `disk_free_gb`), tareas activas (`running`), historial de actividad y últimas alertas/errores.
- **Flujo de registro y emparejamiento:**
  1. El administrador pulsa *"Registrar nueva máquina"* y define nombre y directorio(s) base permitidos (`allowed_root_paths`).
  2. El servidor genera un **Token de Emparejamiento de Un Solo Uso** (TTL 10 minutos, almacenado como hash SHA-256).
  3. El administrador ejecuta en la máquina destino: `npx mrdev-connector pair --server https://mrdev.lat --token <OTP>`.
  4. El conector intercambia el token único por un par de credenciales propias de máquina (`machine_id` + `machine_secret` / clave pública Ed25519 registrada) y pasa a estado `connected`.
- **Criterios de aceptación:**
  - Un token de emparejamiento usado o expirado (>10 min) es rechazado con HTTP `401`.
  - Al pulsar *"Revocar Máquina"* (`status = revoked`), toda solicitud futura del conector falla inmediatamente con `403` y sus sesiones Realtime se invalidan.
  - Si una máquina deja de enviar heartbeat durante >45 segundos, su estado cambia a `reconnecting` y a los >90 segundos a `disconnected`.

---

### Módulo B — Administración de Agentes
- **Objetivo:** Gestionar el catálogo vivo de trabajadores IA distribuidos por máquina.
- **Perfil de cada agente:**
  - `name`, `slug`, `machine_id`, `specialty` (ej. *Investigador*, *Arquitecto*, *Desarrollador*, *QA*, *Revisor*), `description`.
  - `adapter_type` (`cli-subprocess` | `local-http` | `mcp-client` | `local-ws` | `file-mailbox`).
  - `adapter_config` (comando/ruta/puerto loopback local; **nunca contiene credenciales maestras en texto plano en UI**).
  - `tools` y `capabilities` (ej. `["terminal", "git", "playwright", "filesystem"]`).
  - `status`: `online` | `busy` | `idle` | `offline` | `disabled` | `error` | `revoked`.
  - Tareas asignadas actuales e historial de participación por espacio de trabajo y workflow.
- **Operaciones:** Crear/registrar, editar configuración/especialidad, habilitar (`enabled`), deshabilitar (`disabled` — rechaza nuevas tareas), y revocar (`revoked` — bloquea ejecución e invalida membresías).
- **Criterios de aceptación:**
  - Un agente en estado `disabled` o cuya máquina esté `disconnected` no puede recibir nuevas asignaciones inmediatas (o queda explicitado en estado `queued` esperando conexión si el usuario lo autoriza).

---

### Módulo C — Comunicación Multiagente Intermediada
- **Objetivo:** Permitir comunicación trazable 1:1, grupal y por difusión entre el administrador y los agentes de distintas máquinas, pasando obligatoriamente por el hub central.
- **Modalidades soportadas:**
  1. **Directa Humano → Agente** y **Agente ↔ Agente** (mediada por `ops_conversations` + `ops_messages`).
  2. **Conversaciones grupales** (sala multiagente dentro de un espacio de trabajo).
  3. **Difusión selectiva (Broadcast)** a un subconjunto explícito de agentes.
  4. **Tipos de mensaje estructurados (`message_type`):**
     - `instruction` (orden de trabajo).
     - `response` (respuesta/resultado).
     - `info_request` (solicitud de aclaración a otro agente o al humano).
     - `context_handoff` (transferencia formal de contexto + referencias a artefactos).
     - `status_update` (cambio de progreso).
     - `file_share` (adjunto de `artifact_id`).
     - `system_alert` (error, bloqueo o solicitud de aprobación).
- **Reglas de negocio críticas:**
  - **Cero comunicaciones laterales no autorizadas:** Un agente A en la Máquina 1 **nunca** se conecta por red directamente a la Máquina 2; todo mensaje se envía vía HTTPS al servidor central, se persiste en `ops_messages`, valida que ambos participantes pertenezcan al mismo `workspace_id`, y luego el servidor lo entrega al conector de la máquina destino.
  - Toda respuesta de un agente hacia otro agente lleva etiqueta de procedencia (`sender_agent_id`) y nunca se eleva a privilegio de instrucción de sistema.

---

### Módulo D — Espacios de Trabajo Aislados (Workspaces)
- **Objetivo:** Aislar proyectos, contextos, archivos y conversaciones por dominio operativo (*Desarrollo de software*, *Investigación comercial*, *Automatización empresarial*, *Marketing*, *Análisis de datos*, *Operaciones*).
- **Contenido de cada Workspace:**
  - Lista explícita de miembros (`ops_workspace_members`: qué agentes tienen acceso y con qué rol: `contributor` | `reviewer` | `observer`).
  - `system_instructions` (reglas generales del espacio de trabajo).
  - `shared_context` (resumen vivo o documento base del espacio).
  - `participation_rules` (ej. `max_parallel_tasks`, `require_human_approval_for_shell`, `allow_external_network`).
  - Conversaciones, tareas, workflows, artefactos e historial exclusivos de ese `workspace_id`.
- **Criterio de aceptación:**
  - Un agente que no pertenece a `workspace_id = X` recibe `403 FORBIDDEN` si su conector intenta leer mensajes, tareas o descargar artefactos del espacio `X`.

---

### Módulo E — Orquestador de Tareas y Flujos DAG
- **Objetivo:** Permitir al usuario diseñar y ejecutar flujos coordinados con control total sobre quién participa y en qué orden.
- **Capacidades:**
  - **Modos de ejecución:** Tarea individual, secuencia lineal (ej. *Investigador → Arquitecto → Desarrollador → QA → Revisor*), o **Grafo Acíclico Dirigido (DAG)** con ramas paralelas que convergen en un nodo posterior.
  - **Atributos de tarea:** Título, instrucciones específicas, `assigned_agent_id` (obligatorio o explícitamente elegido por el usuario — **prohibida la auto-asignación aleatoria sin consentimiento**), `priority` (`low` | `normal` | `high` | `urgent`), `dependencies` (`depends_on_task_id[]`), `requires_human_approval` (boolean), `max_retries` (0–3), `timeout_seconds`.
  - **Estados de tarea (`status`):**
    `draft` → `pending_dependencies` → `queued` → `dispatched` → `running` → (`waiting_approval` | `paused` | `retrying`) → (`completed` | `failed` | `cancelled`).
  - **Controles humanos:** Pausar tarea/workflow, reanudar, cancelar, reintentar manualmente, validar/rechazar entregable recibido, aprobar o denegar una solicitud sensible (`ops_approval_requests`).
- **Criterio de aceptación:**
  - Una tarea hija con `depends_on = [T1, T2]` permanece en `pending_dependencies` hasta que **ambas** (`T1` y `T2`) pasen a `completed`, heredando automáticamente sus `output_artifact_ids` y resumen de contexto en el payload de despacho.
  - Ciclos en dependencias (`A → B → A`) son rechazados en servidor con HTTP `422` antes de persistirse.

---

### Módulo F — Panel de Actividad en Tiempo Real
- **Objetivo:** Visibilidad unificada de toda la operación distribuida en vivo sin abrir máquinas individuales.
- **Indicadores reales (prohibido simular o inventar métricas):**
  - Agentes actualmente en estado `running` y tarea activa con duración real transcurrida.
  - Máquinas conectadas y su último `heartbeat` / consumo real si fue reportado por el OS.
  - Stream de eventos (`ops_activity_events`) y logs parciales en vivo vía Supabase Realtime (`Broadcast`).
  - Cola de **Aprobaciones Pendientes** (`waiting_approval`) y **Errores / Bloqueos** destacados arriba para intervención inmediata.
  - Línea de tiempo cronológica filtrable por espacio de trabajo, máquina, agente o tipo de evento.

---

### Módulo G — Gestión de Archivos y Contexto (Artefactos)
- **Objetivo:** Intercambiar código, documentos, capturas, logs y resultados sin duplicar archivos pesados en la base de datos ni saturar los payloads de mensajes.
- **Mecanismo:**
  1. Cuando un agente genera un archivo (o el admin sube un insumo), el conector o frontend solicita una **URL firmada de subida** (`POST /api/ops/artifacts/upload-url`) indicando `workspace_id`, `task_id`, `filename`, `mime_type`, `size_bytes` y `sha256`.
  2. El archivo se sube directamente a Supabase Storage (`ops-artifacts/{workspace_id}/{artifact_id}/{safe_filename}`) sin pasar binarios pesados por las funciones Serverless de Vercel.
  3. El servidor registra la metadata en `ops_artifacts` (`id`, `origin_type`, `author_agent_id`, `created_at`, `workspace_id`, `task_id`, `sha256`, `size_bytes`, `storage_path`).
  4. Al compartir el archivo con otro agente o en un mensaje, **solo se envía el `artifact_id` + metadata**; el conector receptor descarga el archivo únicamente si el agente está autorizado en ese `workspace_id` mediante una **URL firmada de descarga de 120 segundos** (`GET /api/ops/artifacts/:id/download-url`).
