# 05 — Seguridad de Infraestructura y Despliegue

## 1. Hosting, CDN y TLS
- **Proveedor:** Vercel (`iad1`), certificados TLS automáticos y HSTS activo en los 8 dominios (`max-age=63072000`).
- **DNS (`mrdev.lat`):** Alojado en Namecheap apuntando a los registros `A` (`216.198.79.1`, `64.29.17.1`) y `CNAME` (`www` → `933bf1fc366e5792.vercel-dns-017.com.`) de Vercel.

## 2. Matriz de Cabeceras de Seguridad Observadas

| Dominio | CSP | HSTS | X-Frame-Options | nosniff | Referrer-Policy | Permissions-Policy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `mrdev.lat` (`portafolio`) | Configurado en `vercel.json` | Configurado (`preload`) | `DENY` | `nosniff` | `strict-origin-when-cross-origin` | Configurado |
| `dropradar.site` | Activo | Activo (`preload`) | `SAMEORIGIN` | `nosniff` | `strict-origin-when-cross-origin` | Activo |
| `secop-intelligence-engine.vercel.app` | Activo (revisar `localhost:8000`) | Activo (`preload`) | `DENY` | `nosniff` | `strict-origin-when-cross-origin` | Activo |
| `benditastore.com.co` | Activo | Activo (`preload`) | `DENY` | `nosniff` | `strict-origin-when-cross-origin` | Activo |
| `tesor-app-nine.vercel.app` | Activo | Activo (`preload`) | `DENY` | `nosniff` | `strict-origin-when-cross-origin` | Activo |
| `mr-tender.vercel.app` | Falta | Activo (`preload`) | Falta | Falta | Falta | Falta |
| `misapuntesu.vercel.app` | Falta | Activo (`preload`) | Falta | Falta | Falta | Falta |
| `pidefacil-umber.vercel.app` | Falta | Activo (`preload`) | Falta | Falta | Falta | Falta |

## 3. Recomendaciones Prioritarias de Infraestructura
1. Replicar el bloque de cabeceras de seguridad (`next.config.*` o `vercel.json`) en `mrtender`, `misapuntesu` y `Pidefacil`.
2. Eliminar `http://localhost:8000` y `http://127.0.0.1:8000` de la directiva `connect-src` en producción de `SecopIntelligenceEngine`.
3. Verificar que Cloudflare o Vercel WAF/Rate Limiting esté activo en endpoints costosos (búsquedas SECOP, consultas DropRadar y endpoints IA Gemini).
