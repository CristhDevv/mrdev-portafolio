# Documento 1 — Auditoría del Proyecto Existente (`portafolio` / `mrdev.lat`)

**Fecha de auditoría:** 2026-11-24  
**Repositorio analizado:** `c:\Users\USER\Desktop\workspace\portafolio` (`https://github.com/CristhDevv/mrdev-portafolio`)  
**Producción actual:** `https://mrdev.lat` (alias en Vercel `mrdev-portafolio.vercel.app`, región `iad1`)

---

## 1. Estado Real del Repositorio y Stack Actual

| Dimensión | Estado Observado en el Repositorio | Archivo Fuente |
| :--- | :--- | :--- |
| **Framework Frontend** | React `^19.1.0` + React DOM `^19.1.0` | `package.json` |
| **Bundler / Dev Server** | Vite `^6.3.5` + `@vitejs/plugin-react ^4.4.1` | `package.json`, `vite.config.ts` |
| **Lenguaje y Tipado** | TypeScript `~5.8.3` en modo estricto (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) | `tsconfig.json` |
| **Iconografía y Estilos** | `lucide-react ^0.511.0` + CSS modular propio (`src/index.css`, sistema *Aurora & Glass* con variables dinámicas) | `package.json`, `src/index.css` |
| **Backend Actual** | **Inexistente** (actualmente es una SPA 100% estática en `dist/` sin carpeta `/api`) | Estructura raíz |
| **Base de Datos Actual** | **Inexistente en este repo** (los datos del portafolio viven en `src/data/projects.ts`) | `src/data/projects.ts` |
| **Autenticación Actual** | **Inexistente** (el portafolio es público; no existe tabla de usuarios, login ni cookies de sesión) | `src/App.tsx` |
| **Almacenamiento Actual** | Estático en `public/screenshots/*.png` (7 capturas PNG) | `public/screenshots/` |
| **Comunicación en Tiempo Real** | **Inexistente** | — |
| **Hosting y CDN** | Vercel (proyecto `mrdev-portafolio`, dominio `mrdev.lat` vía Namecheap DNS) | `.vercel/`, `vercel.json` |
| **Seguridad HTTP y CI/CD** | Cabeceras estrictas (`CSP`, `HSTS`, `XFO: DENY`, `nosniff`, `COOP`, `Permissions-Policy`) y GitHub Actions (`security.yml`) | `vercel.json`, `.github/workflows/security.yml` |
| **Gestión de Variables de Entorno** | Ninguna variable `.env` presente actualmente; `.gitignore` bloquea `.env`, `.env.*`, `.vercel`, `dist`, `node_modules` | `.gitignore` |

---

## 2. Arquitectura y Convenciones del Código Existente

1. **Punto de entrada único (`src/main.tsx` → `src/App.tsx`):**
   - `App.tsx` maneja estado local (`activeIndex`, `contactOpen`, `cursor`) y renderiza el fondo Aurora (`.aurora-bg`), `<Hero3DDeck />`, `<LiveAppStage />`, `<footer>`, `<MacDock />` y `<ContactModal />`.
   - No utiliza `react-router-dom` actualmente; toda la navegación es por estado de React y anclas (`#live-stage`), con barra inferior fija (`MacDock.tsx`).
2. **Identidad visual reutilizable (`src/index.css`):**
   - Fondo `#06080f`, luces Aurora reactivas (`--active-accent`, `--active-secondary`), tarjetas de vidrio esmerilado (`backdrop-filter: blur`), tipografía `Plus Jakarta Sans` + `Inter` + `JetBrains Mono` cargada desde Google Fonts.
3. **Política de Seguridad Vigente (`vercel.json`):**
   - `Content-Security-Policy` actual:
     `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; frame-src https://misapuntesu.vercel.app https://pidefacil-umber.vercel.app; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
   - **Conflicto crítico si no se actualiza:** `connect-src 'self'` y `img-src 'self' data: blob:` bloquearán peticiones al backend de Supabase Realtime (`wss://*.supabase.co`) y descargas firmadas de Supabase Storage (`https://*.supabase.co`) a menos que se amplíen explícitamente en `vercel.json` durante la implementación.

---

## 3. Análisis de Limitaciones Reales de la Infraestructura Actual (Vercel)

Para cumplir el requisito de **no contratar otro hosting web** y mantener todo dentro de `mrdev-portafolio` en Vercel (`mrdev.lat`), se deben asumir estas restricciones técnicas reales:

1. **Sin WebSockets persistentes en Serverless:**
   - Las Vercel Functions (`/api/ops/*`) son efímeras (ejecución por solicitud HTTP, timeout estándar de 10s en Hobby / 60s en Pro). **No pueden mantener conexiones WebSocket abiertas** con los conectores de las máquinas ni con el navegador.
   - *Solución arquitectónica:* Delegar el canal WebSocket persistente y la detección de presencia (`Presence`, `Broadcast`, `Postgres Changes`) a **Supabase Realtime** (que mantiene el broker WebSocket gestionado en la nube, tecnología ya utilizada por el ecosistema `mrdev` en `benditastore`, `tesorapp`, `DropRadar`, `mrtender` y `Pidefacil`).
2. **Sin procesos en segundo plano ni cron continuo sub-minuto en Vercel:**
   - Vercel no mantiene colas residentes ni workers infinitos.
   - *Solución arquitectónica:* Orquestación orientada a eventos en PostgreSQL + API Serverless (`/api/ops/*`): cuando un conector completa una tarea (`POST /api/ops/connector/tasks/:id/complete`), el propio endpoint evalúa en una transacción SQL el grafo DAG (`ops_task_dependencies`), desbloquea automáticamente las tareas hijas cuyas dependencias quedaron `completed` y emite la señal por Supabase Realtime (más un sweep periódico opcional vía Vercel Cron o heartbeat del conector para detectar timeouts/máquinas caídas).
3. **Sin servidor de archivos local persistente:**
   - El sistema de archivos de Vercel Functions es efímero y de solo lectura fuera de `/tmp`.
   - *Solución arquitectónica:* **Supabase Storage** con bucket privado `ops-artifacts` y URLs firmadas de corta duración (60–300 segundos) emitidas bajo demanda desde `/api/ops/artifacts/*`.
4. **Ruteo SPA vs Funciones Serverless (`/api/ops/*`):**
   - Si se añade soporte de rutas cliente (por ejemplo `/ops` además de `/`), `vercel.json` deberá incluir un `rewrites` cuidadoso que **nunca intercepte `/api/(.*)`** hacia `index.html`.
5. **Aislamiento del bundle público del portafolio:**
   - El código de la plataforma multiagente (`src/ops/**` y `@supabase/supabase-js`) debe cargarse mediante `React.lazy()` únicamente cuando el administrador acceda al Centro de Operaciones (`/ops`), manteniendo intacto el rendimiento y cero exposición funcional para los visitantes comerciales de `mrdev.lat`.

---

## 4. Matriz: Qué se Reutiliza vs. Qué Debe Construirse

| Componente | Decisión | Detalle Técnico |
| :--- | :--- | :--- |
| **Repositorio, Vite, React 19, TypeScript, `lucide-react`** | **Reutilizar** | Misma base, `tsconfig.json` estricto y pipeline `npm run build` |
| **Sistema Visual *Aurora & Glass* y `MacDock`** | **Reutilizar y extender** | Se añade un acceso discreto (ej. botón `Ops` o atajo `/ops`) sin alterar la experiencia comercial del portafolio |
| **Despliegue Vercel (`mrdev.lat`) y CI (`security.yml`)** | **Reutilizar y extender** | Se agregan `/api/ops/*`, variables de entorno en Vercel y rewrites en `vercel.json` |
| **Capa de Autenticación Admin (`/ops`)** | **Construir** | Autenticación real con **Supabase Auth** (login único de administrador `OWNER_EMAIL` + MFA TOTP opcional + verificación de JWT en cada `/api/ops/*`) |
| **Base de Datos y Persistencia (`ops_*`)** | **Construir** | Tablas PostgreSQL en **Supabase** + RLS estricto (`04_DATA_MODEL.md`) |
| **Capa API Serverless (`/api/ops/*`)** | **Construir** | Endpoints REST autenticados para Admin UI y endpoints firmados HMAC/Ed25519 para Conectores |
| **Conector Local (`connectors/mrdev-connector/`)** | **Construir** | Servicio CLI ligero multiplataforma (Node.js/TS) instalable en cada máquina + 5 adaptadores de agentes |
| **Interfaz del Centro de Operaciones (`src/ops/`)** | **Construir** | 10 vistas modulares en React con lazy-loading |

---

## 5. Incertidumbres Documentadas y Decisiones Recomendadas

1. **Incertidumbre: Plan actual de Vercel (Hobby vs Pro) y proyecto Supabase dedicado vs compartido.**
   - *Decisión recomendada:* Diseñar todas las funciones `/api/ops/*` para responder en **< 3 segundos** (compatible con el límite de 10s del plan Hobby) y usar un proyecto Supabase dedicado (o esquema aislado con prefijo `ops_` y clave `service_role` exclusiva en variables de servidor de Vercel) para evitar mezclar datos del centro de operaciones con proyectos comerciales como `benditastore` o `tesorapp`.
2. **Incertidumbre: Naturaleza exacta de los agentes en cada computador (CLI, HTTP local, MCP, scripts).**
   - *Decisión recomendada:* No acoplarse a ningún SDK propietario; definir la interfaz `AgentRuntimeAdapter` con 5 adaptadores estándar (`cli-subprocess`, `local-http`, `mcp-client`, `local-ws`, `file-mailbox`) configurables por archivo declarativo local `~/.mrdev-connector/agents.json`.
3. **Incertidumbre: "Respetar su autenticación actual" en un portafolio que hoy no tiene login.**
   - *Decisión recomendada:* Mantener el portafolio público (`/` — Showcase de 7 proyectos) **100% abierto sin login**, e introducir una barrera de autenticación estricta **exclusivamente** para el Centro de Operaciones (`/ops` y `/api/ops/*`), protegiendo todas las capacidades de administración y ejecución mediante Supabase Auth + verificación en servidor de identidad de propietario único (`ADMIN_USER_ID` / `ADMIN_EMAIL` en variable de entorno del servidor).
