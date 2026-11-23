# 02 — Auditoría Inicial de Seguridad

## 1. Hallazgos en `portafolio` (`https://mrdev.lat`) — Línea Base Inicial

| ID | Gravedad | Hallazgo Observado | Estado |
| :--- | :--- | :--- | :--- |
| PORT-01 | **MEDIA** | Ausencia de `vercel.json` y cabeceras HTTP defensivas (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`). | **CORREGIDO Y VERIFICADO** |
| PORT-02 | **BAJA** | `<iframe>` en `LiveAppStage.tsx` sin atributos `sandbox` ni `referrerPolicy="no-referrer"`, y `secop-sie` / `tesorapp` intentaban embeberse pese a enviar `frame-ancestors 'none'` en producción. | **CORREGIDO Y VERIFICADO** |
| PORT-03 | **INFORMATIVA** | Ausencia de workflow de seguridad en CI/CD (`.github/workflows/security.yml`) para `npm audit` y escaneo de secretos. | **CORREGIDO Y VERIFICADO** |
| PORT-04 | **CRÍTICA (Operativa)** | Tokens personales de GitHub y Vercel fueron compartidos en la sesión de chat para automatizar el despliegue (no están en el código fuente, pero deben rotarse). | **IDENTIFICADO, PENDIENTE DE ROTACIÓN POR USUARIO** |

## 2. Hallazgos Observados en los 7 Sistemas Hermanos (Inspección Pasiva + `npm audit`)

| Aplicación | Hallazgos Observados | Estado |
| :--- | :--- | :--- |
| **Mr. Tender** (`mr-tender.vercel.app`) | Faltan cabeceras HTTP: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. `npm audit --omit=dev`: **1 vulnerabilidad HIGH**. Ya cuenta con `SECURITY_AUDIT/` propio. | **IDENTIFICADO, PENDIENTE DE CORRECCIÓN EN SU REPO** |
| **MisApuntesU** (`misapuntesu.vercel.app`) | Faltan cabeceras HTTP (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). `npm audit --omit=dev`: **4 vulnerabilidades HIGH**. Usa `rehype-raw` (riesgo XSS si procesa HTML no sanitizado). No tiene `vercel.json` ni `SECURITY_AUDIT/`. | **IDENTIFICADO, PENDIENTE DE CORRECCIÓN EN SU REPO** |
| **PideFácil.co** (`pidefacil-umber.vercel.app`) | Faltan cabeceras HTTP (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). `npm audit --omit=dev`: **2 vulnerabilidades (1 HIGH, 1 MODERATE)**. Existe carpeta `.secrets/` en su directorio local. | **IDENTIFICADO, PENDIENTE DE CORRECCIÓN EN SU REPO** |
| **DropRadar** (`dropradar.site`) | `npm audit --omit=dev`: **3 vulnerabilidades (1 CRITICAL, 2 HIGH)**. Sin `.gitignore` en la raíz `DropRadar/`. Cabeceras HTTP de producción ya endurecidas (`CSP`, `HSTS`, `X-Frame-Options: SAMEORIGIN`, `nosniff`). | **IDENTIFICADO, PENDIENTE DE CORRECCIÓN EN SU REPO** |
| **SECOP SIE** (`secop-intelligence-engine.vercel.app`) | Cabeceras HTTP completas y fuertes (`CSP`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`). *Detalle:* `connect-src` en producción aún incluye `http://localhost:8000` y `http://127.0.0.1:8000`. | **MITIGADO PARCIALMENTE** |
| **Bendita Store** (`benditastore.com.co`) | Cabeceras HTTP completas (`CSP`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `HSTS`, `nosniff`, `Permissions-Policy`). Ya cuenta con `SECURITY_AUDIT/`. | **ENDURECIDO EN HEADERS (AUDITORÍA INTERNA NO MODIFICADA)** |
| **TesorApp** (`tesor-app-nine.vercel.app`) | Cabeceras HTTP completas (`CSP`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `HSTS`, `nosniff`, `Permissions-Policy`). Ya cuenta con `SECURITY_AUDIT/`. | **ENDURECIDO EN HEADERS (AUDITORÍA INTERNA NO MODIFICADA)** |
