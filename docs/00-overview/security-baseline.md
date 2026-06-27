# Baseline de seguridad transversal — Backend de Lute

> "Ciberseguridad primero." Este checklist aplica a **todas** las etapas. Cada etapa termina con una
> tarea de pruebas adversariales (ciclo **romper → corregir → reprobar**) y la etapa 07 consolida el
> pentesting. Acá se listan los estándares y las **deudas concretas detectadas en el código actual**.

## 1. Deudas de seguridad detectadas en el repo (corregir donde se indica)

| # | Hallazgo | Archivo | Riesgo | Se corrige en |
| --- | --- | --- | --- | --- |
| S1 | **Access token de Mercado Pago hardcodeado** (`APP_USR-...`) + credenciales de test en comentarios | `routes/MpRoutes.ts` | Exposición de secreto de producción / fraude | 03 (mover a env + **rotar**), 07 (verificar) |
| S2 | **Secreto JWT hardcodeado** `"prusci"` y **tres fuentes distintas** (`util/jwt.ts` firma con `"prusci"`; `validateToken.ts` verifica con `process.env.TOKEN_SECRET \|\| "prusci"`; `EnvVars.Jwt.Secret` lee `JWT_SECRET`) | `util/jwt.ts`, `middleware/validateToken.ts`, `common/EnvVars.ts` | Falsificación de tokens; sign/verify inconsistente | 05 (unificar en `JWT_SECRET`), 07 |
| S3 | **`isAdmin` no autoriza**: no llama `next()`, no valida rol (no existe `role` en `Usuario`); decodifica el JWT con `atob(token.split('.')[1])` sin verificar firma | `middleware/verifyUser.ts` | Bypass de control de acceso admin | 05 |
| S4 | **Webhook sin verificación de firma** (`x-signature`/`x-request-id` de MP) y **sin idempotencia real**; `idCompra` se setea con `collector_id` (id del vendedor) → colisión de IDs | `routes/MpRoutes.ts` | Falsificación de pagos, doble procesamiento, descuento de stock indebido | 03 |
| S5 | **Sin validación/saneo** de entrada en la mayoría de rutas (`jet-validator` apenas se usa) | `routes/*` | Inyección, datos corruptos, errores | 01+ (transversal) |
| S6 | **`sequelize.sync({ alter: true })` en arranque** | `database.ts` | *Schema drift*, posible pérdida de datos en prod | 01 (migraciones) |
| S7 | **Sin rate limiting / anti fuerza bruta** en `POST /auth` | `routes/api.ts` | Fuerza bruta de credenciales admin | 05, 07 |
| S8 | **CSP con `'unsafe-inline'`** (scripts y estilos) en Helmet; sirve `users.html` estático | `server.ts` | XSS si esa superficie se expone | 05/07 (retirar página, endurecer CSP) |
| S9 | **CORS hardcodeado** a `http://localhost:3000` | `server.ts` | Rigidez / config errónea entre entornos | 03/05 (config por env) |
| S10 | **Orden obliga FK a `Usuario`** y **no guarda email/envío a nivel orden** | `models/Compra.ts` | Incompatible con "sin cuenta" + datos de pagador | 04 |
| S11 | **Datos sensibles potencialmente en logs/errores** (handler global devuelve `err.message`) | `server.ts` | Fuga de información interna | 07 |
| S12 | **Secretos en `env/development.env`** versionables (DB user/pass) | `env/` | Exposición de credenciales | 07 (revisar `.gitignore`, `env/example.env`) |

## 2. Estándares obligatorios (checklist por etapa)

### Entrada y datos
- [ ] **Validar y sanear toda entrada** (body, query, params, headers) en el borde, con esquema
      (`zod`/`jet-validator`). Rechazar lo no esperado (allow-list, no deny-list).
- [ ] **Consultas parametrizadas siempre** (Sequelize ya parametriza). **Prohibido** concatenar SQL.
- [ ] No confiar en datos del cliente para precios/stock: **revalidar contra la base** en checkout.

### Autenticación y autorización
- [ ] **Un solo secreto** JWT (`JWT_SECRET`), tokens de vida corta, verificación de firma siempre.
- [ ] **RBAC real** en admin: middleware que verifica el token **firmado** y el `role`, y que
      efectivamente corta la cadena (`next()`/respuesta) — corrige S3.
- [ ] **Rate limiting** y backoff/lockout en login admin (corrige S7).
- [ ] Principio de **mínimo privilegio**: el usuario de base de la app no es superusuario.

### Pagos (Mercado Pago)
- [ ] **Verificar la firma** del webhook (HMAC con `MP_WEBHOOK_SECRET`) antes de procesar (S4).
- [ ] **Idempotencia**: cada notificación se procesa **una sola vez** (clave por `mp_payment_id`).
- [ ] Confirmar la orden y **descontar stock dentro de una transacción** con bloqueo de fila.
- [ ] **Nunca** confiar en las `back_urls` como prueba de pago; la verdad la da el webhook + consulta
      a la API de MP.
- [ ] Secretos de MP **solo** por env, **rotados** (S1).

### Órdenes y seguimiento
- [ ] Token de seguimiento **opaco, aleatorio y único**, no derivable del id/email (anti-enumeración).
- [ ] Endpoints de seguimiento con **rate limiting** y respuestas indistinguibles para orden
      inexistente vs. token inválido (no filtrar existencia).
- [ ] Prevención de **IDOR**: nunca exponer recursos por id incremental sin autorización.

### Transporte y cabeceras
- [ ] **HTTPS** obligatorio en producción; cookies `Secure` + `HttpOnly` + `SameSite` adecuado.
- [ ] **Helmet** con CSP **sin `'unsafe-inline'`** donde sea posible (S8); `CORS` por env (S9).

### Operación
- [ ] **Logging/auditoría** de acciones sensibles **sin** datos sensibles (sin contraseñas, tokens,
      PAN de tarjeta, ni el blob completo de tema). Corrige S11.
- [ ] **Secretos fuera del repo** (S12): `.gitignore` cubre `env/*.env` con secretos; se versiona
      `env/example.env`.
- [ ] Manejo de errores que **no filtra** internals al cliente.

## 3. Modelo de amenazas (resumen para el pentesting — etapa 07)

Superficies y abusos a probar explícitamente (mentalidad de pentester):
- **OWASP Top 10**: inyección, autenticación rota, control de acceso roto, configuración insegura,
  SSRF (URLs de assets de drop), componentes vulnerables, fallas de logging.
- **Abuso de carrito/checkout**: manipular precios/cantidades enviados, cantidades negativas o
  enormes, stock inexistente, condición de carrera para **sobreventa**.
- **Abuso de webhooks**: notificaciones falsas/replay, payloads malformados, IDs ajenos.
- **Login admin**: fuerza bruta, enumeración de usuarios, bypass de `isAdmin`, tokens forjados.
- **Enumeración de órdenes**: probar tokens/ids secuenciales, timing, mensajes que delaten existencia.
- **IDOR**: acceder/editar órdenes o productos de otro contexto.
- **Manejo de secretos**: buscar secretos en código/logs/respuestas.

## 4. Pruebas de seguridad como parte del CI

Cada etapa entrega **tests de seguridad** (Jest + Supertest) que codifican los abusos de arriba como
casos negativos esperados (p. ej. "webhook sin firma válida ⇒ 401 y no muta estado"). El ciclo es:
**romper** (escribir el test que explota el fallo) → **corregir** (implementar la defensa) →
**reprobar** (el test pasa a verde y queda como regresión).
