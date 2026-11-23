# 07 — Security Scorecard por Aplicación

| Aplicación | Dependencias (`npm audit`) | Headers HTTP Producción | Gestión Secretos / Git | Estado Global |
| :--- | :--- | :--- | :--- | :--- |
| **portafolio (`mrdev.lat`)** | **0 vulnerabilidades** | **Endurecido** (`vercel.json` + CI) | `.gitignore` + CI secret scan | **HARDENED (Fase 1 Completa)** |
| **benditastore.com.co** | Auditado previamente (`SECURITY_AUDIT/`) | **Fuerte** (CSP + DENY + HSTS + nosniff) | `.gitignore` presente | **BUENA POSTURA (Headers OK)** |
| **tesor-app-nine.vercel.app** | Auditado previamente (`SECURITY_AUDIT/`) | **Fuerte** (CSP + DENY + HSTS + nosniff) | `.gitignore` presente | **BUENA POSTURA (Headers OK)** |
| **secop-intelligence-engine.vercel.app** | Auditado previamente (`SECURITY_AUDIT/`) | **Fuerte** (limpiar `localhost:8000` en CSP) | `.gitignore` presente | **BUENA POSTURA (Ajuste menor CSP)** |
| **dropradar.site** | **3 vulns (1 Crit, 2 High)** | **Fuerte** (CSP + SAMEORIGIN + HSTS) | Falta `.gitignore` en raíz | **REQUIERE PATCH DE DEPS** |
| **mr-tender.vercel.app** | **1 vuln (High)** | **Faltan CSP, XFO, nosniff, RP, PP** | `.gitignore` + `SECURITY_AUDIT/` | **REQUIERE HEADERS + PATCH** |
| **pidefacil-umber.vercel.app** | **2 vulns (1 High, 1 Mod)** | **Faltan CSP, XFO, nosniff, RP, PP** | Revisar `.secrets/` | **REQUIERE HEADERS + PATCH** |
| **misapuntesu.vercel.app** | **4 vulns (High)** | **Faltan CSP, XFO, nosniff, RP, PP** | Sin `SECURITY_AUDIT/` | **PRIORIDAD ALTA (Headers + `rehype-sanitize`)** |
