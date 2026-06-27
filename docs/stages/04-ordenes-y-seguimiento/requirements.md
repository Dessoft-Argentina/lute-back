# Etapa 04 — Órdenes y seguimiento · requirements.md (Backend)

## Resumen

Esta etapa **completa el modelo de órdenes** y agrega el **seguimiento de envío público**. El
backend debe persistir la orden con **email y snapshot de datos de pagador/envío a nivel orden**
(corrige S10: hoy `Compra` obliga FK a `Usuario` y no guarda email/envío), generar un **token de
seguimiento opaco** por orden, **notificar por email** al confirmarse el pago, y exponer un
**seguimiento público seguro frente a enumeración**: el comprador inicia el seguimiento con su email
(respuesta uniforme, sin filtrar existencia) y accede al detalle mediante un **token opaco** enviado
a ese email. Es núcleo estable: el seguimiento no cambia entre drops.

## Historias de usuario

- Como **comprador sin cuenta**, quiero consultar el estado de mi pedido con mi email, sin registrarme,
  para saber cuándo llega.
- Como **comprador**, quiero recibir un email con la confirmación y un enlace de seguimiento, para no
  depender de recordar un código.
- Como **negocio**, quiero que el seguimiento no permita a un atacante descubrir órdenes ajenas ni
  enumerar clientes, para proteger la privacidad de los compradores.
- Como **operador**, quiero actualizar el estado de envío de una orden (preparando, despachado,
  entregado), para reflejarlo en el seguimiento.

## Requerimientos funcionales

- **REQ-04-1 — Orden con datos de pagador/envío a nivel orden (corrige S10).** El sistema debe
  persistir cada orden con `buyer_email`, `buyer_name`, `buyer_phone` y `shipping_address` (snapshot
  jsonb), sin requerir una cuenta de comprador.
  - *EARS:* CUANDO se crea una orden, EL SISTEMA DEBE guardar email y datos de envío en la propia
    orden, congelados como snapshot.
- **REQ-04-2 — FK a `Usuario` opcional (transición).** El sistema debe migrar `Compra.Usuario_idUsuario`
  a **opcional** (`admin_user_id` nullable o retirada), de modo que una orden de comprador no exija
  ningún usuario.
  - *EARS:* CUANDO se crea una orden de comprador, EL SISTEMA NO DEBE exigir un `user_id`.
- **REQ-04-3 — Token de seguimiento opaco.** El sistema debe generar, al crear la orden, un
  `tracking_token` **aleatorio, opaco y único** (UUID/nanoid), **no derivable** del id ni del email.
  - *EARS:* EL SISTEMA DEBE rechazar como inválido cualquier token que no exista, con la **misma
    respuesta** que para un token mal formado (sin distinguir casos).
- **REQ-04-4 — Inicio de seguimiento por email (anti-enumeración).** El sistema debe exponer
  `POST /orders/track-request { email }` que responde **siempre de forma uniforme** ("si hay órdenes
  asociadas, te enviamos un enlace"), y, si existen órdenes para ese email, **envía por email** los
  enlaces de seguimiento con el `tracking_token`.
  - *EARS:* CUANDO el email no tiene órdenes, EL SISTEMA DEBE responder **igual** que cuando sí las
    tiene (mismo status, mismo cuerpo, sin filtrar existencia).
- **REQ-04-5 — Detalle de seguimiento por token.** El sistema debe exponer `GET /orders/track/:token`
  que devuelve el estado de la orden (estado de pago, estado de envío, ítems, fecha) **solo** ante un
  token válido.
  - *EARS:* CUANDO el token es inválido o inexistente, EL SISTEMA DEBE responder 404 con un cuerpo
    genérico, sin revelar si el token existió alguna vez.
- **REQ-04-6 — Notificación por email de confirmación.** Al confirmarse un pago `approved` (etapa 03),
  el sistema debe **enviar un email** al comprador con el resumen y el enlace de seguimiento.
  - *EARS:* CUANDO el envío de email falla, EL SISTEMA NO DEBE revertir la confirmación del pago (el
    email es best-effort, con reintento/registro).
- **REQ-04-7 — Estado de envío y entidad de seguimiento.** El sistema debe registrar el estado de
  envío de la orden (`pending` → `preparing` → `shipped` → `delivered`, con `cancelled`) y, opcional,
  `carrier`/`tracking_number` del courier, en `OrderTracking`.
  - *EARS:* CUANDO un operador actualiza el estado de envío, EL SISTEMA DEBE reflejarlo en el
    seguimiento público en la siguiente consulta.
- **REQ-04-8 — Rate limiting del seguimiento.** Los endpoints de seguimiento (`track-request` y
  `track/:token`) deben tener **rate limiting** (reusa el middleware de la etapa 02) para frenar
  fuerza bruta de tokens y abuso del envío de emails.
  - *EARS:* CUANDO se superan los intentos permitidos por IP, EL SISTEMA DEBE responder 429.

## Requerimientos no funcionales

- **Seguridad:** respuestas **indistinguibles** para orden inexistente vs. token inválido (no filtrar
  existencia); token opaco no derivable; rate limiting; prevención de IDOR (no exponer órdenes por id
  incremental); sin PII en logs. Ver `security-baseline.md` (S10).
- **Privacidad:** el email solo se usa para enviar el enlace; el detalle de seguimiento no expone
  datos de pago completos ni PII innecesaria.
- **UX/Rendimiento:** seguimiento rápido y claro; email de confirmación legible con enlace directo.
- **Confiabilidad:** el envío de email no bloquea ni revierte el flujo de pago.

## Fuera de alcance

- UI de la página pública de seguimiento y de las pantallas de email → **frontend** (etapa 04 del front).
- Gestión de envíos/etiquetas con couriers reales (se asume actualización manual del estado; ver
  ASSUMPTIONS si se integra un courier).
- Panel de administración de órdenes (alta/edición por staff) → **etapa 05**.
