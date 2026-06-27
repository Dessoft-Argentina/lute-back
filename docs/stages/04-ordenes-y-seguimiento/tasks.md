# Etapa 04 — Órdenes y seguimiento · tasks.md (Backend)

- [x] **T04-1 — Migración: datos de pagador/envío + token + FK opcional.** (REQ-04-1, REQ-04-2; corrige S10)
  - `ALTER order`: `buyer_email`, `buyer_name`, `buyer_phone`, `shipping_address jsonb`,
    `tracking_token` (UNIQUE). Backfill de `tracking_token` para órdenes existentes. `Usuario_idUsuario`
    → `admin_user_id` NULLABLE (o `DROP COLUMN`). Índice en `buyer_email`.
  - *DoD:* migración up/down OK; órdenes existentes quedan con token único; crear orden no exige usuario.
  - *Tests:* integración (migración aplica; unicidad de `tracking_token`; orden sin usuario válida).

- [x] **T04-2 — `util/token.ts` (token opaco).** (REQ-04-3)
  - Generar `tracking_token` con CSPRNG (uuid v4 o nanoid), no derivable de id/email.
  - *DoD:* tokens únicos, suficientemente largos; función pura testeable.
  - *Tests:* unit (formato/longitud; colisión despreciable; no determinístico por id/email).

- [x] **T04-3 — `OrderRepo` completo.** (REQ-04-1, REQ-04-5, REQ-04-7)
  - Métodos: `create` (con email/envío/token), `findByTrackingToken`, `findByEmail`,
    `updateShipmentStatus`. Generar token en `create`.
  - *DoD:* lookups por token y por email funcionan; estado de envío persiste.
  - *Tests:* integración de cada método.

- [x] **T04-4 — `OrderService` (seguimiento).** (REQ-04-4, REQ-04-5)
  - `requestTracking(email)` (busca por email y, si hay, dispara mail; **no** cambia la respuesta);
    `getByToken(token)` (estado público o 404 genérico); `updateShipment(...)`.
  - *DoD:* `requestTracking` nunca revela existencia; `getByToken` no expone PII.
  - *Tests:* unit (respuesta uniforme con/sin órdenes; 404 genérico para token inválido/inexistente).

- [x] **T04-5 — `MailService` (confirmación + enlaces).** (REQ-04-6)
  - Adaptador SMTP/Resend (config por env; ver ASSUMPTIONS). `sendOrderConfirmation(order)` y
    `sendTrackingLinks(orders)`. Plantillas en español, con enlace de seguimiento por token.
  - *DoD:* en `approved` se envía confirmación; fallo de email **no** revierte el pago (best-effort + log).
  - *Tests:* unit con mock del transporte (se llama en approved; fallo no propaga excepción al pago).

- [x] **T04-6 — `GET /orders/track/:token`.** (REQ-04-5, REQ-04-8)
  - Router con rate limit; valida formato de token; responde estado público o 404 genérico.
  - *DoD:* 200 con estado para token válido; 404 idéntico para inválido/inexistente; 429 por exceso.
  - *Tests:* Supertest (válido ⇒ 200; inválido/inexistente ⇒ 404 idéntico; exceso ⇒ 429).

- [x] **T04-7 — `POST /orders/track-request`.** (REQ-04-4, REQ-04-8)
  - Router con rate limit; valida email; respuesta **uniforme** siempre; dispara envío si hay órdenes.
  - *DoD:* mismo status/cuerpo con y sin órdenes; envío de mail solo si existen; 429 por exceso.
  - *Tests:* Supertest (cuerpo idéntico en ambos casos; mock de mail llamado solo si hay órdenes).

- [x] **T04-8 — Integración del email en el webhook (etapa 03).** (REQ-04-6)
  - En `PaymentService.handle(approved)`, tras confirmar, llamar `MailService.sendOrderConfirmation`
    de forma best-effort (try/catch + reintento/registro, sin revertir).
  - *DoD:* pago aprobado dispara email; excepción de email no afecta la confirmación.
  - *Tests:* integración (approved ⇒ email enviado; mail que lanza ⇒ orden sigue confirmada).

- [x] **T04-9 — Pruebas de seguridad/adversariales (enumeración e IDOR).** (RNF seguridad; ref. `security-baseline.md`)
  - Enumerar tokens secuenciales/aleatorios (siempre 404 genérico); comparar respuestas de
    `track-request` con email existente vs. inexistente (idénticas); intentar acceder a orden por id
    incremental (no existe ese endpoint público); abuso de `track-request` como spammer (rate limit);
    chequear que no se filtra PII en `track/:token` ni en logs; revisar timing.
  - *DoD:* suite adversarial en verde; sin diferencias observables que filtren existencia.
  - *Tests:* `tracking.security.spec.ts`.

- [x] **T04-10 — Verificación de UX/rendimiento (seguimiento).** (RNF UX/rendimiento)
  - Medir latencia de `track/:token` (lookup indexado); verificar legibilidad del email y del estado;
    confirmar que el enlace del email abre el detalle correcto.
  - *DoD:* lookup dentro del presupuesto; contrato del estado público estable y claro.
  - *Tests:* test de contrato del estado público + medición de latencia.
