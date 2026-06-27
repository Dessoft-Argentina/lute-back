# Etapa 04 — Órdenes y seguimiento · design.md (Backend)

## 1. Encaje en la arquitectura

Completa el modelo `Order`/`OrderItem` introducido en la etapa 03 (que ya creó la orden `pending` en
checkout) y agrega seguimiento. Refactoriza `CompraRepo`/`Compra` hacia `OrderRepo`/`order`. Es núcleo
estable. El email se integra al confirmar el pago en `PaymentService` (etapa 03).

## 2. Componentes (Express)

- **`repos/OrderRepo.ts`** — completa la etapa 03: crear orden con email/envío, generar
  `tracking_token`, buscar por token, buscar por email (para `track-request`), actualizar estado de
  envío.
- **`services/OrderService.ts`** — lógica de seguimiento: resolver token → estado público; listar
  órdenes por email (uso interno de `track-request`); actualizar estado de envío.
- **`services/MailService.ts`** — envío de emails (confirmación + enlace de seguimiento). Adaptador
  sobre SMTP/Resend (ver ASSUMPTIONS); interfaz simple `sendOrderConfirmation(order)`.
- **`routes/TrackingRoutes.ts`** — `POST /orders/track-request` y `GET /orders/track/:token`, con rate
  limit (middleware de etapa 02).
- **`util/token.ts`** — generación de `tracking_token` opaco (nanoid/uuid v4).
- Integra con **`PaymentService`** (etapa 03): tras confirmar `approved`, dispara
  `MailService.sendOrderConfirmation` (best-effort).

## 3. Modelo de datos específico

Completa lo iniciado en la etapa 03 (ver `data-model.md`):

- **`order`**: agrega `tracking_token` (UNIQUE, opaco), confirma `buyer_email`/`buyer_name`/
  `buyer_phone`/`shipping_address jsonb`/`status` de envío. El campo legacy `Usuario_idUsuario` pasa a
  `admin_user_id` **nullable** (o se retira).
- **`order_tracking`**: `id`, `order_id FK`, `carrier` (nullable), `tracking_number` (nullable),
  `shipment_status` (`pending|preparing|shipped|delivered|cancelled`), `updated_at`. (Puede modelarse
  como columnas en `order` si se prefiere; acá se separa para histórico de cambios de estado.)
- Índices: `order(tracking_token)` (lookups O(1)), `order(buyer_email)` (para `track-request`).

### Migración de transición (corrige S10, REQ-04-2)
```
1. ALTER order: agregar buyer_email, buyer_name, buyer_phone, shipping_address jsonb, tracking_token.
2. Backfill tracking_token para órdenes existentes (generar opaco único por fila).
3. ALTER order: Usuario_idUsuario → admin_user_id NULLABLE (drop NOT NULL); o DROP COLUMN si no se usa.
4. UNIQUE(tracking_token); índice en buyer_email.
```

## 4. Contratos de API

### `POST /orders/track-request` (REQ-04-4, anti-enumeración)
- **Body:** `{ "email": "comprador@mail.com" }`
- **200 (siempre, uniforme):**
  ```json
  { "message": "Si hay pedidos asociados a ese email, te enviamos un enlace de seguimiento." }
  ```
- **Efecto lateral:** si existen órdenes para ese email, `MailService` envía el/los enlaces con
  `tracking_token`. La **respuesta no cambia** según existan o no (REQ-04-4).
- **429:** exceso de intentos (REQ-04-8).

### `GET /orders/track/:token` (REQ-04-5)
- **200:**
  ```json
  {
    "status": "confirmed",
    "paymentStatus": "approved",
    "shipmentStatus": "preparing",
    "placedAt": "2026-06-01T12:00:00Z",
    "items": [ { "name": "Remera Lute", "size": "M", "color": "negro", "quantity": 2 } ],
    "carrier": null,
    "trackingNumber": null
  }
  ```
- **404 (genérico, uniforme para inválido/inexistente):** `{ "error": "Pedido no encontrado." }`
- **429:** exceso de intentos.

> **No** se expone email, dirección completa ni datos de pago en este endpoint; solo lo necesario
> para que el comprador identifique su pedido y vea el avance.

### (Interno/admin, detalle en etapa 05) actualización de estado de envío
- `PATCH /admin/orders/:id/shipment { shipmentStatus, carrier?, trackingNumber? }` — autenticado y con
  rol (etapa 05). Acá se define el contrato; la **autorización** se implementa en la etapa 05.

## 5. Flujos

### Confirmación + email (continúa el webhook de la etapa 03)
```
PaymentService.handle(approved)  [etapa 03]
  → confirma orden + descuenta stock (TX)
  → MailService.sendOrderConfirmation(order)   (best-effort)
       éxito ⇒ log ok
       fallo ⇒ log + encolar reintento (no revierte el pago, REQ-04-6)
```

### Seguimiento por email (anti-enumeración)
```
Comprador → POST /orders/track-request { email }
  rate limit (429 si excede)
  → OrderService.requestTracking(email)
       órdenes = OrderRepo.findByEmail(email)
       si órdenes.length > 0 ⇒ MailService.sendTrackingLinks(órdenes)
  ← 200 SIEMPRE el mismo cuerpo (no revela si había órdenes)   ← clave anti-enumeración
```

### Detalle por token
```
Comprador (desde el enlace del email) → GET /orders/track/:token
  rate limit (429 si excede)
  → OrderService.getByToken(token)
       orden = OrderRepo.findByTrackingToken(token)
       si no existe ⇒ 404 genérico (igual que token mal formado)
       si existe ⇒ 200 con estado público (sin PII innecesaria)
```

## 6. Seguridad de la etapa (corrige S10)

- **Datos de pagador/envío a nivel orden** y **FK a usuario opcional** (REQ-04-1, REQ-04-2) → habilita
  "sin cuenta" y corrige S10.
- **Token opaco no derivable** (REQ-04-3): generado con CSPRNG (uuid v4 / nanoid), único, no calculable
  desde id/email → frena enumeración por adivinación estructurada.
- **Respuestas uniformes** (REQ-04-4, REQ-04-5): `track-request` siempre responde igual; `track/:token`
  responde 404 genérico tanto para token inválido como inexistente → no filtra existencia.
- **Rate limiting** (REQ-04-8) en ambos endpoints → frena fuerza bruta de tokens y abuso de envío de
  emails (evita usar `track-request` como oráculo o como spammer).
- **Prevención de IDOR:** el seguimiento se accede **solo** por token opaco, nunca por id incremental.
- **Sin PII en logs** ni en el cuerpo del seguimiento; el email es solo canal de entrega del enlace.
- **Timing:** evitar diferencias de tiempo notorias entre token válido/inválido (comparación y
  consulta de costo similar) para no habilitar timing attacks.

## 7. UX y rendimiento

- Lookup por `tracking_token` indexado (rápido). El email de confirmación incluye enlace directo.
- Mensaje de `track-request` claro y honesto sin filtrar datos.
- El detalle de seguimiento muestra avance en lenguaje simple (preparando, despachado, entregado).

## 8. Trazabilidad

| Decisión | Cubre |
| --- | --- |
| Snapshot de email/envío en `order` | REQ-04-1 (corrige S10) |
| Migración FK `Usuario` → opcional | REQ-04-2 (corrige S10) |
| `tracking_token` opaco único (CSPRNG) | REQ-04-3 |
| `POST /orders/track-request` uniforme + email | REQ-04-4 |
| `GET /orders/track/:token` con 404 genérico | REQ-04-5 |
| `MailService` disparado en `approved` (best-effort) | REQ-04-6 |
| `order_tracking` + estados de envío | REQ-04-7 |
| Rate limit en endpoints de seguimiento | REQ-04-8 |
