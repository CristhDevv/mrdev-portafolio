# 08 — Procedimiento de Respuesta ante Incidentes (Playbook)

## 1. Detección y Triaje Inicial (0–15 min)
1. Identificar el servicio afectado (`portafolio`, `mrtender`, `DropRadar`, `SECOP SIE`, `benditastore`, `tesorapp`, `misapuntesu`, `Pidefacil`).
2. Revisar logs de despliegue y funciones en **Vercel**, logs de autenticación/BD en **Supabase** y alertas de facturación en **Google Gemini / Resend**.
3. Clasificar severidad: **P1 (Crítico: fuga de datos o compromiso de credenciales)**, **P2 (Alto: abuso de API/scraping/DoS)**, **P3 (Medio/Bajo)**.

## 2. Contención Inmediata (15–30 min)
1. **Si hay sospecha de secreto filtrado:** Revocar inmediatamente la clave (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, tokens GitHub/Vercel, `JWT_SECRET`) desde el panel del proveedor antes de generar una nueva.
2. **Si hay ataque activo en un endpoint:** Activar modo de protección / rate-limiting en Vercel WAF o pausar temporalmente la ruta afectada mediante rollback al último despliegue seguro.
3. **Si hay compromiso de cuenta admin:** Invalidar sesiones activas en Supabase Auth / NestJS y forzar cambio de contraseña + MFA.

## 3. Erradicación, Recuperación y Post-Mortem
1. Corregir la causa raíz en código, validar localmente y pasar el workflow `.github/workflows/security.yml`.
2. Verificar integridad de datos y restaurar backup desde Supabase Point-in-Time Recovery / snapshots si hubo alteración.
3. Documentar causa raíz, línea de tiempo, datos afectados y nueva regla preventiva en `SECURITY_AUDIT/`.
