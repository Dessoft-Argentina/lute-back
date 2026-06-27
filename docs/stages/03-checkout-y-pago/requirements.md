# Etapa 03 — Checkout y pago · requirements.md (Backend)

## Resumen

Esta etapa **endurece y completa el pago con Mercado Pago** que ya existe de forma básica
(`MpRoutes.ts`). El backend debe: recibir el checkout (email + datos mínimos + ítems), **revalidar
todo contra la base**, **reservar stock (transaccional, con `FOR UPDATE`) antes de crear el pago**,
crear la **orden en estado `pending`**, generar la **preferencia de Mercado
Pago** y, vía **webhook firmado e idempotente**, confirmar la orden. Corrige las deudas S1 (token
hardcodeado), S4 (webhook sin firma/idempotencia y bug de `collector_id`) y S9 (CORS) del baseline.
Es núcleo estable: el flujo no cambia entre drops.

## Historias de usuario

- Como **comprador sin cuenta**, quiero pagar ingresando solo mi email y datos de envío, para comprar
  rápido y sin registrarme.
- Como **negocio**, quiero que el precio y el stock se validen en el servidor, para evitar fraude por
  manipulación del cliente.
- Como **sistema**, quiero procesar las notificaciones de pago de forma segura e idempotente, para no
  confirmar pagos falsos ni descontar stock dos veces.

## Requerimientos funcionales

- **REQ-03-1 — Iniciar checkout.** El sistema debe exponer `POST /checkout` que recibe
  `{ email, buyer{...}, shippingAddress{...}, items[] }`, **revalida stock y precio** (reusa
  `CartService`, etapa 02), **reserva el stock en transacción con `FOR UPDATE`**, crea la **orden
  `pending`** con snapshot de pagador/envío y devuelve la URL de pago de Mercado Pago.
  - *EARS:* CUANDO algún ítem no tiene stock suficiente al iniciar checkout, EL SISTEMA DEBE rechazar
    con 409 e informar los ítems afectados, sin reservar stock ni crear preferencia.
  - *EARS:* CUANDO dos checkouts concurrentes reclaman la misma variante, el segundo DEBE ver
    `stock = 0` y obtener 409, **antes de que se cree cualquier preferencia de pago**.
  - *EARS:* CUANDO el email es inválido, EL SISTEMA DEBE responder 400.
- **REQ-03-2 — Crear preferencia de Mercado Pago.** El sistema debe crear la preferencia con los
  ítems **revalorizados desde la base**, `back_urls` configurables por env, `external_reference` =
  id de la orden, y metadata mínima necesaria.
  - *EARS:* EL SISTEMA DEBE usar los precios de la base, nunca los enviados por el cliente.
- **REQ-03-3 — Secreto de MP por entorno.** El `access_token` debe leerse de `MP_ACCESS_TOKEN`; el
  token actualmente hardcodeado se elimina del código y **se rota**.
  - *EARS:* CUANDO falta `MP_ACCESS_TOKEN`, EL SISTEMA DEBE fallar el arranque con error claro.
- **REQ-03-4 — Webhook firmado.** `POST /payments/webhook` debe **verificar la firma** de Mercado
  Pago (HMAC con `MP_WEBHOOK_SECRET`, usando `x-signature` y `x-request-id`) **antes** de procesar.
  - *EARS:* CUANDO la firma es inválida o ausente, EL SISTEMA DEBE responder 401 y **no** mutar estado.
- **REQ-03-5 — Idempotencia del webhook.** El sistema debe procesar cada notificación de pago **una
  sola vez**, identificada por `mp_payment_id`.
  - *EARS:* CUANDO llega una notificación ya procesada, EL SISTEMA DEBE responder 200 sin reprocesar.
- **REQ-03-6 — Confirmación + restauración de stock transaccional.** Al confirmar un pago `approved`,
  el sistema debe pasar la orden a `confirmed`/`paid` (el stock ya fue descontado en el checkout).
  CUANDO el pago es `rejected`/`refunded`/`cancelled`, el sistema debe **restaurar el stock** de cada
  variante dentro de una transacción con bloqueo de fila, sin sobreventa.
  - *EARS:* CUANDO dos confirmaciones concurrentes afectan la misma variante, EL SISTEMA NO DEBE dejar
    `stock < 0`.
- **REQ-03-7 — Estados de pago.** El sistema debe registrar y reflejar estados `pending`/`approved`/
  `rejected`/`refunded` en la orden (y opcionalmente en una tabla `payment`).
- **REQ-03-8 — Fuente de verdad = webhook + API MP.** El sistema **no** debe confirmar la compra solo
  por la `back_url` de éxito; la confirmación proviene del webhook validado y/o consulta a la API de MP.

## Requerimientos no funcionales

- **Seguridad:** verificación de firma; idempotencia; transacción con lock; secretos por env y
  rotados; validación estricta del payload de checkout; CORS por env; sin filtrar datos de pago en logs.
- **Rendimiento/UX:** checkout rápido (una revalidación + creación de preferencia); el webhook
  responde rápido (procesamiento corto o encolado); mensajes de error claros para el frontend.
- **Confiabilidad:** reintentos de Mercado Pago tolerados gracias a la idempotencia.

## Fuera de alcance

- UI del checkout y pantallas de éxito/fallo/pendiente → **frontend** (etapa 03 del front).
- Token de seguimiento, mail y sección pública de estado → **etapa 04**.
- Reglas de envío/impuestos avanzadas (se asume envío simple; documentar en ASSUMPTIONS si se amplía).
