# AGENTS.md — Backend de Lute (contexto permanente para opencode)

> Este paquete corresponde al **repositorio del BACKEND** (`lute-back`). opencode debe leer este
> archivo y los documentos de `docs/` antes de empezar cualquier tarea. **No reconstruir lo que ya
> existe; integrar y extender.**

## Qué es Lute

Lute es una marca de ropa; esta aplicación es su tienda web. La pieza arquitectónica central es la
**"fachada por drop / núcleo estable"**: con cada *drop* (lanzamiento) el frontend cambia de
aspecto, pero **toda la lógica funcional (carrito, pagos, órdenes, admin) se mantiene intacta**.
El backend **es el núcleo estable**: no debe cambiar entre drops. Solo expone datos del drop activo
para que el frontend decida cómo presentarlos.

## Stack del backend (obligatorio respetar)

- **Runtime/lenguaje:** Node.js + TypeScript.
- **Framework:** Express 4.
- **ORM/DB:** Sequelize 6 sobre **PostgreSQL** (`pg`).
- **Boilerplate base:** `express-generator-typescript` (de ahí vienen `src/common/`,
  `HttpStatusCodes`, `RouteError`, `Paths`, alias `@src`).
- **Pagos:** SDK oficial `mercadopago` (v2).
- **Auth:** `jsonwebtoken` + `bcrypt`.
- **Seguridad/infra:** `helmet`, `cors`, `cookie-parser`, `morgan`.

## Mapa del código existente (tratar como base)

```
src/
├── index.ts                  # arranque; server.listen
├── server.ts                 # app express: CORS por env, CSP sin unsafe-inline, error handler sin internals (S11), raw body para webhook
├── database.ts               # Sequelize (postgres) + connect(); sync solo en test (migraciones en prod)
├── pre-start.ts              # carga de variables de entorno por --env
├── common/                   # EnvVars, HttpStatusCodes, Paths, RouteError, misc (del boilerplate)
├── middleware/
│   ├── requireAuth.ts        # verifica JWT firmado (único JWT_SECRET), corta con 401
│   ├── requireRole.ts        # RBAC: admin/staff, corta con 403
│   ├── rateLimit.ts          # rate limiting reutilizable (general/strict)
│   ├── validateToken.ts      # legacy authenticateToken (pre-RBAC)
│   └── verifyUser.ts         # legacy isAdmin (INCOMPLETO)
├── models/                   # Sequelize: Producto, Compra (+buyer_*, shipping_address, tracking_token), Producto_has_Compra,
│   │                         #   Usuario, Newsteller, Product, ProductVariant, ProductImage, Payment, AdminUser, AuditLog, Drop
│   └── sequalize.ts          # defineAssociations(): Usuario→Compra, Producto↔Compra, Product→Variant/Image
├── repos/                    # AuthRepo, CompraRepo, ProductoRepo, Producto_has_CompraRepo, UserRepo, NewstellerRepo,
│                             #   ProductRepo, OrderRepo (Compra wrapper), PaymentRepo, AdminUserRepo, DropRepo
├── routes/
│   ├── api.ts                # monta todos los routers bajo Paths.*
│   ├── MpRoutes.ts           # Mercado Pago: PUT /pagos (preferencia), POST /pagos (webhook con firma+idempotencia+stock restore)
│   ├── AuthRoutes.ts         # POST /auth (login legacy)
│   ├── CheckoutRoutes.ts     # POST /checkout (stock reserve + MP preference + order pending)
│   ├── TrackingRoutes.ts     # POST /orders/track-request + GET /orders/track/:token (anti-enumeración, rate limited)
│   ├── AdminAuthRoutes.ts    # POST /admin/auth/login (bcrypt + rate limit + lockout)
│   ├── DropRoutes.ts         # GET /drops/active (público)
│   ├── CartRoutes.ts         # POST /cart/validate + GET /variants/:id/stock
│   ├── ProductsRoutes.ts     # GET /products (listado con filtros + drop activo) + GET /products/:slug
│   ├── ProductoRoutes.ts, CompraRoutes.ts, UserRoutes.ts, Producto_has_CompraRoutes.ts, NewstellerRoutes.ts
│   └── types/express/misc.ts # IReq, IRes
├── services/                 # CartService, CheckoutService, OrderService, MailService, AuthService, AuditService,
│                             #   PaymentService (webhook processor), DropService, ProductService, ProductoService, ...
├── util/
│   ├── jwt.ts                # generateToken + verifyToken (JWT_SECRET único, sin "prusci")
│   ├── token.ts              # generateTrackingToken (UUID v4 opaco)
│   ├── mpSignature.ts        # verificación HMAC de webhook MP (timingSafeEqual)
│   └── facadeConfig.ts       # validación opaca de facade_config (tamaño/profundidad)
└── migrations/               # sequelize-cli migrations versionadas
    ├── 0001-create-product-tables.js
    ├── 0002-migrate-legacy-products.js
    ├── 0003-create-payment-table.js
    ├── 0004-add-order-fields.js
    ├── 0005-create-admin-user-and-audit-log.js
    └── 0006-create-drop-table.js
```

### Endpoints ya montados (ver `src/common/Paths.ts` y `src/routes/api.ts`)
- `GET/POST/PUT/DELETE /usuario` (CRUD usuarios; `PUT` protegido por `authenticateToken`)
- `POST /auth` (login), `POST /auth/verify` (verificación de token)
- `GET/POST/PUT/DELETE /producto`, `PUT /producto/idBySpecs`, `PUT /producto/updateStock` (legacy)
- `GET/POST/PUT/DELETE /compra`, `GET/POST/DELETE /prodHasComp`
- `PUT /pagos` (preferencia MP), `POST /pagos` (webhook con firma+idempotencia+stock restore)
- `POST /newsteller` (alta newsletter; email único)
- `POST /checkout` (etapa 03) — revalida stock, reserva transaccional, crea orden pending, devuelve URL MP
- `GET /products`, `GET /products/:slug` (etapa 01) — catálogo público con filtros + drop activo
- `POST /cart/validate` (etapa 02) — validación de stock/precio desde la base
- `GET /variants/:id/stock` (etapa 02) — stock al vuelo
- `POST /orders/track-request`, `GET /orders/track/:token` (etapa 04) — seguimiento anti-enumeración
- `POST /admin/auth/login` (etapa 05) — login admin con bcrypt + rate limit
- `GET /drops/active` (etapa 06) — drop activo público con facade_config opaco

### Modelo de datos actual (Sequelize → Postgres)
- `Usuario` (idUsuario PK, nombre, apellido, email, telefono:int, direccion). **No tiene `contrasenia` ni `role`** (AuthRepo lo usa, pero el modelo no lo declara → gap).
- `Producto` (idProducto PK, nombre, color, talle, precio:float, stock:int). **Sin slug, imágenes, descripción, categoría, SKU ni asociación a drop.**
- `Compra` (idCompra BIGINT PK, fecha, status, Usuario_idUsuario FK). **Sin email/datos de envío a nivel orden; obliga FK a Usuario.**
- `Producto_has_Compra` (Producto_idProducto, Compra_idCompra, cantidad, precio:float) — líneas de orden.
- `Newsteller` (id PK, nombre, email único).

## Lo que YA existe (no reconstruir; documentar integración)
1. **Conexión a la base** (`database.ts`, `models/sequalize.ts`).
2. **Pago con Mercado Pago endurecido** (`MpRoutes.ts`): webhook con firma HMAC, idempotencia por
   `mp_payment_id`, restauración de stock en rechazo/refund, email de confirmación best-effort.
3. **Newsletter** (`/newsteller`, modelo `Newsteller`, repo y service).
4. **Catálogo con Product+Variants+Images** (`Product*`, migraciones 0001-0002).
5. **Carrito API** (`CartRoutes.ts`): validación de stock/precio autoritativa.
6. **Checkout** (`CheckoutRoutes.ts`): revalidación + reserva transaccional + preferencia MP + orden pending.
7. **Órdenes con seguimiento** (`Order*`, `TrackingRoutes.ts`): token opaco, anti-enumeración, rate limiting.
8. **Admin auth con RBAC** (`AdminAuthRoutes`, `requireAuth`, `requireRole`): bcrypt, rate limit, JWT único.
9. **Sistema de drops** (`Drop*`, `DropRoutes.ts`): estados, índice parcial único, facade_config opaco, filtro catálogo.
10. **Seguridad consolidada** (etapa 07): handler sin leaks, .gitignore, tests adversariales.

## Etapas completadas (alcance de `docs/stages/`)
01 Catálogo y producto · 02 Carrito (lado API) · 03 Checkout y pago (MP endurecido) ·
04 Órdenes y seguimiento · 05 Admin en subdominio (RBAC) · 06 Sistema de drops ·
07 Seguridad y pentesting (transversal). **Todas completadas — 105 tests pasando.**

## Reglas de negocio (no negociables)
- **Sin cuentas de usuario para comprar.** En el checkout se pide **solo el email** + datos
  mínimos de envío/pago. (Esto choca con el `Compra.Usuario_idUsuario` actual: ver
  `docs/stages/04-ordenes-y-seguimiento`.)
- **Seguimiento de envío por sección pública** identificada por mail, **segura contra enumeración**.
- **Las órdenes guardan los datos de quien paga + email.**

## Estándares transversales (aplican a TODA tarea)
- **Seguridad primero (mentalidad de pentester).** Validar y sanear toda entrada; consultas
  parametrizadas (Sequelize ya parametriza, **no concatenar SQL**); secretos solo por variables de
  entorno; firma de webhooks de Mercado Pago + idempotencia; rate limiting y anti fuerza bruta en
  login admin; prevención de IDOR y enumeración; cabeceras de seguridad; mínimo privilegio + RBAC;
  logging/auditoría sin datos sensibles.
- **Testing por tarea.** Cada tarea declara los tests que la verifican (Jest + Supertest; el repo
  ya usa Jest y `spec/`).
- **No introducir el código de la app sin un test asociado** salvo refactors triviales.

## Deudas/bugs conocidos del código actual (corregir en sus etapas, ver `docs/00-overview/security-baseline.md`)
- **Secreto de Mercado Pago hardcodeado** en `MpRoutes.ts` (token `APP_USR-...` + credenciales de
  test en comentarios). **Mover a env y rotar.** → **CORREGIDO** en Etapa 03 / 07 (lee `MP_ACCESS_TOKEN` de env).
- **Secreto JWT hardcodeado** `"prusci"` en `util/jwt.ts`; `validateToken.ts` verifica con
  `process.env.TOKEN_SECRET || "prusci"` y `EnvVars.Jwt.Secret` lee `JWT_SECRET`: **tres fuentes de
  secreto inconsistentes.** Unificar en una sola variable de entorno. → **CORREGIDO** en Etapa 05 / 07
  (único `JWT_SECRET`, `jwt.ts` reescrito, `validateToken.ts` actualizado).
- **`isAdmin` no funciona** (no llama `next()`, no valida rol; `Usuario` no tiene `role`). → **CORREGIDO**
  en Etapa 05 (`requireAuth` + `requireRole` reemplazan `isAdmin`).
- **Webhook sin verificación de firma ni idempotencia real**; `idCompra` se setea con
  `collector_id` (id del vendedor, igual para todas las órdenes) → colisión de IDs. → **CORREGIDO**
  en Etapa 03 (`mpSignature.ts` con HMAC + idempotencia por `mp_payment_id`).
- **`sequelize.sync({ alter: true })` en arranque**: peligroso en producción. Migrar a migraciones
  versionadas. → **CORREGIDO** en Etapa 01 (migraciones en `migrations/`, `sync` solo en test).

## Convenciones
- Prosa de documentación en **español**; código, identificadores, nombres de archivo/rama, claves
  de configuración y commits en **inglés**.
- Ramas: `feat/<NN-stage>-<slug>`, `fix/<slug>`, `chore/<slug>`.
- Commits estilo Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- Mantener el alias `@src` y la estructura del boilerplate.

## Comandos de proyecto
- `npm run dev` — servidor en desarrollo (nodemon + ts-node).
- `npm test` — tests con Jest. `npm test -- --testFile=Name` para uno solo.
- `npm run lint` — ESLint sobre `src/`.
- `npm run build` / `npm start` — build de producción y arranque.
