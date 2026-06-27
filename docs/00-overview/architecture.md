# Arquitectura general — Backend de Lute

## 1. Visión

Lute es la tienda web de una marca de ropa. La aplicación se compone de tres piezas desplegables:

- **Frontend (storefront)** — Next.js. Cara visible al público; **cambia de fachada con cada drop**.
- **Backend (API)** — Express + TypeScript + Sequelize/PostgreSQL. **Núcleo estable**: este repo.
- **Admin** — aplicación en un **subdominio** (`admin.lute.com`) para empleados. Consume la misma API
  del backend, con autenticación y RBAC (ver etapa 05).

Este documento describe el **backend** y sus límites con las otras piezas.

```
                 navegador (público)                    navegador (empleados)
                        │                                        │
                        ▼                                        ▼
        ┌───────────────────────────┐              ┌───────────────────────────┐
        │  Frontend storefront      │              │  Admin (subdominio)        │
        │  Next.js  (lute.com)      │              │  admin.lute.com            │
        └─────────────┬─────────────┘              └─────────────┬─────────────┘
                      │  HTTPS / JSON                            │  HTTPS / JSON (Bearer JWT)
                      └──────────────────┬───────────────────────┘
                                         ▼
                       ┌─────────────────────────────────────┐
                       │  Backend API — Express (api.lute.com)│  ← ESTE REPOSITORIO
                       │  routes → services → repos           │
                       └───────┬───────────────────┬──────────┘
                               │                   │
                   ┌───────────▼──────┐   ┌────────▼─────────┐
                   │  PostgreSQL      │   │  Mercado Pago    │
                   │  (Sequelize)     │   │  (Preferences,   │
                   │                  │   │   Webhooks)      │
                   └──────────────────┘   └──────────────────┘
                               │
                   ┌───────────▼──────┐
                   │  Proveedor mail  │  (seguimiento de envío)
                   └──────────────────┘
```

## 2. El backend como "núcleo estable"

La regla arquitectónica central del proyecto es la **fachada por drop sobre un núcleo estable**
(ver `drop-system.md`). Para el backend esto significa una restricción dura:

> **El backend no cambia entre drops.** No conoce colores, tipografías ni layouts. Solo expone
> *qué* productos pertenecen al drop activo y *qué* metadatos de presentación trae el drop (un
> blob de tema opaco para la API). El *cómo* se ve es responsabilidad exclusiva del frontend.

Consecuencias de diseño:
- El contrato de API es **estable y versionado**; un drop nuevo no debería requerir cambios de API.
- La entidad `Drop` (etapa 06) almacena un campo de **tema/configuración de fachada** (JSON) que el
  backend trata como dato opaco: lo valida por esquema/tamaño, pero no lo interpreta.
- La lógica de carrito, checkout, pago, órdenes y admin es **idéntica** sin importar el drop.

## 3. Capas internas (ya presentes en el repo)

El boilerplate `express-generator-typescript` impone una separación por capas que se mantiene:

1. **routes/** — define endpoints HTTP y orquesta validación + llamada a servicios. (`api.ts` monta
   todos los routers bajo los paths de `common/Paths.ts`.)
2. **services/** — lógica de negocio; no conoce Express ni SQL directo.
3. **repos/** — acceso a datos vía modelos Sequelize; **única capa que toca la base**.
4. **models/** — definición Sequelize de entidades + asociaciones (`sequalize.ts`).
5. **middleware/** — autenticación (`validateToken`), autorización (`verifyUser`/`isAdmin`),
   y (a agregar) rate limiting, validación, verificación de firma de webhook.
6. **common/** — utilidades del boilerplate (`EnvVars`, `HttpStatusCodes`, `RouteError`, `Paths`).

**Regla:** las rutas no acceden a la base directamente; pasan por servicios → repos. Toda entrada
externa se valida en el borde (route/middleware) antes de llegar al servicio.

## 4. Límites y responsabilidades

| Responsabilidad | Backend (este repo) | Frontend | Admin |
| --- | --- | --- | --- |
| Modelo de datos y persistencia | ✅ dueño | — | — |
| Catálogo: fuente de verdad de productos/stock | ✅ | consume | edita vía API |
| Carrito | valida stock/precio | ✅ dueño del estado (sin cuenta) | — |
| Checkout/pago (preferencia, webhook, idempotencia) | ✅ dueño | inicia y redirige | — |
| Órdenes + token de seguimiento + mail | ✅ dueño | muestra estado público | ve/gestiona |
| Drops: entidad, estados, asociación de productos | ✅ dueño | aplica la fachada | programa/edita |
| Tema/fachada visual (colores, layout, assets) | almacena blob opaco | ✅ dueño | edita |
| AuthN/AuthZ de empleados (RBAC, auditoría) | ✅ dueño | — | usa |

## 5. Flujo de una compra (extremo a extremo, resumido)

1. Frontend arma el carrito (estado local, sin cuenta) y, en checkout, envía email + datos de envío
   + ítems al backend.
2. Backend **revalida stock y precios contra la base** (nunca confía en los precios del cliente),
   crea/asegura la orden en estado `pending` y crea la **preferencia de Mercado Pago**
   (`PUT /pagos`, ya existente — a endurecer en etapa 03).
3. El comprador paga en Mercado Pago y vuelve a las `back_urls`.
4. Mercado Pago llama al **webhook** (`POST /pagos`): el backend **verifica la firma**, busca el
   pago por su id, aplica **idempotencia**, y si está `approved` confirma la orden y **descuenta
   stock en una transacción**.
5. Backend genera un **token de seguimiento opaco** y envía mail con el enlace de seguimiento.
6. El comprador consulta el estado en la **sección pública de seguimiento** (etapa 04), protegida
   contra enumeración.

## 6. Trazabilidad de etapas hacia esta arquitectura

- 01 Catálogo → capas routes/services/repos + modelo `Product`/variantes; asociación a drop (06).
- 02 Carrito → endpoints de validación de stock/precio (el estado vive en el frontend).
- 03 Checkout/pago → endurecimiento de `MpRoutes` (firma, idempotencia, transacción, secretos).
- 04 Órdenes/seguimiento → orden con email + token anti-enumeración + mail.
- 05 Admin → autenticación de empleados, RBAC, auditoría, separación por subdominio.
- 06 Drops → entidad `Drop`, estados, fallback a "sin drop", tema como blob opaco.
- 07 Seguridad → transversal; plan adversarial y ciclo romper → corregir → reprobar.
