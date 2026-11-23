# 03 — Registro de Remediación Implementada

## Cambios Aplicados en `portafolio` (`https://mrdev.lat`)

1. **Cabeceras de Seguridad HTTP en Producción ([vercel.json](file:///c:/Users/USER/Desktop/workspace/portafolio/vercel.json))**
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Content-Security-Policy` restrictiva:
     - `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
     - `frame-src` limitado explícitamente a los 3 orígenes embebibles permitidos (`https://mr-tender.vercel.app`, `https://misapuntesu.vercel.app`, `https://pidefacil-umber.vercel.app`).

2. **Aislamiento de Iframes y Prevención de Errores CSP ([LiveAppStage.tsx](file:///c:/Users/USER/Desktop/workspace/portafolio/src/components/LiveAppStage.tsx) y [projects.ts](file:///c:/Users/USER/Desktop/workspace/portafolio/src/data/projects.ts))**
   - Añadido `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` y `referrerPolicy="no-referrer"` al `<iframe>` en vivo.
   - Marcados `secop-sie` y `tesorapp` con `iframeBlocked: true` para respetar su política `frame-ancestors 'none'` / `X-Frame-Options: DENY` y mostrar su Vista HD 3D + enlace directo sin generar errores CSP en el navegador.

3. **Automatización Continua en CI/CD ([.github/workflows/security.yml](file:///c:/Users/USER/Desktop/workspace/portafolio/.github/workflows/security.yml))**
   - Configurado GitHub Action que ejecuta en cada `push` y `pull_request` a `main`:
     - `npm ci`
     - `npm audit --audit-level=high`
     - Escaneo regex de secretos potenciales en `src/`, `public/`, `index.html` y `vercel.json`
     - `npm run build` para validar TypeScript estricto y empaquetado.

4. **Higiene de Repositorio ([.gitignore](file:///c:/Users/USER/Desktop/workspace/portafolio/.gitignore))**
   - Excluidos `node_modules`, `dist`, `.vercel`, `.env`, `.env.*` y `*.log` antes de la publicación en GitHub.
