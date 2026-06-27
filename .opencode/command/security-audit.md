---
description: Audita la seguridad del backend (o de una etapa) con mentalidad de pentester.
agent: security
---

Ejecutá una **auditoría de seguridad** sobre el backend de Lute con el ciclo
romper → corregir → reprobar.

Alcance (opcional: nombre de etapa, p. ej. `03-checkout-y-pago`; si se omite, auditá todo): $ARGUMENTS

Procedimiento:

1. Tomá como referencia `docs/00-overview/security-baseline.md` (deudas S1–S12 y modelo de amenazas)
   y `docs/stages/07-seguridad-y-pentesting/`.
2. Para cada superficie en alcance (pagos, órdenes/seguimiento, admin, drops, secretos/config):
   - **Romper:** escribí el test que ejecuta el abuso y demuestra el fallo.
   - **Corregir:** aplicá la defensa con mínimo privilegio.
   - **Reprobar:** dejá el test en verde en `spec/security/` como regresión.
3. Verificá explícitamente que no reaparezcan S1–S12 (secretos hardcodeados, `sync({alter})` en
   arranque, `atob` en verificación de token, CORS hardcodeado, `users.html` servido, etc.).

Entregá un resumen de hallazgos con severidad, la corrección aplicada y el test que la cubre.
