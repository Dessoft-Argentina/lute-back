# Etapa 02 — Carrito · requirements.md (Backend)

## Resumen

El **estado del carrito vive en el frontend** (sin cuenta de usuario; ver
`front/docs/stages/02-carrito`). El rol del **backend** en esta etapa es ser la **fuente de verdad de
stock y precio**: expone endpoints para **validar y revalorizar** un carrito contra la base antes de
avanzar al checkout, de modo que el frontend nunca decida precios ni disponibilidad por su cuenta.
Esto es parte del núcleo estable y no cambia entre drops.

## Historias de usuario

- Como **visitante**, quiero que, al modificar el carrito, se valide la disponibilidad real, para no
  intentar comprar algo sin stock.
- Como **sistema**, quiero recalcular precios desde la base, para evitar manipulación de precios del
  lado cliente.
- Como **negocio**, quiero detectar cantidades inválidas o variantes inexistentes, para mantener la
  integridad del pedido.

## Requerimientos funcionales

- **REQ-02-1 — Validación de carrito.** El sistema debe exponer `POST /cart/validate` que recibe una
  lista de ítems `{ variantId, quantity }` y devuelve, por ítem, disponibilidad, precio unitario
  vigente y stock disponible, más el total recalculado.
  - *EARS:* CUANDO un ítem referencia una variante inexistente o inactiva, EL SISTEMA DEBE marcarla
    como inválida y excluirla del total.
  - *EARS:* CUANDO la cantidad pedida supera el stock, EL SISTEMA DEBE devolver la cantidad máxima
    disponible y marcar el ítem como ajustado.
- **REQ-02-2 — Revalorización autoritativa.** El sistema debe calcular el precio unitario desde
  `price_override ?? base_price` y el total como suma de (precio × cantidad efectiva); **nunca** usar
  precios enviados por el cliente.
  - *EARS:* CUANDO el cliente envía un `price`, EL SISTEMA DEBE ignorarlo y usar el de la base.
- **REQ-02-3 — Validación de cantidades.** El sistema debe rechazar cantidades `<= 0`, no enteras o
  por encima de un máximo por ítem configurable.
  - *EARS:* CUANDO `quantity <= 0` o no es entero, EL SISTEMA DEBE responder 400.
- **REQ-02-4 — Consulta de stock por variante.** El sistema debe exponer `GET /variants/:id/stock`
  (o incluirlo en el detalle de producto) para que el frontend muestre disponibilidad al vuelo.
- **REQ-02-5 — Sin reserva de stock en el carrito.** El stock **no** se reserva al agregar al
  carrito; la verdad de stock se materializa recién en el pago (etapa 03), evitando bloqueos por
  carritos abandonados.

## Requerimientos no funcionales

- **Seguridad:** validar toda la entrada (forma de `items`, tipos, límites); endpoint público con
  **rate limiting**; no filtrar datos internos; la validación no debe permitir enumerar variantes por
  diferencias de respuesta más allá de existencia/stock necesarios.
- **Rendimiento:** una sola consulta agregada para validar todo el carrito (evitar N+1); respuesta
  rápida para no penalizar la UX de compra.
- **Idempotencia/coherencia:** `validate` es de solo lectura; no muta estado.

## Fuera de alcance

- Persistencia del carrito y UI → **frontend** (etapa 02 del front).
- Descuento real de stock y transacción → **etapa 03** (pago) y materialización en el webhook.
- Creación de la orden → **etapa 03/04**.
