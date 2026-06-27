# Etapa 05 — Admin en subdominio · requirements.md (Backend)

## Resumen

Esta etapa construye el **backend del panel de administración** que vivirá en un **subdominio
separado** (`admin.lute.com`). Reemplaza la autenticación rota actual por **auth de empleados con
RBAC real**, unificando el secreto JWT (corrige S2 y S3), agrega **anti–fuerza bruta** en el login
(corrige S7), expone **CRUD de productos y drops** y un **registro de auditoría**, y **endurece la
superficie** retirando `users.html` y ajustando la CSP (corrige S8). El admin es **núcleo estable**:
no cambia entre drops y queda aislado del storefront público.

## Historias de usuario

- Como **empleado**, quiero iniciar sesión de forma segura para administrar productos, drops y órdenes.
- Como **dueño del negocio**, quiero que solo personal autorizado acceda al admin, con roles claros,
  para limitar quién puede hacer qué.
- Como **responsable de seguridad**, quiero que el login resista fuerza bruta y que toda acción
  sensible quede auditada, para detectar y contener abusos.
- Como **operador**, quiero administrar el catálogo (productos/variantes/imágenes) y los drops desde
  un panel, para preparar cada lanzamiento.

## Requerimientos funcionales

- **REQ-05-1 — Autenticación de empleados (corrige S2).** El sistema debe autenticar empleados contra
  `AdminUser` (email + `password_hash` con bcrypt/argon2) y emitir un **JWT firmado con un único
  secreto** `JWT_SECRET`. Se eliminan el secreto hardcodeado `"prusci"` y las tres fuentes
  inconsistentes de firma/verificación.
  - *EARS:* CUANDO se firma o verifica un token, EL SISTEMA DEBE usar **solo** `JWT_SECRET`.
  - *EARS:* CUANDO faltan credenciales válidas, EL SISTEMA DEBE responder 401 sin revelar si el email
    existe.
- **REQ-05-2 — Autorización por rol / RBAC real (corrige S3).** El sistema debe proteger las rutas
  admin con un middleware que **verifica la firma** del token y el **rol** (`admin`/`staff`), y que
  **efectivamente corta la cadena** (responde 401/403 o llama `next()`). Se elimina el `isAdmin`
  actual (que no llama `next()`, no valida rol y decodifica el JWT con `atob` sin verificar).
  - *EARS:* CUANDO un token es válido pero el rol es insuficiente, EL SISTEMA DEBE responder 403.
  - *EARS:* CUANDO el token no está firmado correctamente, EL SISTEMA DEBE responder 401 (sin
    `atob` ni decodificación insegura).
- **REQ-05-3 — Anti–fuerza bruta en login (corrige S7).** El sistema debe aplicar **rate limiting** y
  **backoff/lockout** progresivo en `POST /admin/auth/login` (por IP y por cuenta).
  - *EARS:* CUANDO se superan los intentos fallidos permitidos, EL SISTEMA DEBE bloquear
    temporalmente nuevos intentos (429) y registrarlo en auditoría.
- **REQ-05-4 — Aislamiento del admin en subdominio.** El backend debe tratar al admin como superficie
  separada: rutas bajo `/admin/*`, **CORS restringido a `admin.lute.com`** para esas rutas, cookies de
  sesión `Secure`+`HttpOnly`+`SameSite` adecuadas (o Bearer JWT), y sin mezclar con el storefront
  público.
  - *EARS:* CUANDO una request al admin proviene de un origen no autorizado, EL SISTEMA DEBE rechazarla.
- **REQ-05-5 — CRUD de productos, variantes e imágenes.** El sistema debe exponer endpoints admin para
  crear/editar/activar/desactivar productos, variantes (talle/color/stock/sku) e imágenes, con
  validación estricta.
  - *EARS:* CUANDO se crea/edita un producto, EL SISTEMA DEBE validar todos los campos y rechazar lo
    no esperado (allow-list).
- **REQ-05-6 — CRUD de drops.** El sistema debe permitir crear/editar drops (slug, name, ventana
  temporal, `facade_config` opaco) y cambiar su estado, respetando la invariante de **a lo sumo un
  drop activo** (detalle en etapa 06).
  - *EARS:* CUANDO se intenta activar un segundo drop, EL SISTEMA DEBE impedirlo (ver etapa 06).
- **REQ-05-7 — Gestión de órdenes (estado de envío).** El sistema debe permitir al staff listar
  órdenes y **actualizar el estado de envío** (`PATCH /admin/orders/:id/shipment`, contrato definido
  en etapa 04).
  - *EARS:* CUANDO un operador autorizado actualiza el envío, EL SISTEMA DEBE persistirlo y auditarlo.
- **REQ-05-8 — Registro de auditoría.** El sistema debe registrar en `AuditLog` las acciones sensibles
  (login, alta/edición de productos y drops, cambios de estado de órdenes) con actor, acción, entidad
  y metadata **sin datos sensibles**.
  - *EARS:* EL SISTEMA NO DEBE almacenar contraseñas, tokens ni datos de tarjeta en la auditoría.
- **REQ-05-9 — Retiro de `users.html` y endurecimiento de CSP (corrige S8).** El sistema debe **dejar
  de servir** la página estática `users.html` y **endurecer la CSP** (eliminar `'unsafe-inline'` donde
  sea posible).
  - *EARS:* CUANDO se solicita `users.html`, EL SISTEMA DEBE responder 404 (ya no existe esa superficie).
- **REQ-05-10 — MFA (opcional).** El sistema debería soportar un segundo factor (TOTP) para cuentas
  admin, activable por configuración.
  - *EARS:* CUANDO MFA está habilitado para una cuenta, EL SISTEMA DEBE exigir el segundo factor tras
    validar la contraseña.

## Requerimientos no funcionales

- **Seguridad:** un solo `JWT_SECRET`; RBAC real que corta la cadena; verificación de firma siempre;
  hashing fuerte de contraseñas; anti–fuerza bruta; CORS por subdominio; CSP endurecida; mínimo
  privilegio del usuario de base; auditoría sin secretos. Ver `security-baseline.md` (S2, S3, S7, S8).
- **Aislamiento:** el compromiso del admin no debe afectar al storefront y viceversa.
- **UX/Rendimiento:** login y operaciones de catálogo rápidas; mensajes claros para el panel.

## Fuera de alcance

- UI del panel admin → **frontend** (etapa 05 del front, como app separada en el subdominio).
- Detalle del motor de estados de drops y `facade_config` → **etapa 06** (acá solo el CRUD/permiso).
- Pentesting consolidado → **etapa 07** (acá se entregan las defensas y sus tests por etapa).
