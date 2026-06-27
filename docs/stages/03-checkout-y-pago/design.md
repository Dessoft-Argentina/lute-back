# Etapa 03 — Checkout y pago · design.md (Backend)

## 1. Encaje en la arquitectura

Endurece `MpRoutes.ts` existente sin cambiar el patrón (Checkout Pro). La diferencia clave: **el
stock se reserva en checkout (antes del pago)**, no al recibir el webhook de confirmación. Reusa
`CartService` (etapa 02) para revalidar, y crea la orden (precursor de etapa 04). El flujo es
núcleo estable.

## 2. Componentes (Express)

- **`services/CheckoutService.ts`** — orquesta: revalidar carrito → crear orden `pending` (snapshot
  pagador/envío) → crear preferencia MP → devolver URL.
- **`services/PaymentService.ts`** — procesa webhooks: verificar firma → idempotencia → consultar pago
  en API MP → confirmar orden + restaurar stock en rechazo (transacción).
- **`repos/OrderRepo.ts`** — refactor de `CompraRepo`: crear orden con email/envío, actualizar estado,
  marcar pago procesado (idempotencia).
- **`routes/CheckoutRoutes.ts`** y **`routes/PaymentRoutes.ts`** — reemplazan/renombran `MpRoutes`
  (se mantienen rutas legacy `/pagos` temporalmente como deprecated).
- **`util/mpSignature.ts`** — verificación HMAC de la firma del webhook.
- **`config/mercadopago.ts`** — cliente MP leyendo `MP_ACCESS_TOKEN` (falla si falta).
- **`server.ts`** — CORS por env (`CORS_ORIGINS`); el webhook se monta con parser que conserva el raw
  body necesario para validar la firma.

## 3. Modelo de datos específico

- **`order`** (de etapa 04, pero introducida acá): `id`, `status`, `payment_status`, `buyer_email`,
  `buyer_name`, `buyer_phone`, `shipping_address jsonb`, `total NUMERIC`, `external_reference`,
  `created_at`. (El `tracking_token` y el seguimiento son de la etapa 04.)
- **`order_item`**: `order_id`, `product_variant_id`, `quantity`, `unit_price` (snapshot).
- **`payment`** (recomendada para idempotencia/registro): `id`, `order_id`, `mp_payment_id UNIQUE`,
  `mp_preference_id`, `status`, `amount`, `processed_at`. La **unicidad de `mp_payment_id`** sostiene
  la idempotencia (REQ-03-5).
- Índice/constraint para evitar `stock < 0` (CHECK ya en etapa 01); descuento con
  `SELECT ... FOR UPDATE`.

> **Corrige el bug actual:** hoy `idCompra` se setea con `collector_id` (id del vendedor, igual para
> todas las órdenes). En el nuevo modelo, el id de orden es propio (BIGSERIAL) y `external_reference`
> vincula con MP; `payment.mp_payment_id` identifica el pago.

## 4. Contratos de API

### `POST /checkout` (REQ-03-1, REQ-03-2)
- **Body:**
  ```json
  {
    "email": "comprador@mail.com",
    "buyer": { "name": "Nombre", "phone": "+5491122334455" },
    "shippingAddress": { "street": "...", "number": "...", "city": "...", "province": "...", "postalCode": "...", "country": "AR" },
    "items": [ { "variantId": 10, "quantity": 2 } ]
  }
  ```
- **200:** `{ "orderId": 123, "paymentUrl": "https://www.mercadopago.com/..." }`
- **400:** email/datos inválidos. **409:** stock insuficiente `{ "error": "...", "items": [...] }`.

### `POST /payments/webhook` (REQ-03-4, REQ-03-5, REQ-03-6)
- **Headers:** `x-signature`, `x-request-id` (verificación HMAC con `MP_WEBHOOK_SECRET`).
- **Body:** notificación de MP (`{ type, data: { id } }`).
- **200:** procesado (o ya procesado, idempotente). **401:** firma inválida/ausente (no muta estado).
- Procesa: consulta el pago en la API de MP por `data.id`; si `approved` y orden encontrada por
  `external_reference`, confirma y descuenta stock (transacción); registra `payment`.

> Rutas legacy `PUT /pagos` y `POST /pagos` quedan deprecated y redirigen a la nueva lógica
> (con firma) o se retiran tras migrar el frontend.

## 5. Flujos

### Checkout
```
Frontend → POST /checkout { email, buyer, shippingAddress, items }
  Route valida payload (400 si inválido)
  → CheckoutService.start(dto)
       → CartService.validate(items)  → si hay ítems inválidos/insuficientes ⇒ 409
       → ProductRepo.reserveStock(items)  (BATCH: SELECT FOR UPDATE, decrementa stock, TX)
         → si falla ⇒ 409 (antes de crear cualquier preferencia de pago)
       → OrderRepo.create(order pending + items con unit_price snapshot, external_reference)
       → MP Preference.create({ items revalorizados, back_urls(env), external_reference, metadata })
  ← 200 { orderId, paymentUrl }
Frontend redirige a paymentUrl.
```

### Webhook
```
MP → POST /payments/webhook (headers x-signature, x-request-id)
  util/mpSignature.verify(raw, headers, MP_WEBHOOK_SECRET)  → inválida ⇒ 401 (sin mutar)
  → PaymentService.handle(data.id)
       → si payment ya procesado (mp_payment_id) ⇒ 200 (idempotente, REQ-03-5)
       → Payment.get(id) en API MP
       → si approved:
            UPDATE order SET status='confirmed', payment_status='approved'  (stock YA descontado en checkout)
            INSERT payment (mp_payment_id, ...)
       → si rejected/refunded/cancelled:
            BEGIN TX
              ProductRepo.restoreStock(items)   (SELECT FOR UPDATE, incrementa stock)
              UPDATE order SET status='cancelled', payment_status=status
            COMMIT
  ← 200
```

## 6. Seguridad de la etapa (corrige S1, S4, S9, S5)

- **Firma del webhook** verificada antes de procesar (REQ-03-4). Conservar el **raw body** para el HMAC.
- **Idempotencia** por `mp_payment_id` único (REQ-03-5) → reintentos/replay no reprocesan.
- **Transacción + `FOR UPDATE`** para reserva de stock en checkout (REQ-03-1) y restauración en
  rechazo (REQ-03-6) → sin sobreventa por carrera.
- **Precios desde la base** (REQ-03-2) → sin manipulación del cliente.
- **Secreto MP en env y rotado** (REQ-03-3) → corrige S1.
- **CORS por env** (S9). **Validación estricta** del payload de checkout (S5).
- **No loguear** datos de pago/PII sensibles; el handler de error no filtra internals.

## 7. UX y rendimiento

- `POST /checkout` hace una sola revalidación + creación de preferencia (rápido).
- El webhook responde 200 rápido; si el procesamiento fuera costoso, se encola y se confirma async.
- Mensajes 409 con la lista de ítems afectados para que el frontend ajuste el carrito con claridad.

## 8. Trazabilidad

| Decisión | Cubre |
| --- | --- |
| `POST /checkout` con revalidación + orden pending | REQ-03-1 |
| Preferencia con ítems de la base + external_reference | REQ-03-2 |
| Cliente MP desde `MP_ACCESS_TOKEN` (falla si falta) | REQ-03-3 |
| `util/mpSignature` + raw body | REQ-03-4 |
| `payment.mp_payment_id` único | REQ-03-5 |
| Transacción + FOR UPDATE en descuento de stock | REQ-03-6 |
| Estados de pago en orden/`payment` | REQ-03-7 |
| Confirmación por webhook/API MP, no por back_url | REQ-03-8 |
| Stock reservado en checkout (antes del pago) | REQ-03-1, REQ-03-6 |
| Restauración de stock en rejected/refunded | REQ-03-6 |
