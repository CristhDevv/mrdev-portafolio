# 06 — Riesgos Residuales y Acciones Pendientes

| ID | Aplicación | Riesgo Residual / Limitación | Gravedad | Acción Recomendada |
| :--- | :--- | :--- | :--- | :--- |
| RES-01 | **Operativa (Tokens)** | Tokens de GitHub y Vercel utilizados en el chat de despliegue siguen activos hasta que el propietario los revoque. | **CRÍTICA** | Revocar y regenerar ambos tokens en GitHub Settings → Developer Settings y Vercel Account Settings → Tokens. |
| RES-02 | **DropRadar** | `npm audit --omit=dev` reporta 3 vulnerabilidades (1 crítica, 2 altas) y falta `.gitignore` en el directorio raíz `DropRadar/`. | **ALTA** | Ejecutar `npm audit fix` en `DropRadar/dropradar-codigo` con pruebas de regresión y añadir `.gitignore` en la raíz. |
| RES-03 | **MisApuntesU** | 4 vulnerabilidades altas en dependencias, ausencia de `vercel.json` / cabeceras HTTP (`CSP`, `X-Frame-Options`, `nosniff`) y uso de `rehype-raw`. | **ALTA** | Añadir `rehype-sanitize` junto a `rehype-raw`, configurar cabeceras en `next.config.ts` y ejecutar `npm audit fix`. |
| RES-04 | **PideFácil.co** | 2 vulnerabilidades (1 alta, 1 moderada), ausencia de cabeceras HTTP (`CSP`, `X-Frame-Options`, `nosniff`) y carpeta local `.secrets/`. | **ALTA** | Configurar cabeceras en `next.config.mjs`, actualizar dependencias y verificar que `.secrets/` no esté rastreada en Git. |
| RES-05 | **Mr. Tender** | 1 vulnerabilidad alta en `mr-tender` y ausencia de cabeceras HTTP defensivas en `mr-tender.vercel.app`. | **MEDIA-ALTA** | Agregar cabeceras CSP / `nosniff` / `Referrer-Policy` / `Permissions-Policy` y actualizar la dependencia afectada. |
| RES-06 | **Supabase / BDs** | No es verificable con el acceso actual el estado en vivo de todas las políticas RLS remotas en Supabase ni claves en variables de entorno de Vercel. | **NO VERIFICABLE** | Auditar cada proyecto en el SQL Editor de Supabase verificando `relrowsecurity = true` en todas las tablas del esquema `public`. |
