---
description: Implementa una etapa del backend siguiendo sus requirements/design/tasks.
---

Implementá la etapa indicada del backend de Lute siguiendo su documentación.

Etapa (carpeta en `docs/stages/`, p. ej. `04-ordenes-y-seguimiento`): $ARGUMENTS

Reglas de trabajo:

1. Leé `docs/stages/$ARGUMENTS/requirements.md`, `design.md` y `tasks.md`, más el contexto de
   `docs/00-overview/` y `AGENTS.md`.
2. **Integración, no reconstrucción:** reusá modelos, repos, servicios y rutas existentes en `src/`.
   Respetá el alias `@src` y las convenciones del repo.
3. Implementá las tareas `T$ARGUMENTS-*` en orden, marcando cada checkbox al completarla.
4. Para cada `REQ-*`, asegurá su criterio EARS con un test (Jest + Supertest en `spec/`).
5. **Seguridad primero:** cerrá las deudas S1–S12 que la etapa indique y escribí el test adversarial
   de la etapa (ciclo romper → corregir → reprobar).
6. Respetá la arquitectura **fachada por drop / núcleo estable**: el backend no interpreta el tema
   del drop y su API no cambia entre drops.
7. Reemplazá `sequelize.sync({ alter: true })` por migraciones versionadas cuando toques el esquema.

Al terminar: corré los tests, verificá que la etapa quede en verde y resumí qué se implementó y qué
deudas de seguridad se cerraron.
