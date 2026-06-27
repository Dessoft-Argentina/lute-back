# Etapa 02 — Carrito · design.md (Backend)

## 1. Encaje en la arquitectura

El carrito es estado del cliente; el backend aporta **validación autoritativa** (stock/precio). No
hay entidad "carrito" en la base. Reutiliza `ProductRepo`/`ProductVariant` de la etapa 01. Núcleo
estable: estos endpoints no cambian entre drops.

## 2. Componentes (Express)

- **`services/CartService.ts`** — `validate(items)`: resuelve variantes, calcula disponibilidad,
  revaloriza y arma el resumen. Sin acceso directo a base (usa repos).
- **`repos/ProductRepo.ts`** — método `getVariantsByIds(ids)` (una sola query, evita N+1) que
  devuelve `{ id, productId, price_efectivo, stock, is_active }`.
- **`routes/CartRoutes.ts`** — `POST /cart/validate`; validación de payload con esquema.
- **`middleware/rateLimit.ts`** — rate limiting reutilizable (se introduce acá y se reusa en 03/04/05).
- **`common/Paths.ts`** — agregar `Cart` y (opcional) `Variants`.

## 3. Modelo de datos específico

No agrega tablas. Usa `product`/`product_variant` (etapa 01). Lectura de `stock` y precio efectivo
(`COALESCE(price_override, base_price)`).

## 4. Contratos de API

### `POST /cart/validate`
- **Body:**
  ```json
  { "items": [ { "variantId": 10, "quantity": 2 }, { "variantId": 99, "quantity": 1 } ] }
  ```
- **200:**
  ```json
  {
    "items": [
      { "variantId": 10, "requested": 2, "available": 2, "unitPrice": 18000.00, "valid": true, "adjusted": false },
      { "variantId": 99, "requested": 1, "available": 0, "unitPrice": null, "valid": false, "reason": "not_found" }
    ],
    "total": 36000.00, "currency": "ARS"
  }
  ```
- **400:** payload malformado o cantidades inválidas (REQ-02-3). **429:** rate limit excedido.

### `GET /variants/:id/stock` (opcional / o embebido en detalle de producto)
- **200:** `{ "variantId": 10, "available": 5 }`. **404:** variante inexistente/inactiva.

## 5. Flujos

```
Frontend (carrito local) → POST /cart/validate { items }
  Route valida forma + cantidades (400 si inválido)
  → CartService.validate(items)
       → ProductRepo.getVariantsByIds(ids)   (1 query)
       → por ítem: valid? available = min(requested, stock); unitPrice desde base
       → total = Σ unitPrice * min(requested, stock) de ítems válidos
  ← 200 { items[], total }
Frontend ajusta cantidades/muestra avisos antes de ir a checkout (etapa 03).
```

## 6. Seguridad de la etapa

- **Validación de entrada**: `items` array no vacío, tope de cantidad de ítems (anti-DoS), `variantId`
  entero positivo, `quantity` entero en rango. (REQ-02-3)
- **Precios solo desde la base** (REQ-02-2): ignorar cualquier `price`/`unitPrice` del cliente.
- **Rate limiting** del endpoint (anti scraping/DoS).
- **No filtrar internals**: `reason` acotado a un set (`not_found` | `inactive` | `out_of_stock`).

## 7. UX y rendimiento

- Respuesta única con todo lo necesario para que el frontend ajuste el carrito sin múltiples llamadas.
- Consulta agregada (sin N+1); cacheo corto opcional del stock para lecturas frecuentes.

## 8. Trazabilidad

| Decisión | Cubre |
| --- | --- |
| `POST /cart/validate` con disponibilidad/precio/total | REQ-02-1, REQ-02-2 |
| Validación de cantidades en el borde | REQ-02-3 |
| `getVariantsByIds` (1 query) y `GET /variants/:id/stock` | REQ-02-1, REQ-02-4 |
| Sin reserva de stock (verdad en pago) | REQ-02-5 |
| Rate limiting + saneo de `reason` | RNF seguridad |
