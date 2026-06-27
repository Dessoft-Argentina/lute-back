# Etapa 01 — Catálogo y producto · tasks.md (Backend)

> Tareas atómicas y verificables. Cada una referencia su(s) `REQ-*`, define su *Definition of Done*
> (DoD) y los tests que la prueban. Respetar el orden (dependencias). Tests con Jest + Supertest.

- [x] **T01-1 — Configurar migraciones versionadas.** (REQ-01-6)
  - Instalar y configurar `sequelize-cli`/`umzug`; crear `migrations/` y config que lea las env de
    `database.ts`. Agregar scripts `npm run migrate` / `npm run migrate:undo`.
  - *DoD:* `npm run migrate` aplica una migración vacía de prueba contra la base de dev sin error.
  - *Tests:* test de humo que verifica que el runner de migraciones inicia y lista migraciones.

- [x] **T01-2 — Restringir `sync` a test.** (REQ-01-6)
  - En `database.ts`, ejecutar `sequelize.sync` **solo** si `NODE_ENV === 'test'`; en otros entornos
    no alterar esquema.
  - *DoD:* arrancar en `development` no ejecuta `alter`; en `test` sí.
  - *Tests:* unit test del branch por `NODE_ENV` (mock de `sequelize.sync`).

- [x] **T01-3 — Crear modelos `Product`, `ProductVariant`, `ProductImage`.** (REQ-01-1, REQ-01-2)
  - Definir modelos Sequelize con tipos/constraints (`base_price NUMERIC`, `stock CHECK >= 0`,
    `slug`/`sku` únicos) y asociaciones (`Product hasMany Variant/Image`). Registrar en
    `models/sequalize.ts` (`defineAssociations`).
  - *DoD:* `sync` en test crea las tablas; asociaciones consultables.
  - *Tests:* unit de modelos (crear producto con variante; violar unicidad de `sku` lanza error;
    `stock` negativo rechazado).

- [x] **T01-4 — Migración de esquema `0001_create_product_tables`.** (REQ-01-1, REQ-01-2)
  - Crear `product_variant`, `product_image`, ajustar `product` (o renombrar `Producto`), índices y
    FKs con *up/down*.
  - *DoD:* `migrate` y `migrate:undo` ejecutan sin error y dejan el esquema consistente.
  - *Tests:* integración que migra hacia arriba, verifica columnas/índices y revierte.

- [x] **T01-5 — Migración de datos legacy `0002_migrate_legacy_products`.** (REQ-01-7)
  - Mapear filas de `Producto` (nombre/talle/color/precio/stock) a `product` + `product_variant`
    (slug/sku generados). Idempotente y reversible.
  - *DoD:* dado un set de filas legacy, tras migrar hay 1 `product` por `name` y 1 `variant` por
    (talle,color) con stock preservado; correr dos veces no duplica.
  - *Tests:* integración con datos legacy de fixture; verifica conteos y reversibilidad.

- [x] **T01-6 — `ProductRepo` (refactor de `ProductoRepo`).** (REQ-01-3, REQ-01-4, REQ-01-5)
  - Métodos `list({ filters, pagination, dropId, onlyActive })` (consultas parametrizadas, `Op.iLike`
    para `q`) y `getBySlug(slug)` con join de variantes/imágenes.
  - *DoD:* repo devuelve productos paginados y filtra por `dropId`/`is_active`.
  - *Tests:* unit/integración del repo (filtros, paginación, exclusión de inactivos y de otro drop).

- [x] **T01-7 — `ProductService` con resolución de drop activo (stub).** (REQ-01-3, REQ-01-5)
  - `listPublic(filters)` y `getPublicBySlug(slug)`; arma DTO público (precio efectivo, `available`
    por variante) y oculta inactivos/fuera de drop. Resolución de drop activo vía stub configurable
    (a reemplazar en etapa 06).
  - *DoD:* DTO no incluye campos internos; "sin drop" devuelve lista vacía o productos sin drop según config.
  - *Tests:* unit del service (mapeo de DTO, comportamiento "sin drop", 404 lógico por slug ausente).

- [x] **T01-8 — `GET /products` (listado) con validación de query.** (REQ-01-3)
  - Router + middleware de validación de `page/limit/category/tag/q/featured`; límite máximo de `limit`.
  - *DoD:* responde 200 con `{ items, page, limit, total }`; 400 ante query inválida.
  - *Tests:* Supertest: 200 con filtros, 400 con `limit` fuera de rango, no aparecen inactivos.

- [x] **T01-9 — `GET /products/:slug` (detalle).** (REQ-01-4)
  - Router + validación de `slug`; 404 uniforme para inexistente/inactivo/fuera de drop.
  - *DoD:* 200 con producto+variantes+imágenes; 404 en los tres casos sin filtrar cuál.
  - *Tests:* Supertest: 200 producto activo del drop; 404 slug inexistente; 404 producto inactivo.

- [x] **T01-10 — Paths y wiring en `api.ts`.** (REQ-01-3, REQ-01-4)
  - Agregar `Paths.Products` y montar el router; marcar rutas legacy `/producto` como deprecated.
  - *DoD:* nuevas rutas responden; legacy siguen funcionando.
  - *Tests:* Supertest de ruteo (nuevas y legacy).

- [x] **T01-11 — Cache y cabeceras de catálogo.** (RNF rendimiento)
  - `Cache-Control`/`ETag` en listado y detalle; documentar invalidación al cambiar de drop.
  - *DoD:* respuestas incluyen cabeceras de cache correctas.
  - *Tests:* Supertest verifica presencia de `ETag`/`Cache-Control`.

- [x] **T01-12 — Pruebas de seguridad/adversariales de la etapa.** (RNF seguridad; ref. `security-baseline.md`)
  - Codificar como tests negativos: inyección por `q` (intento de SQL no afecta resultados),
    `limit` gigante rechazado (anti-DoS de paginación), `slug` con caracteres raros saneado,
    productos inactivos/fuera de drop nunca expuestos, ausencia de campos internos en el DTO.
  - *DoD:* todos los tests adversariales en verde; cualquier hallazgo se corrige y queda como regresión.
  - *Tests:* suite `product.security.spec.ts`.

- [x] **T01-13 — Verificación de UX/rendimiento de la etapa.** (RNF UX/rendimiento)
  - Verificar payload estable y autodescriptivo (incluye `available`/precio efectivo), tiempos de
    listado con índices, y consistencia de errores para el frontend.
  - *DoD:* listado de N productos responde dentro del presupuesto acordado con índices; contrato
    documentado y estable para el frontend.
  - *Tests:* test de contrato del DTO (forma del JSON) + medición básica de latencia del listado.
