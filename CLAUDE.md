# CLAUDE.md — SyncTaller (Frontend)

Instrucciones permanentes para trabajar en este repositorio: la SPA de SyncTaller (antes llamado Presupuestador).
El backend (API Laravel) vive en un repositorio aparte, `../synctaller-backend`.

| Documento | Para qué |
|---|---|
| `CLAUDE.md` (este) | Reglas del frontend, contrato con la API y resumen de negocio |
| [`../synctaller-backend/CLAUDE.md`](../synctaller-backend/CLAUDE.md) | Reglas del backend y **reglas de negocio detalladas** (sección 6), con sus `error_code` |
| [`../synctaller-backend/README.md`](../synctaller-backend/README.md) | Instalación y estado del backend |
| [`../synctaller-backend/docs/handoff.md`](../synctaller-backend/docs/handoff.md) | Historia y decisiones por fase; deuda técnica (sección 14) |
| [`../synctaller-backend/docs/testing/guia-postman.md`](../synctaller-backend/docs/testing/guia-postman.md) | Requests, bodies y respuestas esperadas de cada endpoint |

Si una regla de este archivo contradice al código (de este repositorio o del backend), **el código manda**: avisar
de la discrepancia en lugar de "corregir" por cuenta propia. Ante dudas sobre un endpoint, consultar las rutas
(`php artisan route:list --path=api` en el backend), sus Requests y Resources, no suponer.

---

## 1. Estado actual (verificado el 2026-10-22)

* **Backend/API:** Laravel 12.70, roadmap completo (FASES 10–25: hasta compras, pagos a proveedores,
  notificaciones, exportación/comprobantes PDF y auditoría), más `GET /api/me`, CORS con `Content-Disposition` y los
  ajustes de contrato pedidos por cada fase del frontend. 222 rutas API, 327 tests. Se sirve en
  `http://synctaller-backend.test` (Laragon).
  CORS y Sanctum configurados para `http://localhost:5173`. Antes de comparar contra el backend, actualizar su
  `main` (`git pull`): la copia local puede estar atrasada.
* **Frontend:** F0 (base: cliente Axios, sesión con `GET /me`, layout Tabler, menú por permisos, componentes
  compartidos), F1 (datos maestros), F2 (repuestos e inventario), F3 (recepción y diagnóstico), F4 (presupuestos),
  F5 (órdenes de trabajo), F6 (facturación y cobros), F7 (entrega del vehículo), F8 (compras y proveedores) y F9
  (historial y mantenimiento preventivo) en `main`; F10 (comisiones) en `feature/f10-comisiones`. Los módulos siguientes muestran una pantalla provisoria hasta su
  fase. Avance y estructura de carpetas en [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md). Antes de crear un
  componente, revisar `src/components/ui` y `src/lib`.
* **Estructura de un módulo** (seguir F1): `src/features/<módulo>/api.ts` (tipos según el Resource, etiquetas de
  enums, `xxxApi` con `getPage`/`postData`/…), páginas `XxxPage.tsx` con `DataTable` + `useListParams`, formularios
  en `FormModal` con `useApiMutation` (`invalidate` por prefijo de query key, `successMessage`) y errores de
  `validationErrors(mutation.error)`; bajas con `DeleteDialog`; la ruta se registra en `src/app/router.tsx`
  (`guarded(path, permiso, página)`).
* **Pendiente en el backend (sin diseño ni fase):** notificaciones por WhatsApp.

---

## 2. Metodología de trabajo

Antes de implementar cualquier cambio:

1. Inspeccionar el código existente relacionado (componentes, servicios, rutas, tipos) y el endpoint que se consume
   (ruta, Request, Resource y permiso en el backend).
2. Identificar las reglas de negocio y los módulos afectados (sección 7 y backend `CLAUDE.md`, sección 6).
3. Proponer el cambio mínimo y explicar su motivo. Las decisiones de negocio se consultan, no se suponen.
4. Implementar solo el alcance autorizado.
5. Ejecutar `npm run lint` y `npm run build` (incluye `tsc -b`) antes de dar algo por terminado.
6. Verificar visualmente las pantallas en el navegador siempre que sea posible.
7. Informar archivos modificados, comprobaciones ejecutadas y resultados.
8. Documentar las decisiones de arquitectura importantes.

### Git

* Nunca trabajar ni commitear en `main`. Una rama por tarea: `feature/…`, `fix/…`, `docs/…`.
* Commit y push solo cuando el usuario lo pide. El merge a `main` lo hace el usuario.
* Mensajes de commit en español, describiendo el porqué.

### Entorno (Windows / Laragon)

* `npm run dev` levanta Vite en `http://localhost:5173` (el puerto que permite el CORS del backend; no cambiarlo
  sin ajustar `config/cors.php` y `SANCTUM_STATEFUL_DOMAINS` en el backend).
* No editar archivos con `Get-Content`/`Set-Content` de PowerShell 5.1: corrompen UTF-8 y agregan BOM. Usar las
  herramientas de edición.
* No modificar el backend desde este repositorio sin una necesidad identificada y aprobada.

---

## 3. Arquitectura del frontend

### Stack

| Pieza | Paquete |
|---|---|
| UI | React 19 + **TypeScript** (`.tsx`/`.ts`) |
| Build | Vite (`vite.config.ts`) |
| Sistema visual | Tabler UI oficial (`@tabler/core`) sobre Bootstrap 5; iconos `@tabler/icons-react` |
| Navegación | React Router (`react-router-dom` 7) |
| HTTP | Axios |
| Datos remotos | TanStack Query (caché, invalidación tras mutaciones, estados de carga) |
| Formularios | Estado de React + `FormField` con errores `422` (sin librería extra) |
| Calidad | ESLint (`typescript-eslint`, `react-hooks`) |

Plan de desarrollo por fases y decisiones tomadas: [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md).

No hay runner de tests instalado. Agregar uno (p. ej. Vitest + Testing Library) es una decisión a consultar.

### Reglas de interfaz

1. **Tabler UI** es el sistema visual principal ([docs](https://docs.tabler.io/ui)). CSS propio solo cuando sea
   estrictamente necesario para personalizar Tabler.
2. **Prohibido Tailwind CSS** (no instalar ni usar).
3. **Prohibido el paquete obsoleto `tabler-react`.**
4. Componentes reutilizables para tablas, formularios, botones, modales, alertas y estados (carga, vacío, error).
5. Diseño consistente entre todos los módulos administrativos.
6. No manipular el DOM con JavaScript externo cuando React pueda gestionar la interacción (los componentes JS de
   Bootstrap/Tabler se controlan desde React).
7. Componentes accesibles y responsive (escritorio y móvil).
8. Textos de la interfaz en español; código, nombres de archivos, tipos y variables en inglés.

### Integración con la API

1. Todas las peticiones HTTP pasan por una instancia de Axios centralizada y servicios por dominio (p. ej.
   `src/services/api.ts`, `src/services/budgets.ts`). Los componentes no llaman a Axios directamente.
2. Tipar las respuestas según los Resources del backend; no inventar campos.
3. No duplicar reglas de negocio en el cliente: estados, totales, IVA, saldos y estados derivados los calcula el
   backend y el frontend los muestra. Validaciones locales solo como ayuda de UX.
4. Manejar explícitamente carga, errores de validación (`422` con `errors` por campo) y errores globales por
   `error_code` (sección 4).
5. **Permisos:** se validan siempre en el backend. Ocultar o deshabilitar opciones en el frontend es solo UX.

---

## 4. Contrato de la API

Base: `/api`. Todas las respuestas son JSON (el backend fuerza `Accept: application/json` en `api/*`).

```json
{ "success": true, "status": 200, "message": "...", "data": {}, "errors": null, "meta": null, "timestamp": "..." }
{ "success": false, "status": 422, "message": "...", "data": null, "errors": null, "error_code": "..." }
```

* Listados paginados: `meta.pagination` con `total`, `perPage`, `currentPage`, `lastPage`.
* `message` viene en español y puede mostrarse al usuario.
* Errores globales (`error_code`): 400 `BAD_REQUEST`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404
  `RESOURCE_NOT_FOUND`, 405 `METHOD_NOT_ALLOWED`, 406 `NOT_ACCEPTABLE`, 415 `UNSUPPORTED_MEDIA_TYPE`, 422
  `VALIDATION_ERROR` (detalle por campo en `errors`), 429 `TOO_MANY_REQUESTS`, 500 `INTERNAL_SERVER_ERROR`, 503
  `SERVICE_UNAVAILABLE`.
* Errores de negocio: `422` (o `409` en conflictos) con un `error_code` propio del módulo (p. ej.
  `BUDGET_NOT_EDITABLE`, `INSUFFICIENT_STOCK`). La lista completa está en el backend `CLAUDE.md`, sección 6.
* Actualizaciones parciales con `PATCH`.
* **Archivos (PDF/CSV):** `budgets/{id}/pdf`, `invoices/{id}/pdf`, `payments/{id}/receipt`,
  `vehicle-deliveries/{id}/pdf` y los reportes con `?format=csv|pdf` responden el archivo
  (`Content-Disposition: attachment`, expuesto por CORS). Usar `downloadFile` de `src/services/api.ts`: pide un blob,
  toma el nombre del header y, si falla, lee el `error_code` del JSON que viene dentro del blob.

### Autenticación

* Sanctum con tokens Bearer: `POST /api/login` (público) devuelve `data.token`; todo lo demás requiere
  `Authorization: Bearer <token>`. `POST /api/logout` revoca el token actual.
* El token se guarda en `localStorage`. Al iniciar la app la sesión se hidrata con `GET /api/me`: `data.user` (igual
  que el login), `data.permissions` (nombres; el administrador recibe todos) y `data.mechanic` (ficha de mecánico
  vinculada o `null`, en `useAuth().mechanic`). `POST /login` solo trae IDs de permisos.
* Los tokens no expiran: ante un `401` se limpia la sesión local y se redirige al login.
* Ante un `403` se informa falta de permiso; no se reintenta.

---

## 5. Convenciones de dominio que afectan a la UI

* **Moneda:** guaraníes enteros en facturas, pagos y pagos a proveedores. Mostrar con separador de miles, sin
  decimales. No hacer aritmética de dinero en el cliente para valores que se guardan.
* **IVA:** precios del presupuesto **sin IVA**, con el IVA (`invoice.default_tax_rate`, 10%) sumado al total por el
  backend (subtotal sin IVA + IVA = total); cierre económico **sin IVA**; facturas y compras **con IVA incluido**
  (10% / 5% / exento). Rotular en cada pantalla si el importe incluye IVA.
* **Cantidades de inventario:** hasta 3 decimales; repuestos `unit|set|kit` solo enteros.
* **Documentos emitidos son inmutables** (factura emitida, pago, entrega, movimiento de inventario, compra recibida,
  pago a proveedor): la UI no ofrece "editar", solo "anular" (con motivo) cuando corresponde.
* **Estados** llegan como valores en inglés (`draft`, `in_progress`, …): traducirlos en un único mapa por enum.

---

## 6. Roles y permisos

El rol `administrador` tiene todos los permisos. Los permisos por endpoint tienen la forma `<recurso>.<acción>`
(definidos en `RolesAndPermissionsSeeder` del backend).

| Rol | Función | Accesos clave |
|---|---|---|
| `administrador` | Todo | Exclusivo: usuarios/roles/permisos, auditoría (`audit-logs.*`), costos y margen (`work-orders.view-economics`), liquidar comisiones, anular entregas, timbrados, ABM de planes de mantenimiento, reporte de rentabilidad |
| `mechanic` | Ejecuta la OT | Diagnóstico, iniciar/pausar/completar OT e ítems, consumir/devolver repuestos, sus horas y comisiones, historial, estado de mantenimiento, dashboard (bloque taller) |
| `recepcionista` | Atiende al cliente | Clientes, vehículos, recepciones, checklist, presupuestos completos, registrar entregas, alertas de mantenimiento, reporte de presupuestos |
| `jefe-taller` | Organiza el trabajo | OT completas, ítems, repuestos en OT, asignación y horas de todos, diagnóstico, intervalos de mantenimiento por vehículo, reporte de productividad, consulta de compras, pagos a proveedores y cuentas por pagar |
| `cajero` | Cobra y paga | Facturas, pagos, resumen de caja, reportes de ventas y clientes, consulta de compras, pagos a proveedores completos y cuentas por pagar |
| `deposito` | Stock | Repuestos, proveedores, inventario, compras completas, repuestos en OT, reporte de inventario, consulta de pagos a proveedores y cuentas por pagar |

El rol del mecánico se llama `mechanic` (no `mecanico`). Recepcionista y cajero gestionan además los avisos a
clientes (`client-notifications.*`). La bandeja interna (`me/notifications`) no requiere permiso: cada usuario ve
solo sus avisos.

---

## 7. Módulos de la API (resumen)

Detalle de reglas y `error_code`: backend `CLAUDE.md`, sección 6.

* **Clientes, vehículos y datos maestros:** placa obligatoria salvo `no_plate = true` (entonces chasis). Vehículos
  anidados en `clients/{client}/vehicles` (listar, crear, ver); editar y eliminar en `vehicles/{vehicle}`.
* **Recepción y checklist:** estado derivado por el backend (`pending → in_progress → repair → completed`, más
  `delivered` / `cancelled`); nunca se asigna desde la UI salvo cancelar (con motivo). Fotos de recepción.
* **Diagnóstico:** ítems con severidad, estado y fotos.
* **Presupuestos (`BUD-…`):** `draft → sent → approved`; `sent → rejected → draft`; cancelar desde `draft|sent`.
  Solo `draft` es editable. Ítems `labor | service | part`. Precios sin IVA; el total suma el IVA.
* **Órdenes de trabajo (`OT-000001`):** nacen de un presupuesto aprobado. `pending → in_progress ⇄ paused →
  completed`, `pending → cancelled`. Ítems, repuestos en OT (`pending → reserved → consumed → returned`),
  asignación de mecánicos y horas.
* **Servicios, mecánicos y comisiones:** catálogo de servicios; comisiones congeladas al completar la OT;
  liquidación por período (solo administrador).
* **Cierre económico:** venta, costo y margen de la OT completada (sin IVA), visible solo con
  `work-orders.view-economics`.
* **Inventario y repuestos (`REP-…`):** stock, reservas, costo promedio, movimientos inmutables, ajustes por conteo.
* **Compras (`COM-000001`) y pagos a proveedores (`PAG-000001`):** compra `draft → received → cancelled`, costos con
  IVA incluido; pagos parciales; cuentas por pagar.
* **Facturación y pagos:** factura `draft → issued → cancelled` con timbrado activo; pagos parciales
  (`cash|card|transfer|check`), recibo `REC-000001` en facturas a crédito, resumen de caja.
* **Entrega de vehículo (`ENT-000001`):** exige OT completadas con factura emitida (y pagada si es al contado).
* **Historial y mantenimiento preventivo:** historial por vehículo, planes por km/días, alertas.
* **Reportes y dashboard:** solo lectura; un permiso por reporte; exportación con `?format=csv|pdf`; el dashboard
  muestra solo los bloques permitidos.
* **Comprobantes PDF:** presupuesto, factura (representación, no fiscal), recibo (solo facturas a crédito) y entrega;
  con marca de agua según estado. Usan el permiso `show` del documento.
* **Notificaciones:** avisos por email al cliente (registro, filtros y reenvío en `client-notifications`; por cliente
  en `clients/{client}/notifications`; baja con `clients.notifications_enabled`). Bandeja interna del usuario
  (`me/notifications`, `meta.unread_count`, marcar leído / todo leído).
* **Auditoría:** registro inmutable de cambios (`audit-logs`, filtros por entidad, usuario, evento y fechas), solo
  administrador.
