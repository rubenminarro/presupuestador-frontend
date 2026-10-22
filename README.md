# SyncTaller — Frontend

SPA de SyncTaller (antes Presupuestador), el sistema de gestión del taller mecánico: recepción de vehículos,
diagnóstico, presupuestos, órdenes de trabajo, inventario, facturación y entrega.

Consume la API Laravel del repositorio [`../synctaller-backend`](../synctaller-backend), que tiene que estar
funcionando para usar la aplicación.

## Stack

* React 19 + TypeScript, compilado con Vite.
* Tabler UI (`@tabler/core`) sobre Bootstrap 5, con iconos `@tabler/icons-react`.
* React Router 7, Axios y TanStack Query.
* ESLint (`typescript-eslint`, `react-hooks`).

## Requisitos

* Node.js 22 o superior (incluye npm).
* El backend instalado y servido en `http://synctaller-backend.test` (Laragon). Ver su
  [README](../synctaller-backend/README.md). Para que se vean las fotos y firmas, su `.env` necesita
  `APP_URL=http://synctaller-backend.test` y hay que ejecutar `php artisan storage:link` una vez.

Este repositorio no usa Composer: `composer install` corresponde al backend.

## Instalación

```bash
npm ci          # instala las dependencias exactas de package-lock.json (crea node_modules)
cp .env.example .env
npm run dev     # http://localhost:5173
```

Si al ejecutar un script aparece `"vite" no se reconoce…` o `"tsc" no se reconoce…`, faltan las dependencias:
ejecutar `npm ci` (o `npm install`).

### Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://synctaller-backend.test/api` | URL base de la API, con el prefijo `/api` |

## Scripts

Los scripts se ejecutan con `npm run <script>` (por ejemplo, `npm run build`, no `npm build`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Comprobación de tipos (`tsc -b`) y build de producción en `dist/` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run preview` | Sirve el build de `dist/` para revisarlo |

El puerto 5173 es fijo (`strictPort`): es el único origen que permiten el CORS y Sanctum del backend. Si está
ocupado, Vite falla en lugar de usar otro puerto. Para cambiarlo hay que ajustar también `config/cors.php` y
`SANCTUM_STATEFUL_DOMAINS` en el backend.

## Estructura

```
src/
  app/          rutas (router.tsx) y menú por permisos (navigation.ts)
  components/   layout de la aplicación y componentes compartidos en ui/ (tablas, formularios, modales, estados)
  features/     un módulo por dominio: api.ts (tipos y servicio) y sus páginas
  lib/          utilidades: formatos, formularios, mutaciones, parámetros de listados, roles, token, avisos
  pages/        inicio, páginas de error y pantalla provisoria de módulos pendientes
  services/     cliente Axios centralizado (api.ts) y autenticación
  types/        tipos compartidos de la API
```

## Estado

Fases F0 a F6 terminadas: base, datos maestros, repuestos e inventario, recepción y diagnóstico, presupuestos,
órdenes de trabajo, y facturación y cobros. Los módulos siguientes muestran una pantalla provisoria. El detalle está en
[`docs/plan-desarrollo.md`](docs/plan-desarrollo.md).

## Documentación

* [`CLAUDE.md`](CLAUDE.md): reglas del frontend, contrato con la API, roles y permisos.
* [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md): plan por fases y decisiones tomadas.
* [`../synctaller-backend/CLAUDE.md`](../synctaller-backend/CLAUDE.md): reglas de negocio y `error_code`.
* [`../synctaller-backend/docs/testing/guia-postman.md`](../synctaller-backend/docs/testing/guia-postman.md):
  requests y respuestas de cada endpoint.

## Flujo de trabajo

* No se trabaja en `main`: una rama por tarea (`feature/…`, `fix/…`, `docs/…`).
* Antes de dar un cambio por terminado: `npm run lint` y `npm run build`.
* Commits en español, explicando el porqué.
