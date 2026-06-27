# Etapa 05 — Admin en subdominio · design.md (Backend)

## 1. Encaje en la arquitectura

Reemplaza la auth rota (`util/jwt.ts`, `middleware/validateToken.ts`, `middleware/verifyUser.ts`,
`common/EnvVars.ts`) por un módulo de auth coherente, y monta el admin como **router aislado** bajo
`/admin/*` con su propia política de CORS. Refactoriza `Usuario` → `AdminUser` (empleados). Es núcleo
estable y no depende del drop activo.

## 2. Componentes (Express)

- **`models/AdminUser.ts`** — refactor de `Usuario`: `email` (UK), `password_hash`, `role`
  (`admin|staff`), `is_active`. (Migración de datos desde `Usuario`.)
- **`services/AuthService.ts`** — login (verifica hash, emite JWT), verificación de credenciales,
  (opcional) verificación TOTP.
- **`util/jwt.ts` (reescrito)** — `sign`/`verify` usando **solo** `JWT_SECRET` (vida corta);
  elimina `"prusci"`.
- **`middleware/requireAuth.ts`** — verifica firma del token (con `verify`, **no** `atob`); adjunta
  el actor; corta la cadena con 401 si falla.
- **`middleware/requireRole.ts`** — verifica `role`; responde 403 si es insuficiente; reemplaza
  `verifyUser.isAdmin`.
- **`middleware/loginRateLimit.ts`** — rate limit + lockout por IP y por cuenta (reusa base de etapa 02).
- **`services/ProductAdminService.ts`** — CRUD de productos/variantes/imágenes.
- **`services/DropAdminService.ts`** — CRUD de drops (delega invariantes a etapa 06).
- **`services/AuditService.ts`** — escribe `AuditLog`.
- **`routes/admin/*.ts`** — `auth.ts`, `products.ts`, `drops.ts`, `orders.ts`, montados en
  `/admin` con CORS restringido.
- **`server.ts`** — política CORS específica para `/admin/*` (origen `admin.lute.com`), CSP
  endurecida, **retiro** del estático `users.html`.

## 3. Modelo de datos específico

Ver `data-model.md`. Entidades de esta etapa:

- **`admin_user`** (de `Usuario`): agrega `password_hash`, `role`, `is_active`. Migración de datos:
  ```
  1. ALTER usuario: agregar password_hash, role (default 'staff'), is_active (default true).
  2. (Si hay credenciales utilizables) backfill de hashes; si no, forzar reseteo de contraseña.
  3. Renombrar a admin_user (o vista/alias) y ajustar FKs (order.admin_user_id ya nullable, etapa 04).
  ```
- **`audit_log`**: `id`, `admin_user_id FK`, `action`, `entity`, `entity_id`, `metadata jsonb` (sin
  secretos), `created_at`.
- (Opcional MFA) `admin_user.totp_secret` cifrado / tabla aparte; flag `mfa_enabled`.

## 4. Contratos de API (todos bajo `/admin`, CORS `admin.lute.com`)

### `POST /admin/auth/login` (REQ-05-1, REQ-05-3, REQ-05-10)
- **Body:** `{ "email": "...", "password": "...", "totp": "123456"? }`
- **200:** `{ "token": "<jwt>", "role": "admin", "mfaRequired": false }`
- **401:** credenciales inválidas (mensaje genérico, sin revelar si el email existe).
- **429:** demasiados intentos (lockout temporal).
- Si `mfa_enabled` y falta `totp`: **200** `{ "mfaRequired": true }` sin emitir token aún.

### Productos (REQ-05-5) — requieren `requireAuth` + `requireRole`
- `POST /admin/products` `{ slug, name, description, category, tags, basePrice, isActive, isFeatured, dropId? }`
- `PATCH /admin/products/:id` (campos parciales validados)
- `POST /admin/products/:id/variants` `{ size, color, sku, stock, priceOverride? }`
- `PATCH /admin/variants/:id` `{ stock?, priceOverride?, ... }`
- `POST /admin/products/:id/images` `{ url, alt, position }`
- `PATCH /admin/products/:id` con `isActive:false` para desactivar (no se borran productos con órdenes;
  `ON DELETE RESTRICT`, ver `data-model.md`).

### Drops (REQ-05-6) — detalle de estados en etapa 06
- `POST /admin/drops` `{ slug, name, startsAt, endsAt, facadeConfig }`
- `PATCH /admin/drops/:id` (incluye cambios de estado, validando invariante de 1 activo)

### Órdenes (REQ-05-7) — contrato de envío definido en etapa 04
- `GET /admin/orders` (lista paginada/filtrable)
- `PATCH /admin/orders/:id/shipment` `{ shipmentStatus, carrier?, trackingNumber? }`

> Toda mutación pasa por `AuditService.record(actor, action, entity, entityId, metadata)`.

## 5. Flujos

### Login con anti–fuerza bruta
```
POST /admin/auth/login { email, password, totp? }
  loginRateLimit (por IP + por cuenta) → 429 si excede / cuenta bloqueada
  → AuthService.login(email, password)
       AdminUser.findByEmail → comparar hash (bcrypt/argon2)
       inválido ⇒ AuditService.record('login_failed') + 401 genérico
       válido:
         si mfa_enabled y !totp ⇒ 200 { mfaRequired:true } (sin token)
         si mfa_enabled y totp ⇒ verificar TOTP (falla ⇒ 401)
         emitir JWT (verify/sign con JWT_SECRET) + AuditService.record('login_ok')
  ← 200 { token, role }
```

### Autorización de ruta admin
```
requireAuth: jwt.verify(token, JWT_SECRET)  → inválido ⇒ 401 (NUNCA atob)
requireRole('admin'|'staff'): si role insuficiente ⇒ 403
→ handler → AuditService.record(...) en mutaciones
```

## 6. Seguridad de la etapa (corrige S2, S3, S7, S8)

- **Un solo `JWT_SECRET`** y `verify` real en cada request (REQ-05-1, REQ-05-2) → corrige **S2** y la
  decodificación insegura con `atob` de **S3**.
- **RBAC que corta la cadena** (`requireAuth`+`requireRole`) → corrige el `isAdmin` que no autorizaba
  (**S3**).
- **Hashing fuerte** (bcrypt/argon2) de contraseñas; nunca en texto plano ni en logs.
- **Anti–fuerza bruta** (rate limit + lockout por IP y cuenta) en login (REQ-05-3) → corrige **S7**.
- **CORS restringido** a `admin.lute.com` para `/admin/*` (REQ-05-4); cookies `Secure`+`HttpOnly`+
  `SameSite` o Bearer; HTTPS obligatorio en prod.
- **Retiro de `users.html`** y **CSP endurecida** (sin `'unsafe-inline'` donde se pueda) (REQ-05-9) →
  corrige **S8**.
- **Auditoría sin secretos** (REQ-05-8): nunca contraseñas/tokens/PAN.
- **Mínimo privilegio** del usuario de base de datos (no superusuario).
- **Mensajes genéricos** en login (no revelar existencia de email) → mitiga enumeración de usuarios.

## 7. UX y rendimiento

- Login simple y rápido; mensajes claros del panel (sin filtrar detalles de seguridad).
- Listados de catálogo/órdenes paginados; validación con errores legibles para el frontend admin.
- El aislamiento por subdominio no añade latencia perceptible.

## 8. Trazabilidad

| Decisión | Cubre |
| --- | --- |
| Auth de empleados + JWT con único `JWT_SECRET` | REQ-05-1 (corrige S2) |
| `requireAuth`+`requireRole` con `verify` real | REQ-05-2 (corrige S3) |
| `loginRateLimit` + lockout | REQ-05-3 (corrige S7) |
| CORS por subdominio + cookies seguras para `/admin/*` | REQ-05-4 |
| CRUD productos/variantes/imágenes validado | REQ-05-5 |
| CRUD drops (invariante en etapa 06) | REQ-05-6 |
| `PATCH /admin/orders/:id/shipment` + listado | REQ-05-7 |
| `AuditService` → `audit_log` sin secretos | REQ-05-8 |
| Retiro de `users.html` + CSP endurecida | REQ-05-9 (corrige S8) |
| TOTP opcional | REQ-05-10 |
