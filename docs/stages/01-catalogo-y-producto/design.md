# Etapa 01 — Catálogo y producto · design.md (Backend)

## 1. Encaje en la arquitectura (núcleo estable)

El catálogo es **núcleo estable**: la API de productos no cambia entre drops. El único punto de
contacto con la fachada por drop es el **filtro por drop activo** (REQ-01-5), que se resuelve con un
`drop_id` y el estado del drop (etapa 06). El backend sirve datos; el frontend decide cómo se ven.

Se respeta la separación del boilerplate: `routes → services → repos → models`. Se reutiliza
`ProductoRepo`/`ProductoService` existentes como punto de partida, refactorizándolos al nuevo modelo.

## 2. Componentes (Express)

- **`models/Product.ts`, `models/ProductVariant.ts`, `models/ProductImage.ts`** (Sequelize) — nuevas
  entidades; `Product` reemplaza conceptualmente a `Producto` (se conserva nombre de tabla `Producto`
  para datos legacy o se renombra en migración, ver §4).
- **`repos/ProductRepo.ts`** — refactor de `ProductoRepo.ts`: `list({ filters, pagination, dropId })`,
  `getBySlug(slug)`, helpers de stock por variante. **Única capa con acceso a base.**
- **`services/ProductService.ts`** — reglas de catálogo: resolución del drop activo, armado del DTO
  público, ocultamiento de productos inactivos/fuera de drop.
- **`routes/ProductRoutes.ts`** — `getAll` (listado) y `getOne` (detalle por slug); validación de
  query/params con `validate` (`jet-validator`/`zod`).
- **`common/Paths.ts`** — agregar `Products` con rutas REST por slug (manteniendo las existentes para
  no romper consumidores actuales durante la transición).
- **Middleware de validación** reutilizable para query de paginación/filtros.

## 3. Modelo de datos específico (Postgres)

Tablas (ver `docs/00-overview/data-model.md` para el ER completo):

- **`product`** (o `Producto` renombrada): `id BIGSERIAL PK`, `slug TEXT UNIQUE NOT NULL`,
  `name TEXT NOT NULL`, `description TEXT`, `category TEXT`, `tags TEXT[]`,
  `base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0)`, `drop_id BIGINT NULL REFERENCES drop(id)`,
  `is_active BOOLEAN NOT NULL DEFAULT true`, `is_featured BOOLEAN NOT NULL DEFAULT false`,
  `created_at`, `updated_at`.
- **`product_variant`**: `id`, `product_id BIGINT REFERENCES product(id) ON DELETE CASCADE`,
  `size TEXT`, `color TEXT`, `sku TEXT UNIQUE NOT NULL`, `stock INTEGER NOT NULL CHECK (stock >= 0)`,
  `price_override NUMERIC(12,2) NULL`.
- **`product_image`**: `id`, `product_id ... ON DELETE CASCADE`, `url TEXT`, `alt TEXT`,
  `position INTEGER NOT NULL DEFAULT 0`.

Índices: `product(slug)`, `product(drop_id)`, `product(category)`, `product_variant(sku)`,
`product_variant(product_id)`, `product_image(product_id, position)`.

### Migraciones (REQ-01-6, REQ-01-7)
1. Instalar `sequelize-cli`; crear carpeta `migrations/` y `config` de Sequelize que lea env.
2. Migración `0001_create_product_tables` (*up/down*) que crea `product_variant`, `product_image` y
   ajusta/renombra `Producto`.
3. Migración de datos `0002_migrate_legacy_products`: por cada fila de `Producto` (nombre/color/talle/
   precio/stock), crear/agrupar un `product` por `name` y una `product_variant` por (talle,color),
   generando `slug` y `sku`. Idempotente y reversible.
4. Cambiar `database.ts`: `sync({ alter: true })` **solo si `NODE_ENV === 'test'`**; en otros entornos,
   no sincroniza (las migraciones gobiernan el esquema).

## 4. Contratos de API

> Respuestas en JSON. Precios en string/number con 2 decimales (ARS). Sin exponer campos internos.

### `GET /products`
- **Query:** `page` (int ≥1, default 1), `limit` (int 1–48, default 24), `category` (string),
  `tag` (string), `q` (búsqueda texto), `featured` (bool). Filtra **drop activo** por defecto.
- **200:**
  ```json
  {
    "items": [
      { "id": 12, "slug": "tee-core-black", "name": "...", "category": "tees",
        "basePrice": 18000.00, "currency": "ARS", "isFeatured": true,
        "images": [{ "url": "...", "alt": "...", "position": 0 }],
        "variants": [{ "id": 1, "size": "M", "color": "black", "available": true }] }
    ],
    "page": 1, "limit": 24, "total": 37
  }
  ```
- **400:** parámetros inválidos. **Errores:** `{ "error": "mensaje" }` (handler global).

### `GET /products/:slug`
- **200:** producto completo con `images[]` y `variants[]` (cada variante con `stock`/`available` y
  `price` efectivo = `price_override ?? basePrice`).
- **404:** slug inexistente, producto inactivo o fuera del drop activo (mismo 404 para no filtrar).

> Las rutas legacy `GET /producto`, `GET /producto/:id`, `PUT /producto/idBySpecs` se mantienen
> temporalmente y se marcan como *deprecated*; las nuevas usan `slug`. Las rutas de escritura
> (`POST/PUT/DELETE`) **se mueven a admin** (etapa 05); en esta etapa **no** se exponen públicamente.

## 5. Flujos

### Listado dependiente del drop activo
```
Cliente → GET /products?category=tees&page=1
  Route valida query
  → ProductService.listPublic(filters)
       → resuelve dropId activo (DropService/DropRepo, etapa 06; en 01: stub que devuelve "sin drop"
         o un dropId configurable)
       → ProductRepo.list({ filters, dropId, onlyActive: true, pagination })
  → arma DTO (oculta inactivos / fuera de drop)
  ← 200 { items, page, limit, total }
```
> **Dependencia con etapa 06:** mientras `Drop` no exista, `ProductService` usa un *stub* de
> "resolución de drop activo" (configurable) para no bloquear. Al implementar 06, se conecta el real.

### Detalle
```
Cliente → GET /products/:slug
  → ProductService.getPublicBySlug(slug)
       → ProductRepo.getBySlug(slug)  (join variantes + imágenes)
       → si null / inactivo / fuera de drop ⇒ 404
  ← 200 { producto }
```

## 6. Seguridad de la etapa

- **Validación** estricta de `page/limit/category/tag/q/slug` (tipos, longitudes, allow-list);
  `q` saneado y usado solo en consultas **parametrizadas** (Sequelize `Op.iLike`), nunca SQL crudo.
- **Sin escritura pública:** los endpoints de alta/edición no existen en este repo todavía; cuando
  lleguen (etapa 05) van detrás de auth + RBAC.
- **No filtrar existencia:** 404 uniforme para inactivo/inexistente/fuera de drop.
- **Límite de `limit`** para evitar consultas de payload gigante (DoS por paginación).

## 7. UX y rendimiento

- Paginación con `total` para que el frontend muestre paginadores/scroll infinito.
- `Cache-Control`/`ETag` en listado y detalle (no varían por usuario); invalidar al cambiar de drop.
- Índices definidos en §3 para listados rápidos. Búsqueda `q` con índice trigram opcional si crece.

## 8. Trazabilidad

| Decisión de diseño | Cubre |
| --- | --- |
| Tablas `product`/`product_variant`/`product_image` + CHECKs | REQ-01-1, REQ-01-2 |
| `GET /products` con filtros/paginación y filtro por drop activo | REQ-01-3, REQ-01-5 |
| `GET /products/:slug` con 404 uniforme | REQ-01-4 |
| `drop_id` opcional + resolución de drop activo | REQ-01-5 |
| Migraciones up/down + `sync` solo en test | REQ-01-6 |
| Migración de datos legacy idempotente | REQ-01-7 |
