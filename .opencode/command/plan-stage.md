---
description: Genera un plan de implementación de solo lectura para una etapa del backend.
agent: plan
---

Generá un **plan de implementación** para la etapa indicada del backend de Lute.

Etapa (carpeta en `docs/stages/`, p. ej. `03-checkout-y-pago`): $ARGUMENTS

Pasos:

1. Leé `docs/stages/$ARGUMENTS/requirements.md` y `design.md`.
2. Repasá `docs/00-overview/` (arquitectura, modelo de datos, baseline de seguridad, drops) y
   `AGENTS.md`.
3. Inspeccioná el código actual relevante en `src/` para planear una **integración** (reusar lo
   existente), no una reconstrucción.

Devolvé:

- Lista de archivos a crear/editar y el motivo.
- Mapeo de cada paso a `REQ-*` y a las tareas `T*` del `tasks.md`.
- Deudas de seguridad (S1–S12) que toca y cómo se cierran.
- Orden de ejecución sugerido y los tests (incluyendo el adversarial de la etapa).

No edites archivos: esto es solo un plan.
