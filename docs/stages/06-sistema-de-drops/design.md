# Etapa 06 — Sistema de drops · design.md (Backend)

## 1. Encaje en la arquitectura

Implementa el dominio del documento rector `drop-system.md`. El backend es la **fuente de verdad** del
estado del drop, pero **no interpreta** la fachada. Conecta el *stub* `drop-active` de la etapa 01 con
un `DropService` real y alimenta el filtro de catálogo. El CRUD/permiso ya vino en la etapa 05; acá va
el comportamiento de dominio.

## 2. Componentes (Express)

- **`models/Drop.ts`** — entidad `Drop` (ver modelo de datos).
- **`services/DropService.ts`** — resolución del drop activo (lazy contra `now`), transición de
  estados, garantía de invariante "1 activo", validación opaca de `facade_config`, asociación con
  productos, caché/invalidación.
- **`repos/DropRepo.ts`** — acceso a datos de drops; consulta del activo; índice parcial único.
- **`routes/DropRoutes.ts`** — `GET /drops/active` (público).
- **`util/facadeConfig.ts`** — validador **opaco**: parsea JSON, mide tamaño y profundidad/longitud,
  rechaza si excede límites; **no interpreta** claves.
- **Integración etapa 01:** `ProductService.listPublic()` usa `DropService.getActive()` para filtrar
  por `drop_id` del activo (reemplaza el stub).
- **Caché:** capa simple (in-memory/LRU o Redis si está disponible; ver ASSUMPTIONS) para el drop
  activo y el listado público, con invalidación.

## 3. Modelo de datos específico

Ver `data-model.md`. Entidad central:

- **`drop`**: `id`, `slug` (UK), `name`, `status` (`scheduled|active|ended`), `starts_at`, `ends_at`,
  `facade_config jsonb`, `created_at`, `updated_at`.
- **Asociación:** `product.drop_id` FK nullable (ya previsto en etapa 01); índice `product(drop_id)`.
- **Invariante "1 activo" (REQ-06-3):** índice parcial único
  ```sql
  CREATE UNIQUE INDEX one_active_drop ON drop ((status)) WHERE status = 'active';
  ```
  complementado con transición controlada (transacción que desactiva el anterior antes de activar).
- Índice `drop(status)` y `drop(starts_at, ends_at)` para resolución eficiente.

## 4. Contratos de API

### `GET /drops/active` (REQ-06-4, REQ-06-7)
- **200 (con drop activo):**
  ```json
  {
    "active": true,
    "drop": {
      "slug": "drop-01-invierno",
      "name": "Invierno",
      "startsAt": "2026-06-01T00:00:00Z",
      "endsAt": "2026-06-15T00:00:00Z",
      "facadeConfig": { "...": "blob opaco, el backend no lo interpreta" }
    }
  }
  ```
- **200 (sin drop):** `{ "active": false }`
- **Caché:** respuesta cacheable con invalidación por cambio de estado/edición (REQ-06-8).

> El **catálogo** (`GET /products`, etapa 01) consume internamente `DropService.getActive()` para
> filtrar por `drop_id`. No se agrega un endpoint nuevo por drop: **el contrato no cambia entre drops**.

## 5. Flujos

### Resolución del drop activo (lazy)
```
GET /drops/active  (o uso interno desde catálogo)
  → DropService.getActive()
       cache hit ⇒ devolver
       cache miss:
         drop = DropRepo.findActiveWindow(now)   // status='active' y now ∈ [starts_at, ends_at]
         si no hay ⇒ estado 'none' ⇒ { active:false }   (REQ-06-7)
         set cache (TTL corto)
  ← { active, drop? }
```

### Activación de un drop (admin, etapa 05) respetando invariante
```
PATCH /admin/drops/:id  (status → active)
  → DropService.activate(id)
       BEGIN TX
         UPDATE drop SET status='ended' WHERE status='active'   // desactiva el anterior
         UPDATE drop SET status='active' WHERE id=:id            // índice parcial único protege
       COMMIT
       invalidar caché (drop activo + catálogo)   (REQ-06-8)
  (si el índice parcial detecta colisión ⇒ ROLLBACK + 409)
```

### Validación opaca de `facade_config`
```
util/facadeConfig.validate(blob)
  parse JSON (inválido ⇒ 400)
  medir tamaño bytes (> límite ⇒ 400)
  medir profundidad/longitud de arrays/strings (> límite ⇒ 400)
  NO interpretar claves; NO resolver URLs; NO ejecutar nada
  ⇒ ok (se persiste tal cual)
```

## 6. Seguridad de la etapa

- **`facade_config` como entrada no confiable** (REQ-06-6): validar **tamaño/forma**, nunca
  interpretar ni ejecutar; el backend **no hace fetch** de URLs contenidas en el blob (evita **SSRF**).
  La sanitización al renderizar es responsabilidad del **frontend** (XSS) — ver
  `front/docs/00-overview/security-baseline.md`.
- **Invariante "1 activo"** sostenida por **índice parcial único** + transacción → evita estados
  inconsistentes por carrera.
- **Contrato estable**: como un drop nuevo no cambia la API, se reduce la superficie de cambio y el
  riesgo de regресiones de seguridad por lanzamiento.
- **Caché**: invalidación correcta para no servir un drop vencido/incorrecto.

## 7. UX y rendimiento

- Caché agresiva del drop activo y del catálogo (TTL corto + invalidación por evento) → el cambio de
  fachada no penaliza la base funcional.
- Resolución de estado eficiente (índices por `status` y ventana temporal).
- Respuesta `{ active:false }` inmediata para el fallback "sin drop".

## 8. Trazabilidad

| Decisión | Cubre |
| --- | --- |
| Entidad `drop` con slug/ventana/estado/`facade_config` | REQ-06-1 |
| Resolución lazy contra `now` + estado `none` | REQ-06-2 |
| Índice parcial único + transición controlada | REQ-06-3 |
| `GET /drops/active` (con/sin drop) | REQ-06-4 |
| `product.drop_id` + filtro de catálogo por activo | REQ-06-5 |
| `util/facadeConfig` (tamaño/forma, sin interpretar) | REQ-06-6 |
| Estado `none` + newsletter operativo | REQ-06-7 |
| Caché + invalidación por cambio de estado/productos | REQ-06-8 |
| `DropService` real reemplaza el stub de etapa 01 | REQ-06-9 |
