# Etapa 03 — Checkout y pago · tasks.md (Backend)

- [x] **T03-1 — Cliente MP por entorno + rotar token.** (REQ-03-3, corrige S1)
  - `config/mercadopago.ts` que lee `MP_ACCESS_TOKEN`; eliminar el token hardcodeado de `MpRoutes.ts`
    y los comentarios con credenciales de test; documentar la **rotación** del token comprometido.
  - *DoD:* arranque falla con error claro si falta `MP_ACCESS_TOKEN`; no quedan secretos en el código.
  - *Tests:* unit del arranque (mock env ausente ⇒ error); grep en CI que prohíbe `APP_USR-` en src.

- [x] **T03-2 — `OrderRepo` (refactor de `CompraRepo`) + tablas order/order_item/payment.** (REQ-03-1, REQ-03-7)
  - Migración que crea/ajusta `order` (email/envío/total/external_reference/estados), `order_item`
    (unit_price snapshot) y `payment` (mp_payment_id UNIQUE). Métodos de creación/actualización.
  - *DoD:* migración up/down OK; crear orden con ítems persiste snapshots.
  - *Tests:* integración (crear orden + items; unicidad de `mp_payment_id`).

- [x] **T03-3 — `CheckoutService.start(dto)`.** (REQ-03-1, REQ-03-2)
  - Revalidar con `CartService`; si hay insuficiencias ⇒ error 409; crear orden `pending`; crear
    preferencia MP con ítems revalorizados, `back_urls` (env) y `external_reference`.
  - *DoD:* devuelve `{ orderId, paymentUrl }`; no crea preferencia si falta stock.
  - *Tests:* unit con mock de MP (ok; 409 por stock; ignora precio del cliente).

- [x] **T03-4 — `POST /checkout` + validación de payload.** (REQ-03-1)
  - Router con esquema (email válido, dirección, items) + rate limit.
  - *DoD:* 200 con URL; 400 datos inválidos; 409 stock; 429 exceso.
  - *Tests:* Supertest de los caminos.

- [x] **T03-5 — `util/mpSignature` (verificación HMAC) + raw body.** (REQ-03-4, corrige S4)
  - Implementar verificación de `x-signature`/`x-request-id` con `MP_WEBHOOK_SECRET`; montar el
    webhook con acceso al raw body.
  - *DoD:* firma válida pasa; inválida/ausente rechaza.
  - *Tests:* unit del verificador (válida/ inválida/ tampered).

- [x] **T03-6 — `PaymentService.handle(paymentId)` con idempotencia.** (REQ-03-5, REQ-03-7)
  - Si `mp_payment_id` ya registrado ⇒ no-op; si no, consulta API MP y actualiza estados.
  - *DoD:* segunda llamada con el mismo id no reprocesa.
  - *Tests:* unit (replay no duplica; rejected/refunded actualizan sin descontar).

- [x] **T03-7 — Confirmación + descuento de stock transaccional.** (REQ-03-6, corrige bug collector_id)
  - En `approved`: localizar orden por `external_reference`; `BEGIN` → `SELECT ... FOR UPDATE` por
    variante → verificar/descontar stock → actualizar orden → `INSERT payment` → `COMMIT`.
  - *DoD:* stock nunca queda negativo; orden pasa a confirmed/paid.
  - *Tests:* integración con **concurrencia** simulada (dos confirmaciones a la misma variante ⇒ sin sobreventa).

- [x] **T03-8 — `POST /payments/webhook`.** (REQ-03-4, REQ-03-5, REQ-03-8)
  - Router: verifica firma (401 si falla, sin mutar) → `PaymentService.handle`. Responde 200 rápido.
  - *DoD:* 401 sin firma; 200 idempotente; confirma orden ante pago aprobado real (mock MP).
  - *Tests:* Supertest (sin firma ⇒ 401 y estado intacto; con firma + approved ⇒ confirma; replay ⇒ 200).

- [x] **T03-9 — CORS por entorno + deprecación de `/pagos`.** (REQ-03; corrige S9)
  - `CORS_ORIGINS` desde env en `server.ts`; mantener `/pagos` legacy como deprecated apuntando a la
    nueva lógica con firma o retirarlas tras migrar el frontend.
  - *DoD:* CORS configurable; rutas legacy documentadas.
  - *Tests:* Supertest de CORS (origen permitido/denegado).

- [x] **T03-10 — Pruebas de seguridad/adversariales (pago).** (RNF seguridad; ref. `security-baseline.md`)
  - Webhook sin firma / con firma falsificada / replay (no muta / no reprocesa); precio manipulado en
    checkout (se ignora); intento de stock negativo por concurrencia; payload de webhook malformado;
    confirmación intentada solo por back_url (no confirma).
  - *DoD:* suite adversarial en verde; hallazgos corregidos como regresión.
  - *Tests:* `payment.security.spec.ts`.

- [x] **T03-11 — Verificación de UX/rendimiento (flujo de compra).** (RNF UX/rendimiento)
  - Medir latencia de `POST /checkout`; verificar que el webhook responde rápido; mensajes 409 claros.
  - *DoD:* checkout dentro del presupuesto; webhook <200ms en camino feliz (mock); contrato estable.
  - *Tests:* test de contrato + medición de latencia del checkout.
