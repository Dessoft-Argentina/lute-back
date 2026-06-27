# Etapa 05 — Admin en subdominio · tasks.md (Backend)

- [x] **T05-1 — `util/jwt.ts` reescrito + unificar `JWT_SECRET`.** (REQ-05-1; corrige S2)
  - `sign`/`verify` usando **solo** `JWT_SECRET` (vida corta). Eliminar `"prusci"` y las fuentes
    inconsistentes (`TOKEN_SECRET`, default hardcodeado). Arranque falla si falta `JWT_SECRET`.
  - *DoD:* un único secreto; firma y verificación coherentes; sin secretos en código.
  - *Tests:* unit (token firmado verifica; token con otro secreto falla; arranque sin secret ⇒ error);
    grep en CI que prohíbe `"prusci"` en src.

- [x] **T05-2 — `AdminUser` + migración desde `Usuario`.** (REQ-05-1)
  - Modelo con `password_hash`, `role`, `is_active`. Migración: agregar columnas, política de hashes
    (backfill o reseteo forzado), ajustar FKs.
  - *DoD:* `AdminUser` operativo; migración up/down OK; contraseñas hasheadas (bcrypt/argon2).
  - *Tests:* integración (crear admin; hash verificable; rol persistido).

- [x] **T05-3 — `requireAuth` + `requireRole` (RBAC real).** (REQ-05-2; corrige S3)
  - `requireAuth` usa `jwt.verify` (jamás `atob`) y corta con 401; `requireRole(...)` responde 403 si
    el rol es insuficiente. Reemplazar `verifyUser.isAdmin` en todas las rutas protegidas.
  - *DoD:* rutas admin inaccesibles sin token válido y sin rol suficiente; cadena efectivamente cortada.
  - *Tests:* unit/integración (sin token ⇒ 401; token válido rol bajo ⇒ 403; token forjado ⇒ 401).

- [x] **T05-4 — `loginRateLimit` + lockout.** (REQ-05-3; corrige S7)
  - Rate limit por IP y por cuenta + backoff/lockout progresivo en `POST /admin/auth/login`.
  - *DoD:* tras N fallos, 429 temporal; se registra en auditoría.
  - *Tests:* integración (ráfaga de fallos ⇒ 429; reset tras ventana).

- [x] **T05-5 — `AuthService.login` (+ TOTP opcional).** (REQ-05-1, REQ-05-10)
  - Verificar hash, mensajes genéricos (no revelar existencia de email), emitir JWT; si `mfa_enabled`,
    exigir TOTP antes de emitir token.
  - *DoD:* login correcto emite token; credenciales inválidas ⇒ 401 genérico; MFA exige segundo factor.
  - *Tests:* unit (ok; inválido genérico; MFA requerido/validado).

- [x] **T05-6 — `POST /admin/auth/login` + CORS de subdominio.** (REQ-05-1, REQ-05-4)
  - Router de login; CORS de `/admin/*` restringido a `admin.lute.com`; cookies seguras o Bearer.
  - *DoD:* login responde 200/401/429 según corresponda; origen no autorizado rechazado.
  - *Tests:* Supertest (login + CORS permitido/denegado).

- [ ] **T05-7 — CRUD de productos/variantes/imágenes.** (REQ-05-5)
  - `ProductAdminService` + rutas `POST/PATCH` con validación estricta (allow-list); desactivación en
    vez de borrado para productos con órdenes (`ON DELETE RESTRICT`).
  - *DoD:* alta/edición/activación validan y persisten; auditadas.
  - *Tests:* Supertest (crear/editar producto y variante; rechazo de campos no esperados; auditoría escrita).

- [ ] **T05-8 — CRUD de drops (delegando invariante a etapa 06).** (REQ-05-6)
  - `DropAdminService` + rutas `POST/PATCH`; validación de `facade_config` (tamaño/forma, no
    interpretación — ver etapa 06); cambios de estado respetando "1 activo".
  - *DoD:* alta/edición de drops OK; no se puede activar un segundo drop (verificado en etapa 06).
  - *Tests:* Supertest (crear/editar drop; intento de segundo activo ⇒ rechazo).

- [ ] **T05-9 — Gestión de órdenes (estado de envío).** (REQ-05-7)
  - `GET /admin/orders` (paginado/filtrable) y `PATCH /admin/orders/:id/shipment` (contrato de etapa 04),
    protegidos por rol; auditados.
  - *DoD:* staff lista y actualiza envío; cambios reflejados en el seguimiento público.
  - *Tests:* Supertest (listar; actualizar envío; auditoría escrita).

- [x] **T05-10 — `AuditService` → `audit_log`.** (REQ-05-8)
  - Registrar login, alta/edición de productos y drops, cambios de órdenes, con actor/acción/entidad y
    metadata **sin secretos**.
  - *DoD:* acciones sensibles auditadas; jamás contraseñas/tokens/PAN.
  - *Tests:* integración (cada acción genera registro; metadata sin datos sensibles).

- [x] **T05-11 — Retiro de `users.html` + CSP endurecida.** (REQ-05-9; corrige S8)
  - Quitar el estático `users.html`; endurecer la CSP de Helmet (sin `'unsafe-inline'` donde sea
    posible; nonces/hashes si hace falta inline).
  - *DoD:* `users.html` ⇒ 404; CSP sin `'unsafe-inline'` en lo posible; el storefront sigue funcionando.
  - *Tests:* Supertest (`users.html` ⇒ 404; cabeceras CSP presentes y endurecidas).

- [x] **T05-12 — Pruebas de seguridad/adversariales (auth/RBAC).** (RNF seguridad; ref. `security-baseline.md`)
  - Fuerza bruta de login (lockout), enumeración de usuarios (mensajes idénticos), tokens forjados/
    sin firma (rechazo), intento de bypass de rol (403), acceso admin desde origen no autorizado
    (CORS), búsqueda de secretos en respuestas/logs.
  - *DoD:* suite adversarial en verde; sin bypass de auth/RBAC; sin enumeración.
  - *Tests:* `admin.security.spec.ts`.

- [ ] **T05-13 — Verificación de UX/rendimiento (panel).** (RNF UX/rendimiento)
  - Latencia de login y de listados de catálogo/órdenes; claridad de errores de validación para el
    frontend admin.
  - *DoD:* operaciones dentro del presupuesto; contratos estables y mensajes claros.
  - *Tests:* test de contrato de endpoints admin + medición de latencia de login/listados.
