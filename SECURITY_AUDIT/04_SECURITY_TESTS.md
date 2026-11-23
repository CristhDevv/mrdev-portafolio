# 04 — Pruebas de Seguridad Ejecutadas

## 1. Escaneo de Dependencias (`npm audit`)
- **`portafolio`:** `npm audit --audit-level=high` → **0 vulnerabilidades encontradas** (CORREGIDO Y VERIFICADO).
- **`DropRadar/dropradar-codigo`:** `npm audit --omit=dev` → **3 vulnerabilidades (1 CRITICAL, 2 HIGH)** (IDENTIFICADO, PENDIENTE DE CORRECCIÓN).
- **`misapuntesu`:** `npm audit --omit=dev` → **4 vulnerabilidades HIGH** (IDENTIFICADO, PENDIENTE DE CORRECCIÓN).
- **`Pidefacil`:** `npm audit --omit=dev` → **2 vulnerabilidades (1 HIGH, 1 MODERATE)** (IDENTIFICADO, PENDIENTE DE CORRECCIÓN).
- **`mrtender/mr-tender`:** `npm audit --omit=dev` → **1 vulnerabilidad HIGH** (IDENTIFICADO, PENDIENTE DE CORRECCIÓN).

## 2. Escaneo de Secretos en Código Fuente (`portafolio`)
- Búsqueda con expresiones regulares de tokens (`ghp_`, `vcp_`, `AIzaSy`, `SERVICE_ROLE`, `sk_live`, `sk_test`) sobre `src/`, `index.html` y `vercel.json`: **0 coincidencias** (CORREGIDO Y VERIFICADO).

## 3. Verificación Pasiva de Cabeceras HTTP (Producción)
- Se ejecutaron solicitudes `HEAD` no intrusivas contra los 8 dominios en producción.
- Tras desplegar `vercel.json` en `https://mrdev.lat`, se volverá a verificar con `Invoke-WebRequest -Method Head` que todas las cabeceras (`CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`) estén presentes en respuesta HTTP 200.

## 4. Limitaciones de Prueba
- No se ejecutaron pruebas de carga/DDoS ni fuzzing destructivo contra los servidores en producción por restricción explícita de seguridad operacional.
- No se auditaron políticas RLS internas en vivo dentro de los paneles de Supabase remotos (`NO VERIFICABLE CON EL ACCESO ACTUAL` sin credenciales administrativas de cada proyecto).
