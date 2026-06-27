# Sistema de drops — Fachada por drop / núcleo estable (visión backend)

> Este es el documento arquitectónico **más importante** del proyecto. Atraviesa todas las etapas.
> Acá se describe **el rol del backend**; el motor de fachada visual vive en el paquete del
> frontend (`front/docs/00-overview/drop-system.md`).

## 1. Idea central

Con cada **drop** (lanzamiento de la marca), el storefront **cambia de aspecto** (colores,
tipografías, layout, assets, animaciones), pero **toda la lógica funcional permanece intacta**:
carrito, checkout, pagos, órdenes, seguimiento y admin se comportan igual drop tras drop.

El objetivo es **cambios de fachada rápidos sobre una base fuerte, segura y probada**. Para
lograrlo, se separa estrictamente:

- **Núcleo estable (backend + lógica del frontend):** lo que no cambia entre drops.
- **Fachada (capa de presentación del frontend):** lo único que cambia por drop.

## 2. Principio rector para el backend

> **El backend no sabe cómo se ve un drop.** Almacena y sirve *datos del drop* (qué productos,
> qué ventana temporal, qué blob de tema), pero **nunca interpreta** colores ni layouts. Un drop
> nuevo **no debe requerir cambios en la API.**

Esto convierte al sistema de drops, del lado backend, en un problema de **datos y estados**, no de
presentación.

## 3. La entidad `Drop` (definida en detalle en la etapa 06)

Campos conceptuales (ver `data-model.md` y `docs/stages/06-sistema-de-drops`):

- `id`, `slug`, `name`
- `status`: `scheduled` | `active` | `ended` | (implícito `none` cuando no hay ninguno activo)
- `starts_at`, `ends_at` (ventana de vigencia)
- `theme` / `facade_config`: **blob JSON opaco** con la configuración de fachada que consume el
  frontend (referencias a assets, tokens de tema, layout elegido). El backend lo **valida por
  tamaño y por esquema laxo** (que sea JSON válido y no exceda un límite), pero **no lo interpreta**.
- Relación con `Product` (un producto puede pertenecer a un drop; ver §5).

## 4. Estados del drop y resolución del "drop activo"

```
        crea/edita (admin)         starts_at <= now            ends_at <= now
  ──────────────────────────►  scheduled  ───────────►  active  ───────────►  ended
                                                     ▲
                                                     │ (a lo sumo 1 active a la vez)
                                                     │
                          si no hay ninguno active ──┘ → estado "none" (sin drop)
```

- **A lo sumo un drop `active`** simultáneamente (invariante a garantizar en datos: índice/check o
  transición controlada en la etapa 06).
- El backend expone un endpoint del estilo `GET /drops/active` que devuelve el drop activo y su
  `facade_config`, o un indicador de **"sin drop"** cuando no hay ninguno vigente.
- La transición de estados puede ser por job programado o **lazy** (al consultar, se compara con
  `now`); se decide en la etapa 06. El backend es la **fuente de verdad** del estado.

## 5. Asociación de productos a un drop

- Un producto se asocia a un drop (FK `drop_id` opcional en `Product`, o tabla puente si se quiere
  histórico multi-drop; se decide en etapas 01/06).
- El **catálogo público depende del drop activo**: `GET /products` filtra por el drop activo por
  defecto; cuando no hay drop, el catálogo público responde según la regla de la página "sin drop"
  (típicamente, no se muestran productos de drop, ver fallback §6).
- El admin (etapa 05) puede listar y editar productos de cualquier drop sin ese filtro.

## 6. Fallback a "sin drop"

Cuando no hay drop `active`:
- El backend lo informa explícitamente (estado `none` en `GET /drops/active`).
- El frontend renderiza su **página "sin drop" ya existente** (`no-drop/landing`, con video +
  newsletter). El backend **no** necesita lógica especial salvo responder "sin drop" y seguir
  sirviendo el endpoint de newsletter (`/newsteller`, ya implementado).
- El catálogo de productos puede quedar oculto al público en ese estado (decisión de negocio
  documentada en etapas 01/06).

## 7. Por qué esto importa para la seguridad y el rendimiento

- **Seguridad:** tratar `facade_config` como **dato no confiable** evita que un cambio de fachada
  introduzca vectores (XSS por contenido inyectado, SSRF por URLs de assets). El backend valida
  tamaño/forma y **no ejecuta** nada del blob. Ver `security-baseline.md`.
- **Rendimiento:** como el contrato de API no cambia entre drops, el backend puede **cachear** de
  forma agresiva el drop activo y el catálogo (con invalidación al cambiar de estado). El cambio de
  fachada no debe penalizar la base funcional.

## 8. Trazabilidad

Este diseño se materializa principalmente en la **etapa 06**, pero condiciona:
- **01** (asociación producto↔drop, filtro de catálogo por drop activo),
- **04/05** (las órdenes y el admin no dependen del drop),
- **07** (validación del blob de tema como entrada no confiable; pruebas de que cambiar de drop no
  altera el comportamiento funcional ni la seguridad).
