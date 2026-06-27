# Etapa 01 — Catálogo y producto · requirements.md (Backend)

## Resumen

Esta etapa establece la **fuente de verdad del catálogo** en el backend: el modelo de `Product` con
variantes (talle/color), stock por variante, imágenes, categoría y asociación opcional a un drop, y
los endpoints públicos de **listado** y **detalle**. Es la base de datos sobre la que se apoyan
carrito (02), checkout (03) y órdenes (04), y la que el frontend consume para renderizar el catálogo
dependiente del **drop activo** (núcleo estable: el backend sirve datos, no presentación). Reemplaza
el modelo `Producto` plano actual por uno normalizado, sin romper datos previos, y migra de
`sequelize.sync` a migraciones versionadas.

## Historias de usuario

- Como **visitante**, quiero ver la lista de productos del drop vigente, para explorar la colección.
- Como **visitante**, quiero ver el detalle de un producto (imágenes, descripción, talles y colores
  con disponibilidad, precio), para decidir mi compra.
- Como **empleado** (vía admin, etapa 05), quiero que cada producto tenga variantes con stock propio,
  para gestionar inventario por talle/color.
- Como **sistema**, quiero exponer solo los productos del **drop activo** en el catálogo público,
  para que la fachada por drop funcione sin cambiar la API.

## Requerimientos funcionales

- **REQ-01-1 — Modelo de producto normalizado.** El sistema debe almacenar productos con `slug`
  único, `name`, `description`, `category`, `tags`, `base_price` (NUMERIC, ARS), flags `is_active`/
  `is_featured`, e imágenes ordenadas.
  - *EARS:* CUANDO se persiste un producto, EL SISTEMA DEBE exigir `slug` único y `base_price >= 0`.
- **REQ-01-2 — Variantes con stock por variante.** El sistema debe modelar variantes (`size`,
  `color`, `sku` único, `stock`, `price_override` opcional) asociadas a un producto.
  - *EARS:* CUANDO se crea una variante con `sku` ya existente, EL SISTEMA DEBE rechazarla con error 409.
  - *EARS:* EL SISTEMA DEBE impedir que `stock` sea negativo (CHECK en base).
- **REQ-01-3 — Listado público de catálogo.** El sistema debe exponer `GET /products` que devuelve
  productos **activos del drop activo**, con paginación y filtros (categoría, tag, búsqueda por texto).
  - *EARS:* CUANDO no hay drop activo, EL SISTEMA DEBE responder según la regla "sin drop" (lista
    vacía o solo productos sin drop, según configuración) y nunca exponer productos inactivos.
- **REQ-01-4 — Detalle público de producto.** El sistema debe exponer `GET /products/:slug` con el
  producto, sus imágenes y sus variantes con disponibilidad.
  - *EARS:* CUANDO el `slug` no existe o el producto está inactivo/oculto, EL SISTEMA DEBE responder 404.
- **REQ-01-5 — Asociación a drop.** El producto debe poder asociarse a un drop (`drop_id` opcional);
  el filtro de catálogo público usa el drop activo.
  - *EARS:* CUANDO un producto no pertenece al drop activo, EL SISTEMA DEBE excluirlo del listado público.
- **REQ-01-6 — Migraciones versionadas.** El sistema debe gestionar el esquema con migraciones
  *up/down*, no con `sequelize.sync({ alter: true })` (salvo en test).
  - *EARS:* CUANDO se ejecuta el arranque en producción, EL SISTEMA NO DEBE alterar el esquema automáticamente.
- **REQ-01-7 — Compatibilidad con datos existentes.** La migración debe preservar los datos del
  modelo `Producto` actual, mapeándolos al nuevo modelo (producto + variantes).

## Requerimientos no funcionales

- **Seguridad:** validación de entrada en todos los endpoints; consultas parametrizadas; los
  endpoints de escritura (crear/editar producto) **no** se exponen públicamente (van por admin,
  etapa 05). Sin filtrado de campos sensibles.
- **Rendimiento:** listado paginado (límite por defecto, p. ej. 24) e índices en `slug`, `drop_id`,
  `category`; respuestas cacheables (ETag/Cache-Control) ya que no cambian por sesión.
- **UX (de cara al frontend):** payload estable y autodescriptivo (incluye disponibilidad por
  variante y precio formateable); errores claros con códigos consistentes.
- **Observabilidad:** logs de acceso sin datos sensibles.

## Fuera de alcance

- Creación/edición de productos por parte de empleados (UI y endpoints protegidos) → **etapa 05**.
- Definición de la entidad `Drop` y sus estados → **etapa 06** (acá solo se prevé `drop_id`).
- Estado del carrito y cálculo de totales del lado cliente → **etapa 02**.
