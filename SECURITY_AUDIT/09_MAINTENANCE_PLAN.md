# 09 — Plan de Mantenimiento y Auditoría Continua

## 1. Controles Automatizados (Continuos en cada Push/PR)
- **GitHub Actions (`.github/workflows/security.yml`):**
  - `npm audit --audit-level=high` en cada commit a `main`.
  - Escaneo automático de patrones de secretos en código fuente.
  - Validación estricta de compilación TypeScript + Vite (`npm run build`).
- **Dependabot:** Activar alertas de seguridad de GitHub en todos los repositorios de `CristhDevv`.

## 2. Cadencia Operativa Recomendada
- **Semanal:** Revisar alertas de Dependabot y consumo de APIs externas (Google Gemini, Dropi, Resend).
- **Mensual:**
  1. Ejecutar `npm audit` en los 8 proyectos del workspace y aplicar parches de seguridad.
  2. Verificar cabeceras HTTP en producción (`CSP`, `HSTS`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`).
  3. Confirmar en Supabase que ninguna tabla nueva en `public` quede sin Row Level Security (RLS).
- **Trimestral:** Rotar tokens de acceso personal (GitHub, Vercel) y revisar cuentas administrativas / roles (`ADMIN`, `CLIENT`, `DEMO`, `tesorero`, `presbitero`).
