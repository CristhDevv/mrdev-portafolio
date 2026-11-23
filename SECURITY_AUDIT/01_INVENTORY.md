# 01 — Inventario de Activos y Superficies de Ataque

**Fecha de auditoría:** 2026-11-23  
**Alcance:** Aplicaciones web en `C:\Users\USER\Desktop\workspace` con enfoque operativo en `portafolio` (`https://mrdev.lat`) y diagnóstico de postura en producción de los 7 sistemas enlazados.

## 1. Aplicaciones Web Principales (Producción)

| # | Aplicación | Directorio Workspace | Dominio Producción | Stack Observado | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Portafolio mrdev** | `portafolio` | `https://mrdev.lat` / `mrdev-portafolio.vercel.app` | Vite 6 + React 19 + TypeScript (SPA estática) | Producción |
| 2 | **Mr. Tender** | `mrtender` (`mr-tender`, `mr-tender-mobile`) | `https://mr-tender.vercel.app` | Web + Mobile + GitHub Actions | Producción |
| 3 | **DropRadar** | `DropRadar` (`dropradar-codigo`) | `https://dropradar.site` | Next.js / Supabase + AdSense + Dropi/CJ/TikTok | Producción |
| 4 | **SECOP Intelligence Engine** | `SecopIntelligenceEngine` | `https://secop-intelligence-engine.vercel.app` | Frontend Vercel + API `secop-engine-api.vercel.app` | Producción |
| 5 | **Bendita Store** | `benditastore` | `https://benditastore.com.co` | Next.js (React 19) + Supabase SSR + Resend + Zod | Producción |
| 6 | **TesorApp** | `tesorapp` | `https://tesor-app-nine.vercel.app` | NestJS + Prisma (`backend/`) + React (`frontend-desktop/`, `frontend-mobile/`) + Supabase | Producción |
| 7 | **MisApuntesU** | `misapuntesu` | `https://misapuntesu.vercel.app` | Next.js + Prisma + `@google/generative-ai` + `rehype-raw` + Zod | Producción |
| 8 | **PideFácil.co** | `Pidefacil` | `https://pidefacil-umber.vercel.app` | Next.js + Supabase + `@google/genai` + `better-sqlite3` + `pm2` | Producción |

## 2. Otros Directorios Detectados en `workspace`
`benditastore`, `bible`, `decrypt iphone`, `dofbot`, `DropRadarEU`, `jhormanceronconsultorio`, `mrdevs`, `mrfocus`, `newko`, `op7 port`, `rea`, `rea-touch`, `reaaaa`, `velora`.

## 3. Superficies de Ataque Principales
- **Portafolio (`mrdev.lat`):** SPA estática sin backend ni base de datos; superficie enfocada en headers HTTP, iframes embebidos (`LiveAppStage`), enlaces externos (`wa.me`, `mailto:`) y cadena de suministro npm.
- **Aplicaciones Transaccionales (`mrtender`, `benditastore`, `tesorapp`, `Pidefacil`):** Autenticación, aislamiento multi-tenant / por sucursal, políticas RLS en Supabase, endpoints de pedidos/facturación/contabilidad y manejo de claves de servicio.
- **Aplicaciones de Datos e IA (`DropRadar`, `SecopIntelligenceEngine`, `misapuntesu`):** Scraping/ingesta masiva, consumo de cuotas LLM (`@google/generative-ai`, `@google/genai`), renderizado de Markdown/HTML (`rehype-raw`) y exportaciones Excel/CSV/PDF.
