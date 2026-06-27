# Etapa 02 — Carrito · tasks.md (Backend)

- [x] **T02-1 — `rateLimit` middleware reutilizable.** (RNF seguridad)
  - Implementar con `express-rate-limit` (memoria en dev; Redis en prod vía env). Parametrizable.
  - *DoD:* aplicable por router; configurable por env.
  - *Tests:* Supertest: superar el límite devuelve 429.

- [x] **T02-2 — `ProductRepo.getVariantsByIds(ids)`.** (REQ-02-1, REQ-02-2)
  - Una sola consulta parametrizada que trae `id, productId, COALESCE(price_override, base_price)`,
    `stock`, `is_active` del producto/variante.
  - *DoD:* devuelve solo variantes activas; sin N+1.
  - *Tests:* integración (varias variantes, alguna inactiva, alguna inexistente).

- [x] **T02-3 — `CartService.validate(items)`.** (REQ-02-1, REQ-02-2, REQ-02-3)
  - Calcular por ítem `valid/available/adjusted/unitPrice/reason`; total con cantidades efectivas;
    ignorar precios del cliente.
  - *DoD:* total correcto; ítems inválidos excluidos del total; ajuste por stock insuficiente.
  - *Tests:* unit con casos: ok, ajustado por stock, not_found, inactive, cantidad inválida.

- [x] **T02-4 — `POST /cart/validate` + validación de payload.** (REQ-02-1, REQ-02-3)
  - Router con esquema (`items` no vacío, tope de ítems, `variantId`/`quantity` válidos) + rate limit.
  - *DoD:* 200 con resumen; 400 ante payload inválido; 429 ante exceso.
  - *Tests:* Supertest de los tres caminos.

- [x] **T02-5 — `GET /variants/:id/stock` (o embeber en detalle).** (REQ-02-4)
  - Endpoint de disponibilidad puntual; 404 uniforme.
  - *DoD:* 200 con `available`; 404 si no existe/inactiva.
  - *Tests:* Supertest.

- [x] **T02-6 — Paths y wiring.** (REQ-02-1, REQ-02-4)
  - Agregar `Paths.Cart`/`Paths.Variants` y montar routers en `api.ts`.
  - *DoD:* rutas activas.
  - *Tests:* ruteo.

- [x] **T02-7 — Pruebas de seguridad/adversariales.** (RNF seguridad; ref. `security-baseline.md`)
  - Tests negativos: enviar `price` manipulado (se ignora), cantidades negativas/enormes/no enteras
    (400), array gigante (rechazo/anti-DoS), `reason` nunca filtra datos internos, rate limit efectivo.
  - *DoD:* suite adversarial en verde; hallazgos corregidos como regresión.
  - *Tests:* `cart.security.spec.ts`.

- [x] **T02-8 — Verificación de UX/rendimiento.** (RNF UX/rendimiento)
  - Validar respuesta única suficiente para el frontend y ausencia de N+1; latencia dentro del presupuesto.
  - *DoD:* contrato estable verificado; 1 sola query por validación.
  - *Tests:* test de contrato del JSON + asserción de número de queries (spy/contador).
