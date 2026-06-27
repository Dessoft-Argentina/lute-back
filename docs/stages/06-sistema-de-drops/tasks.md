# Etapa 06 — Sistema de drops · tasks.md (Backend)

- [x] **T06-1 — Entidad `Drop` + migración.** (REQ-06-1)
  - `models/Drop.ts` y migración: `slug` (UK), `name`, `status`, `starts_at`, `ends_at`,
    `facade_config jsonb`, timestamps. Validación de ventana (`starts_at < ends_at`).
  - *DoD:* migración up/down OK; slug único; ventana coherente.
  - *Tests:* integración (crear drop; slug duplicado ⇒ error; ventana inválida ⇒ error).

- [x] **T06-2 — `util/facadeConfig` (validación opaca).** (REQ-06-6)
  - Parsear JSON, medir tamaño y profundidad/longitud, rechazar si excede límites; **no interpretar**
    claves ni resolver URLs.
  - *DoD:* JSON inválido o sobredimensionado ⇒ rechazo; blob válido se acepta tal cual.
  - *Tests:* unit (válido; JSON roto; excede tamaño; excede profundidad; no se interpretan claves).

- [x] **T06-3 — Índice parcial único "1 activo" + `DropRepo`.** (REQ-06-3)
  - Migración del índice parcial único `WHERE status='active'`; `DropRepo` con `findActiveWindow(now)`,
    `findBySlug`, mutaciones de estado.
  - *DoD:* no se puede tener dos `active`; consulta del activo eficiente.
  - *Tests:* integración (intentar dos activos ⇒ violación; `findActiveWindow` correcto).

- [x] **T06-4 — `DropService` (resolución + transición + invariante).** (REQ-06-2, REQ-06-3)
  - `getActive()` (lazy contra `now`, estado `none` si no hay), `activate(id)` (TX que desactiva el
    anterior), `schedule/edit`. Garantizar invariante en concurrencia.
  - *DoD:* resuelve activo/`none`; activar respeta "1 activo"; transición transaccional.
  - *Tests:* unit/integración (activo dentro de ventana; `none` fuera; activación concurrente ⇒ 1 activo).

- [x] **T06-5 — `GET /drops/active`.** (REQ-06-4, REQ-06-7)
  - Router público que devuelve drop activo + `facade_config` o `{ active:false }`.
  - *DoD:* 200 con drop cuando hay; 200 `{active:false}` cuando no; sin error en fallback.
  - *Tests:* Supertest (con drop activo; sin drop ⇒ `active:false`).

- [x] **T06-6 — Asociación producto↔drop + filtro de catálogo (conecta etapa 01).** (REQ-06-5, REQ-06-9)
  - FK `product.drop_id` (si no quedó de etapa 01); `ProductService.listPublic()` usa
    `DropService.getActive()` para filtrar (reemplaza el stub `drop-active`).
  - *DoD:* con drop activo, el catálogo público devuelve sus productos; el admin lista sin filtro.
  - *Tests:* integración (catálogo filtra por drop activo; admin ve todos; sin drop según regla de negocio).

- [x] **T06-7 — Caché del drop activo/catálogo + invalidación.** (REQ-06-8)
  - Capa de caché (in-memory/LRU o Redis; ver ASSUMPTIONS) para activo y listado; invalidar al cambiar
    estado/editar drop o productos.
  - *DoD:* lecturas cacheadas; cambio de estado/productos invalida; nunca se sirve drop vencido.
  - *Tests:* integración (hit/miss; invalidación tras cambio de estado y tras editar producto).

- [x] **T06-8 — Pruebas de seguridad/adversariales (drops).** (RNF seguridad; ref. `security-baseline.md`)
  - `facade_config` malicioso (enorme, profundamente anidado, con URLs internas) ⇒ rechazo/no fetch
    (anti-SSRF); intento de dos drops activos (carrera) ⇒ invariante intacta; verificar que cambiar de
    drop **no** altera endpoints ni comportamiento funcional (contrato estable).
  - *DoD:* suite adversarial en verde; sin SSRF; invariante sostenida; API invariante entre drops.
  - *Tests:* `drops.security.spec.ts`.

- [x] **T06-9 — Verificación de UX/rendimiento (drop activo).** (RNF UX/rendimiento)
  - Medir latencia de `GET /drops/active` (cacheado) y del catálogo filtrado; verificar que el cambio
    de fachada no penaliza la base.
  - *DoD:* lecturas dentro del presupuesto; contrato estable entre drops.
  - *Tests:* test de contrato de `GET /drops/active` + medición de latencia con caché.
