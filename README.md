# Backend de Lute — paquete opencode

Documentación spec-driven y configuración de `opencode` para continuar el desarrollo del
**backend** de la tienda Lute (Express + TypeScript + Sequelize/PostgreSQL). Documenta **qué**
construir, **cómo** y **en qué orden**, integrándose con el código ya existente (conexión a base,
Mercado Pago básico, newsletter).

## Contenido

```
back/
├── opencode.json              # configuración de opencode (modelo placeholder; ajustar al equipo)
├── AGENTS.md                  # contexto permanente del backend (leer primero)
├── ASSUMPTIONS.md             # suposiciones tomadas ante información faltante
├── docs/
│   ├── 00-overview/           # arquitectura, stack, sistema de drops, modelo de datos, baseline de seguridad
│   └── stages/                # 01..07: requirements.md + design.md + tasks.md por etapa
└── .opencode/
    ├── command/               # comandos reutilizables (stage, security-audit, test, plan-stage)
    └── agent/                 # agentes (plan: solo lectura; security: pentester)
```

## Puesta en marcha

1. Copiá el contenido de esta carpeta a la **raíz del repositorio del backend** (`lute-back`), de
   modo que `opencode.json`, `AGENTS.md` y `docs/` queden junto a `package.json`.
2. Editá `opencode.json` → `model` y ajustalo al proveedor/modelo del equipo (`opencode models`).
3. Variables de entorno: completá `env/development.env` (y un `env/production.env`) con
   `DB_*`, `JWT_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, etc. (ver `ASSUMPTIONS.md` y
   `docs/00-overview/security-baseline.md`). **Nunca** commitear secretos.
4. Abrí opencode en la raíz del repo.

## Flujo de trabajo con opencode

- `/plan-stage 01-catalogo-y-producto` — el agente de planificación (solo lectura) propone el plan.
- `/stage 01-catalogo-y-producto` — implementa la etapa siguiendo su `tasks.md`, tarea por tarea,
  corriendo los tests de cada tarea antes de avanzar.
- `/security-audit` — el subagente de seguridad audita la etapa actual con mentalidad adversarial.
- `/test` — ejecuta la suite de tests (Jest).

## Orden de las etapas

01 → 02 → 03 → 04 → 05 → 06 → 07. El modelo de datos y los contratos de API se definen antes que la
lógica que los consume. La etapa 07 (seguridad/pentesting) es transversal: además de su etapa
dedicada al final, cada etapa termina con una tarea de pruebas adversariales.

Ver el `README.md` de nivel superior del `.zip` para la relación con el paquete del **frontend**.
