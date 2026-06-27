# Tech stack y convenciones — Backend de Lute

## 1. Stack obligatorio

| Capa | Tecnología | Notas |
| --- | --- | --- |
| Lenguaje | TypeScript 5 | `strict` recomendado (ver §5) |
| Runtime | Node.js 20 LTS | (`package.json` declara `>=8.10.0`; se asume entorno moderno) |
| Framework HTTP | Express 4.19 | ya presente |
| ORM | Sequelize 6.37 | sobre PostgreSQL (`pg` 8) |
| Base de datos | PostgreSQL 16 | base `lute` |
| Pagos | `mercadopago` v2 | Checkout Pro (Preferences + Webhooks) |
| Auth | `jsonwebtoken`, `bcrypt` | JWT Bearer + hashing de contraseñas |
| Seguridad HTTP | `helmet`, `cors` | CSP y CORS configurables |
| Logging | `jet-logger`, `morgan` | morgan solo en dev |

## 2. Librerías ya presentes (reutilizar, no duplicar)
`express-async-errors`, `cookie-parser`, `module-alias` (alias `@src` → `dist`),
`jet-validator`, `jet-paths`, `dotenv`, `ts-command-line-args`, `moment`.
Para tests: `jest`, `ts-jest`, `supertest` (y `jasmine` heredado del boilerplate).

> El repo trae también `mysql2` como dependencia del boilerplate; **no se usa** (la base es
> PostgreSQL). No agregar lógica MySQL.

## 3. Librerías sugeridas a incorporar (por etapa)

| Necesidad | Sugerencia | Etapa |
| --- | --- | --- |
| Validación de entrada por esquema | `zod` (o seguir con `jet-validator`) | 01+ (transversal) |
| Migraciones versionadas | `sequelize-cli` / `umzug` | 01 |
| Rate limiting | `express-rate-limit` (+ `rate-limit-redis` en prod) | 05, 07 |
| Verificación de firma de webhook MP | `crypto` (HMAC nativo) | 03 |
| Identificadores opacos (tracking) | `crypto.randomUUID()` / `nanoid` | 04 |
| Envío de mail | `nodemailer` (SMTP) o SDK `resend` | 04 |
| IDs únicos de orden | secuencia Postgres o UUID | 03/04 |
| Cabeceras/respuestas seguras extra | reforzar `helmet` | 07 |

> Antes de agregar una dependencia, verificá que no exista ya algo equivalente en el repo y
> documentá el motivo en el `tasks.md` de la etapa.

## 4. Variables de entorno

Definidas vía `pre-start.ts` + `dotenv`, cargadas por `--env=<archivo>` desde `env/`.

| Variable | Uso | Obligatoria |
| --- | --- | --- |
| `NODE_ENV` | `development` \| `production` \| `test` | sí |
| `PORT` | puerto HTTP (dev: 4000) | sí |
| `DB_NAME`, `DB_USER`, `DB_PASS` | conexión Postgres | sí |
| `DB_HOST`, `DB_PORT`, `DB_DIALECT` | (default localhost/5432/postgres) | no |
| `JWT_SECRET` | **único** secreto de firma JWT (reemplaza `"prusci"`) | sí |
| `JWT_EXPIRES_IN` | expiración de tokens (p. ej. `15m`) | recomendada |
| `COOKIE_SECRET` | firma de cookies | si se usan cookies |
| `MP_ACCESS_TOKEN` | token de Mercado Pago (reemplaza el hardcodeado) | sí |
| `MP_WEBHOOK_SECRET` | clave para verificar firma de webhook | sí |
| `CORS_ORIGINS` | orígenes permitidos, separados por coma | sí |
| `PUBLIC_STOREFRONT_URL`, `ADMIN_URL` | para back_urls y CORS | sí |
| `SMTP_*` / `RESEND_API_KEY` | envío de mail de seguimiento | etapa 04 |

**Regla:** ningún secreto en el código ni en el control de versiones. `env/*.env` con secretos
reales **no** se commitea (revisar `.gitignore`). Se versiona un `env/example.env` sin valores.

## 5. Convenciones de código

- **Idioma:** identificadores, nombres de archivo/rama, claves de config y commits en **inglés**;
  comentarios y documentación en **español**.
- **TypeScript estricto:** habilitar `strict` progresivamente; las entidades nuevas se tipan sin
  `any`. El código actual usa varios `as any`/`as unknown` (sobre todo en `MpRoutes`); reducirlos
  al endurecer cada módulo.
- **Errores:** usar `RouteError` (`common/RouteError.ts`) + `HttpStatusCodes`; el handler global de
  `server.ts` traduce a JSON `{ error }`. No filtrar stack traces ni mensajes internos al cliente.
- **Acceso a datos:** solo en `repos/`, vía modelos Sequelize parametrizados. **Prohibido** armar
  SQL por concatenación de strings.
- **Estructura:** mantener `routes → services → repos`. Una entidad nueva = un modelo + repo +
  service + router + paths en `common/Paths.ts`.
- **Alias:** importar con `@src/...` (configurado por `tsconfig-paths`/`module-alias`).

## 6. Convenciones de Git

- Ramas: `feat/<NN-stage>-<slug>` (p. ej. `feat/01-catalogo-product-model`), `fix/<slug>`,
  `chore/<slug>`, `docs/<slug>`.
- Commits: Conventional Commits. Un commit por tarea atómica cuando sea posible, mencionando el
  `REQ-*` (p. ej. `feat(catalog): add Product variant model (REQ-01-2)`).
- `git push` requiere confirmación en opencode (ver `opencode.json`).

## 7. Scripts

`npm run dev` (nodemon) · `npm test` / `npm test -- --testFile=Name` · `npm run lint` ·
`npm run build` · `npm start`. Las etapas que agreguen migraciones documentan también
`npm run migrate` / `npm run migrate:undo`.
