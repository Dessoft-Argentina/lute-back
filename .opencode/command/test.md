---
description: Corre la suite de tests del backend (Jest + Supertest) y reporta resultados.
---

Ejecutá la suite de tests del backend de Lute y reportá el resultado.

Foco (opcional: ruta o patrón, p. ej. `payment` o `spec/security`): $ARGUMENTS

Pasos:

1. Corré los tests (`npm test`, o el patrón indicado en $ARGUMENTS).
2. Si hay fallos, resumí causa probable y archivo afectado; proponé el arreglo mínimo.
3. Prestá atención especial a los tests de seguridad (`*.security.spec.ts`): no deben quedar en rojo.

No cambies código salvo que se pida explícitamente; este comando es para **verificar**.
