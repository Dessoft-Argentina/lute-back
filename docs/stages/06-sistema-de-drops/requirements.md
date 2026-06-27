# Etapa 06 — Sistema de drops · requirements.md (Backend)

## Resumen

Esta etapa materializa, del lado backend, la arquitectura central **"fachada por drop / núcleo
estable"** (ver `docs/00-overview/drop-system.md`). El backend debe gestionar la entidad **`Drop`** y
sus **estados** (`scheduled` → `active` → `ended`, más `none` cuando no hay ninguno), garantizar la
invariante de **a lo sumo un drop activo**, asociar **productos a un drop**, exponer
**`GET /drops/active`** con su `facade_config`, **validar el blob de tema como dato opaco**
(tamaño/forma, **sin interpretarlo**) y soportar el **fallback "sin drop"**. Conecta el *stub*
`drop-active` que la etapa 01 dejó preparado con un `DropService` real. **Premisa clave: un drop nuevo
no debe requerir cambios en la API.**

## Historias de usuario

- Como **negocio**, quiero programar un drop con su ventana temporal y su tema, para lanzar la nueva
  colección sin tocar código.
- Como **sistema**, quiero servir el drop activo y su configuración de fachada de forma rápida y
  cacheada, para que el cambio de aspecto no penalice el rendimiento.
- Como **storefront**, quiero saber si hay un drop activo o si debo mostrar la página "sin drop", para
  resolver qué renderizar.
- Como **responsable de seguridad**, quiero que el blob de tema se trate como entrada no confiable,
  para que un cambio de fachada no introduzca vectores (XSS/SSRF).

## Requerimientos funcionales

- **REQ-06-1 — Entidad `Drop`.** El sistema debe persistir drops con `slug` (UK), `name`, `status`,
  `starts_at`, `ends_at`, `facade_config` (jsonb opaco) y timestamps.
  - *EARS:* CUANDO se crea un drop, EL SISTEMA DEBE validar slug único y ventana temporal coherente
    (`starts_at < ends_at`).
- **REQ-06-2 — Estados y resolución del drop activo.** El sistema debe modelar los estados
  `scheduled|active|ended` y resolver el "drop activo" comparando `now` con la ventana (transición por
  job o **lazy** al consultar). Cuando no hay ninguno vigente, el estado efectivo es `none`.
  - *EARS:* CUANDO `now` está dentro de `[starts_at, ends_at]` de un drop, EL SISTEMA DEBE considerarlo
    `active`; fuera de toda ventana, DEBE responder `none`.
- **REQ-06-3 — Invariante de un solo drop activo.** El sistema debe garantizar **a lo sumo un drop
  `active`** simultáneamente (índice parcial único y/o transición controlada).
  - *EARS:* CUANDO se intenta activar un drop existiendo otro activo, EL SISTEMA DEBE impedirlo.
- **REQ-06-4 — `GET /drops/active`.** El sistema debe exponer un endpoint público que devuelve el drop
  activo (incluyendo su `facade_config`) o un indicador explícito de **"sin drop"**.
  - *EARS:* CUANDO no hay drop activo, EL SISTEMA DEBE responder `{ "active": false }` (o equivalente),
    sin error.
- **REQ-06-5 — Asociación producto ↔ drop y filtro de catálogo.** El sistema debe asociar productos a
  un drop (FK `drop_id`) y el **catálogo público** (`GET /products`, etapa 01) debe filtrar por el
  drop activo por defecto; el admin (etapa 05) lista sin ese filtro.
  - *EARS:* CUANDO hay un drop activo, `GET /products` DEBE devolver por defecto los productos de ese
    drop.
- **REQ-06-6 — Validación opaca de `facade_config` (sin interpretación).** El sistema debe validar el
  blob **solo** por ser JSON válido y por **límites de tamaño/forma** (profundidad/longitud), y
  **nunca** ejecutar ni interpretar su contenido (colores, URLs, layout).
  - *EARS:* CUANDO `facade_config` excede el límite de tamaño o no es JSON válido, EL SISTEMA DEBE
    rechazarlo (400) sin intentar interpretarlo.
- **REQ-06-7 — Fallback "sin drop".** Cuando el estado es `none`, el backend debe informarlo
  explícitamente y seguir sirviendo el endpoint de newsletter (`/newsteller`, ya implementado), para
  que el frontend renderice su página "sin drop" existente.
  - *EARS:* CUANDO el estado es `none`, EL SISTEMA NO DEBE requerir lógica especial más allá de
    informar "sin drop" y mantener newsletter operativo.
- **REQ-06-8 — Caché e invalidación.** El sistema debería cachear el drop activo y el catálogo
  asociado, **invalidando** al cambiar de estado o editar el drop/sus productos.
  - *EARS:* CUANDO cambia el estado del drop o sus productos, EL SISTEMA DEBE invalidar la caché del
    drop activo y del catálogo.
- **REQ-06-9 — Conectar el *stub* de la etapa 01.** El sistema debe reemplazar el *stub* `drop-active`
  (preparado en la etapa 01 para el filtro de catálogo) por la consulta real al `DropService`.
  - *EARS:* CUANDO la etapa 01 consulta "drop activo", EL SISTEMA DEBE resolverlo con `DropService`
    real (no el stub).

## Requerimientos no funcionales

- **Estabilidad del contrato:** **un drop nuevo no cambia la API** (mismos endpoints y formas); el
  `facade_config` es opaco para el backend.
- **Seguridad:** `facade_config` como entrada **no confiable** (validar tamaño/forma; no ejecutar; no
  fetch de URLs del blob desde el backend → evita SSRF; el frontend es responsable de sanear al
  renderizar). Ver `security-baseline.md`.
- **Rendimiento:** caché agresiva del drop activo/catálogo con invalidación correcta; resolución de
  estado eficiente.
- **Consistencia:** la invariante de "1 activo" se mantiene incluso ante operaciones concurrentes.

## Fuera de alcance

- Motor de fachada visual (theming/layout/assets) y consumo de `facade_config` → **frontend**
  (etapa 06 del front).
- CRUD/permiso de drops (UI y autorización) → ya cubiertos por **etapa 05**; acá se define el
  comportamiento de dominio (estados, invariante, validación opaca, endpoint público).
