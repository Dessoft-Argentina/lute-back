# ASSUMPTIONS.md — Backend de Lute

Decisiones tomadas ante información faltante. Cada una es razonable, reversible y está pensada para
no bloquear el desarrollo. Si el equipo decide otra cosa, se ajusta el documento de la etapa
correspondiente y se mantiene la trazabilidad.

## Plataforma y entorno
1. **Node.js 20 LTS** como runtime de referencia (el `package.json` declara `engines >= 8.10.0`,
   pero se asume un entorno moderno alineado con el frontend Next 16).
2. **PostgreSQL 16**. La base se llama `lute` (coincide con `env/development.env`).
3. Dominios: storefront en `lute.com` (o `localhost:3000` en dev), API en `api.lute.com`
   (o `localhost:4000`), admin en `admin.lute.com`. Ver etapa 05.
4. Despliegue tras un reverse proxy con **TLS terminado** (HTTPS obligatorio en producción); el
   `Dockerfile` del repo se usa como base de imagen.

## Persistencia y migraciones
5. Se reemplaza `sequelize.sync({ alter: true })` (actual en `database.ts`) por **migraciones
   versionadas con `sequelize-cli` (umzug)**. `sync` solo se permite en el entorno de tests.
   Motivo: `alter:true` en producción provoca *schema drift* y posible pérdida de datos.
6. La nomenclatura de tablas existente (`Producto`, `Compra`, `Usuario`, `Newsteller`,
   `Producto_has_Compra`) **se conserva** para no romper datos previos. Las tablas nuevas
   (`Drop`, `OrderTracking`, `AdminUser`, `AuditLog`, etc.) usan inglés en minúscula-plural por
   convención de las migraciones nuevas; se documenta el criterio en cada etapa.

## Identidad, órdenes y "sin cuenta"
7. **No hay cuentas de comprador.** El modelo `Usuario` actual se reinterpreta: para el checkout de
   invitado, los datos del pagador (nombre, email, teléfono, dirección) se guardan como **snapshot
   en la propia orden**, no como una cuenta reutilizable. Para no romper la FK
   `Compra.Usuario_idUsuario`, la etapa 04 define la transición (campos de email/envío a nivel
   orden y FK opcional). Ver `docs/stages/04-ordenes-y-seguimiento`.
8. `Usuario` pasa a representar **empleados/admins** (con `contrasenia` hasheada y `role`), que es
   lo que realmente consumen `AuthRepo`/`isAdmin`. La etapa 05 lo formaliza como `AdminUser`
   (o agrega `role` + `password_hash` a `Usuario`, según se decida allí).

## Pagos (Mercado Pago)
9. Se usa **Checkout Pro** (Preferences + redirección), que es lo que ya hace `MpRoutes.ts`.
10. El `access_token` hardcodeado en `MpRoutes.ts` se considera **comprometido**: se mueve a
    `MP_ACCESS_TOKEN` (env) y **se rota** en el panel de Mercado Pago. El secreto de webhook va en
    `MP_WEBHOOK_SECRET`. Ver etapas 03 y 07.
11. Moneda: **ARS**. Importes monetarios se almacenan en **enteros (centavos) o `NUMERIC(12,2)`**,
    no en `FLOAT` (el `precio` actual es `FLOAT`; la etapa 01 propone migrarlo a `NUMERIC`).

## Notificaciones
12. El envío de mail de seguimiento usa un proveedor SMTP/transaccional configurable por env
    (`SMTP_*` o `RESEND_API_KEY`). En dev se usa un *mailcatcher* (p. ej. Mailpit). La plantilla y
    el disparo se definen en la etapa 04.

## Seguridad
13. Secreto JWT único en `JWT_SECRET` (se eliminan el literal `"prusci"` y el fallback). Tokens de
    admin de **vida corta** (p. ej. 15 min) + refresh, o sesión httpOnly; se decide en etapa 05.
14. Rate limiting con `express-rate-limit` (almacén en memoria en dev; Redis en producción).
15. CSP del backend deja de usar `'unsafe-inline'` para scripts; la API sirve principalmente JSON,
    así que la página estática `users.html` se retira o se mueve a la app de admin (etapa 05).
16. CORS configurable por env (`CORS_ORIGINS`), no hardcodeado a `localhost:3000`.

## Testing
17. **Jest + Supertest** (ya presentes) como stack principal. Se agrega una base de datos de test
    efímera (Docker o Postgres en memoria con `pg-mem` donde aplique) y *factories* de datos.
18. Cobertura objetivo de la lógica de pagos/órdenes/auth ≥ 80%.

## Fuera de alcance de estos supuestos
- Elección final de proveedor de mail, de hosting y de secret manager (se dejan como variables de
  entorno y se documentan los puntos de integración).
