# Documento 5 — Contratos de Comunicación y Protocolos

## 1. Sobre Estándar de Mensajes y Eventos (`Envelope v1`)

Todo evento entre Servidor Central, Conector Local y Frontend utiliza un contrato JSON uniforme:

```typescript
export interface OpsEnvelope<T = unknown> {
  schema_version: '1.0';
  event_id: string;        // UUID v4 único
  correlation_id: string;  // UUID para trazar flujos completos multi-máquina
  idempotency_key: string; // UUID para deduplicación segura ante reintentos
  timestamp: string;       // ISO 8601 UTC (ej. 2026-11-24T18:30:00.000Z)
  source: {
    kind: 'admin' | 'server' | 'connector' | 'agent';
    machine_id?: string;
    agent_id?: string;
  };
  type: string;            // Ej: "task.dispatched", "message.created", "approval.requested"
  payload: T;
}
```

### Autenticación de Peticiones del Conector (`Ed25519` + Anti-Replay)
Toda petición `POST/GET` hacia `/api/ops/connector/*` debe incluir estas cabeceras HTTP:
- `X-Ops-Machine-Id`: UUID de la máquina.
- `X-Ops-Key-Fingerprint`: Huella SHA-256 de la clave pública registrada.
- `X-Ops-Timestamp`: Unix epoch en milisegundos (ventana máxima permitida: **±60 segundos**).
- `X-Ops-Nonce`: UUID v4 único por petición (rechazado con `409 REPLAY_DETECTED` si ya existe en `ops_used_nonces`).
- `X-Ops-Signature`: Firma Ed25519 en Base64 sobre la cadena canónica:
  `${METHOD}\n${PATH}\n${X-Ops-Timestamp}\n${X-Ops-Nonce}\n${SHA256_HEX(RAW_BODY)}`

---

## 2. Contratos API REST (Vercel Serverless `/api/ops/*`)

### A. Endpoints para Administrador (`/api/ops/*` — Requiere `Authorization: Bearer <Supabase_JWT>` + `ops_role === 'owner'`)

| Método | Ruta | Entrada | Salida / Efecto |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ops/overview` | — | Estado agregado real de máquinas, agentes, tareas activas y aprobaciones pendientes. |
| `POST` | `/api/ops/machines` | `{ custom_name, os_type, allowed_root_paths }` | Crea máquina en estado `disconnected` y genera OTP único (TTL 10 min). |
| `POST` | `/api/ops/machines/:id/pairing-token` | — | Regenera un token de emparejamiento de un solo uso para la máquina. |
| `POST` | `/api/ops/machines/:id/revoke` | `{ reason }` | **Kill Switch:** revoca credenciales, marca máquina `revoked`, registra auditoría. |
| `PATCH` | `/api/ops/agents/:id` | `{ name?, specialty?, is_enabled?, status? }` | Edita, habilita, deshabilita o revoca un agente. |
| `POST` | `/api/ops/workspaces` | `{ name, domain_category, system_instructions, agent_ids[] }` | Crea espacio de trabajo aislado y membresías. |
| `POST` | `/api/ops/conversations` | `{ workspace_id, title, kind, participant_agent_ids[] }` | Abre conversación 1:1, grupal o broadcast dentro del workspace. |
| `POST` | `/api/ops/messages` | `{ workspace_id, conversation_id, target_agent_id?, content, artifact_ids?, message_type }` | Persiste mensaje humano/broadcast y notifica al conector destino vía Realtime. |
| `POST` | `/api/ops/workflows` | `{ workspace_id, title, goal, tasks: CreateTaskInput[] }` | Valida ausencia de ciclos DAG, crea workflow y tareas iniciales (`queued` / `pending_dependencies`). |
| `POST` | `/api/ops/tasks/:id/control` | `{ action: 'pause' \| 'resume' \| 'cancel' \| 'retry' }` | Control manual sobre ejecución de tareas. |
| `POST` | `/api/ops/approvals/:id/decision` | `{ decision: 'approved' \| 'rejected', note? }` | Desbloquea o aborta tarea en espera de aprobación humana. |
| `POST` | `/api/ops/artifacts/upload-url` | `{ workspace_id, task_id?, filename, mime_type, size_bytes, sha256 }` | Valida extensión/tamaño y devuelve URL firmada de subida a Supabase Storage. |
| `GET` | `/api/ops/artifacts/:id/download-url` | — | Devuelve URL firmada temporal (120s) validando permisos del workspace. |

---

### B. Endpoints para Conectores Locales (`/api/ops/connector/*`)

1. **Emparejamiento (`POST /api/ops/connector/pair`)** *(No usa firma Ed25519 previa; autentica con OTP de 1 uso)*
   ```json
   // Request
   {
     "otp_token": "mrpair_9f8a...",
     "public_key_ed25519": "MCowBQYDK2VwAyEA...",
     "machine_fingerprint": "sha256:...",
     "os_info": { "os_type": "windows", "os_version": "11", "arch": "x64" },
     "discovered_agents": [
       { "slug": "claude-dev", "name": "Claude Code", "adapter_type": "cli-subprocess", "capabilities": ["code", "terminal"] }
     ]
   }
   ```
   ```json
   // Response 200 OK
   {
     "machine_id": "uuid",
     "key_fingerprint": "sha256:...",
     "realtime": { "url": "https://xxx.supabase.co", "anon_key": "...", "channel_token": "jwt_machine_scoped" }
   }
   ```

2. **Heartbeat y Estado (`POST /api/ops/connector/heartbeat`)** *(Cada 20s)*
   ```json
   {
     "machine_status": "idle",
     "resources": { "cpu_percent": 22.4, "ram_used_mb": 8420, "ram_total_mb": 16384, "disk_free_gb": 118.5 },
     "agents": [{ "agent_id": "uuid", "status": "idle", "active_tasks": 0 }]
   }
   ```

3. **Sincronización por Cursor (`GET /api/ops/connector/sync?since_task_seq=104&since_msg_seq=512`)**
   - Recupera tareas en estado `queued` asignadas a agentes de esa máquina y mensajes pendientes `persisted` destinados a sus agentes.

4. **Reclamo Atómico de Tarea (`POST /api/ops/connector/tasks/:taskId/claim`)**
   - Ejecuta transición atómica `queued -> running` (evita doble ejecución si llegan señal Realtime y polling simultáneamente). Retorna `409 TASK_ALREADY_CLAIMED` si otro intento ya la reclamó.

5. **Solicitud de Aprobación Humana (`POST /api/ops/connector/tasks/:taskId/request-approval`)**
   ```json
   {
     "risk_level": "high",
     "action_type": "shell_destructive_or_external",
     "action_summary": "Ejecutar migración SQL en base de datos local",
     "action_payload": { "command": "npx prisma migrate deploy", "cwd": "C:\\Users\\USER\\proyecto" }
   }
   ```
   - Pasa la tarea a `waiting_approval` y bloquea el adaptador local hasta recibir `approval.decided`.

6. **Finalización o Fallo (`POST /api/ops/connector/tasks/:taskId/complete` | `.../fail`)**
   - `complete` recibe `{ idempotency_key, output_summary, output_artifact_ids, metrics }`. El backend marca la tarea `completed`, verifica dependencias DAG y encola automáticamente las tareas descendientes listas.

7. **Envío de Mensaje Inter-Agente (`POST /api/ops/connector/messages`)**
   - El servidor verifica que `sender_agent_id` pertenece a la máquina firmante y que tanto emisor como receptor son miembros de `workspace_id`.

---

## 3. Contrato de Adaptadores en el Conector Local (`AgentRuntimeAdapter`)

```typescript
export type AdapterType =
  | 'cli-subprocess'
  | 'local-http'
  | 'mcp-client'
  | 'local-ws'
  | 'file-mailbox';

export interface AgentTaskPayload {
  taskId: string;
  workspaceId: string;
  correlationId: string;
  /** Instrucción aprobada por el administrador / orquestador */
  systemDirective: string;
  /** Contexto proveniente de otros agentes o archivos: tratado SIEMPRE como no confiable */
  untrustedInputs: {
    fromAgents: Array<{ agentName: string; summary: string }>;
    artifacts: Array<{ artifactId: string; filename: string; localPath: string }>;
  };
  workingDirectory: string;
  timeoutSeconds: number;
}

export interface AgentRuntimeAdapter {
  readonly type: AdapterType;
  healthCheck(): Promise<{ healthy: boolean; detail?: string }>;
  executeTask(
    payload: AgentTaskPayload,
    hooks: {
      onStreamChunk: (chunk: string) => void;
      onRequestApproval: (req: { riskLevel: 'medium' | 'high' | 'critical'; summary: string; payload: unknown }) => Promise<boolean>;
      onSendPeerMessage: (toAgentSlug: string, content: string, messageType: string) => Promise<void>;
    },
    abortSignal: AbortSignal
  ): Promise<{
    summary: string;
    producedFiles: string[];
  }>;
  sendMessage(message: {
    conversationId: string;
    fromLabel: string;
    content: string;
    isUntrustedPeer: boolean;
  }): Promise<{ reply?: string }>;
}
```

---

## 4. Canales Supabase Realtime y Manejo de Errores

| Canal | Tipo | Participantes | Uso |
| :--- | :--- | :--- | :--- |
| `ops:presence` | Presence | Conectores + UI Admin | Detección instantánea de máquinas online/offline |
| `ops:machine:{machine_id}` | Broadcast | Servidor → Conector específico | Señales `task.queued`, `message.new`, `approval.decided`, `machine.revoked` |
| `ops:workspace:{workspace_id}` | Broadcast + Postgres Changes | Servidor → UI Admin | Stream de logs en vivo, cambios de tareas y chat grupal |

### Códigos de Error Estándar y Política de Reintentos
- `401 INVALID_SIGNATURE` / `401 TOKEN_EXPIRED`: No reintentar; pasar conector a estado `error` y pedir re-emparejamiento.
- `403 MACHINE_REVOKED`: Detener inmediatamente todos los adaptadores en curso (`AbortController.abort()`), borrar credenciales locales y cerrar el demonio.
- `409 REPLAY_DETECTED` / `409 TASK_ALREADY_CLAIMED`: Descartar acción duplicada de forma idempotente.
- `429 RATE_LIMITED` / `5xx`: Reintento con **Exponential Backoff + Jitter** (`2s`, `4s`, `8s`, `16s`, `32s`, máx. `60s`), encolando resultados locales en SQLite/JSONL hasta recuperar conectividad.
