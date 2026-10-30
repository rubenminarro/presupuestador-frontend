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

## 1. Estado actual (verificado el 2026-10-24)

* **Backend/API:** Laravel 13.38, roadmap completo (FASES 10–25: hasta compras, pagos a proveedores,
  notificaciones, exportación/comprobantes PDF y auditoría), más `GET /api/me` (con el mecánico vinculado), CORS con
  `Content-Disposition`, la protección de roles y usuarios (`ROLE_PROTECTED`, `ROLE_IN_USE`, `USER_SELF_ACTION`), la
  aprobación del cliente para los repuestos extra en la OT y los ajustes de contrato pedidos por cada fase del
  frontend, más las preferencias visuales por usuario, el logo del sistema y el catálogo de ítems de diagnóstico. 239
  rutas API, 374 tests. Se sirve en
  `http://synctaller-backend.test` (Laragon). Los avisos a clientes salen por cola: en desarrollo hace falta
  `php artisan queue:work` (con `MAIL_MAILER=log` van al log).
  CORS y Sanctum configurados para `http://localhost:5173`. Antes de comparar contra el backend, actualizar su
  `main` (`git pull`): la copia local puede estar atrasada.
* **Datos de prueba:** `php artisan migrate:fresh --seed` en el backend deja usuarios de cada rol (contraseña
  `TEST_PASSWORD`; el administrador, `ADMIN_PASSWORD`) y cada módulo en cada uno de sus estados, con fechas en los
  últimos tres meses. Qué vehículo o documento está en cada estado: README del backend, sección "Datos de prueba".
* **Frontend:** F0 (base: cliente Axios, sesión con `GET /me`, layout Tabler, menú por permisos, componentes
  compartidos), F1 (datos maestros), F2 (repuestos e inventario), F3 (recepción y diagnóstico), F4 (presupuestos),
  F5 (órdenes de trabajo), F6 (facturación y cobros), F7 (entrega del vehículo), F8 (compras y proveedores), F9
  (historial y mantenimiento preventivo), F10 (comisiones), F11 (reportes y dashboard), F12 (administración: usuarios
  y roles), F13 (notificaciones) y F14 (auditoría) en `main`: el plan está completo y todos los ítems del menú tienen
  su pantalla (`ComingSoonPage` queda para un módulo nuevo sin construir). Además: preferencias visuales por usuario
  (`/preferences`), logo del sistema (`/system-settings`, solo administrador) y catálogo de ítems de diagnóstico
  (`/diagnostic-item-templates`: cada ítem del diagnóstico se elige de ahí). Avance, decisiones y estructura de carpetas
  en [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md). Antes de crear un componente, revisar `src/components/ui`
  y `src/lib`.
* **Estructura de un módulo** (seguir F1): `src/features/<módulo>/api.ts` (tipos según el Resource, etiquetas de
  enums, `xxxApi` con `getPage`/`postData`/…), páginas `XxxPage.tsx` con `DataTable` + `useListParams`, formularios
  en `FormModal` con `useApiMutation` (`invalidate` por prefijo de query key, `successMessage`) y errores de
  `validationErrors(mutation.error)`; bajas con `DeleteDialog`; la ruta se registra en `src/app/router.tsx`
  (`guarded(path, permiso, página)`).
* **Módulo de aseguradoras (2026-10-30):** el backend ya tiene M1–M9, P10 y M11 (clientes empresa, aseguradoras,
  siniestros, autorizaciones, reparto, facturas por responsable, notas de crédito externas y reportes; 282 rutas, 464
  tests). El frontend se adapta en cinco fases (`docs/plan-desarrollo.md`, "Adaptación al módulo de aseguradoras"):
  **FA0** (compatibilidad: clientes persona o empresa, respuesta del cliente al presupuesto, `credited`, varias
  facturas por OT), FA1 (aseguradoras y siniestros: `/insurers`, `/claims`, documentos y tarjeta en la recepción) y
  FA2 (presupuesto con aseguradora: quién paga cada línea, autorización, re-aceptación, excepciones internas en
  `/internal-exceptions` y advertencias de la OT) y FA3 (reparto en la OT, facturas por responsable, absorción del
  taller y notas de crédito en la factura) en `main`; FA4 (reportes "Cuentas por cobrar" y "Siniestros", resumen
  económico en el detalle del siniestro, notas de crédito en Ventas) en `feature/reportes-aseguradoras`.
* **Revisiones que guardan datos:** en una base MySQL temporal recién sembrada (`DB_DATABASE=… php artisan serve` en
  el backend y `VITE_API_URL` apuntando a él), nunca en la base de desarrollo `synctaller`; se borra al terminar.
* **Pendientes fuera del plan:** notificaciones por WhatsApp en el backend (sin diseño ni fase).

---

## 2. Metodología de trabajo

Antes de implementar cualquier cambio:

1. Inspeccionar el código existente relacionado (componentes, servicios, rutas, tipos) y el endpoint que se consume
   (ruta, Request, Resource y permiso en el backend).
2. Identificar las reglas de negocio y los módulos afectados (sección 7 y backend `CLAUDE.md`, sección 6).
3. Proponer el cambio mínimo y explicar su motivo. Las decisiones de negocio se consultan, no se suponen.
4. Implementar solo el alcance autorizado.
5. Ejecutar `npm run lint`, `npm run build` (incluye `tsc -b`) y `npm test` antes de dar algo por terminado.
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
| Gráficos | ApexCharts (`react-apexcharts`), siempre a través de `src/components/ui/Chart.tsx` (carga diferida) |
| Calidad | ESLint (`typescript-eslint`, `react-hooks`) |
| Tests | Vitest + Testing Library sobre jsdom (`npm test`; `vitest.config.ts` reutiliza `vite.config.ts`) |

Plan de desarrollo por fases y decisiones tomadas: [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md).

**Tests** (decisión del 2026-10-30, FA0): archivos `*.test.ts(x)` junto al código que prueban; `src/test/setup.ts` carga
los matchers de `jest-dom` y limpia el DOM. Probar sobre todo la lógica que arma el cuerpo de un request y los
formularios delicados (p. ej. `clientInput`, `ClientFormModal`); las llamadas a la API se simulan con `vi.spyOn` sobre
el servicio (`clientsApi.create`), sin red. jsdom va fijado en 29.1.1: la 30 pide Node 22.22 o más (el equipo usa
22.13). Versiones de dependencias nuevas: exactas y con al menos dos semanas de publicadas.

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
9. **Preferencias del usuario:** tema, colores, tipografía, distribución y navegación se aplican como atributos
   `data-bs-*` en `<html>` (`features/preferences/theme.ts`) y `AppLayout` arma la barra lateral, superior o
   combinada. Una pantalla nueva no debe fijar colores, fuentes ni anchos que pisen esos ajustes (usar las clases y
   variables de Tabler) y debe verse bien en claro y oscuro.

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
  vinculada o `null`, en `useAuth().mechanic`) y `data.preferences` (preferencias visuales, en
  `useAuth().preferences`). `POST /login` solo trae IDs de permisos. `GET /api/branding` (logo del sistema) es público.
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
* **Nombre del cliente:** un cliente es persona (nombre y apellido) o empresa (razón social; `first_name` y `last_name`
  en `null`). Mostrar siempre `display_name` (o `full_name` en los recursos anidados, que el backend arma igual);
  nunca concatenar nombre y apellido de un cliente. Nombre y apellido de usuarios y mecánicos no cambian.
* **Facturas de una OT:** una OT con reparto tiene una factura por responsable (aseguradora y dueño): usar `invoices[]`;
  `invoice` es una clave heredada (la última). Estado de cobro `credited` ("Acreditada"): saldada solo con notas de
  crédito.

---

## 6. Roles y permisos

El rol `administrador` tiene todos los permisos. Los permisos por endpoint tienen la forma `<recurso>.<acción>`
(definidos en `RolesAndPermissionsSeeder` del backend).

| Rol | Función | Accesos clave |
|---|---|---|
| `administrador` | Todo | Exclusivo: usuarios/roles/permisos, auditoría (`audit-logs.*`), logo del sistema (`system-settings.update`), costos y margen (`work-orders.view-economics`), liquidar comisiones, anular entregas, timbrados, ABM de planes de mantenimiento, reporte de rentabilidad |
| `mechanic` | Ejecuta la OT | Diagnóstico (consulta y usa el catálogo de ítems), iniciar/pausar/completar OT e ítems, consumir/devolver repuestos, sus horas y comisiones, historial, estado de mantenimiento, dashboard (bloque taller) |
| `recepcionista` | Atiende al cliente | Clientes, vehículos, recepciones, checklist, presupuestos completos, registrar entregas, alertas de mantenimiento, reporte de presupuestos, ver repuestos de la OT y registrar la respuesta del cliente a los extras |
| `jefe-taller` | Organiza el trabajo | OT completas, ítems, repuestos en OT (incluida la respuesta del cliente a los extras), asignación y horas de todos, diagnóstico y su catálogo de ítems, intervalos de mantenimiento por vehículo, reporte de productividad, consulta de compras, pagos a proveedores y cuentas por pagar |
| `cajero` | Cobra y paga | Facturas, pagos, resumen de caja, reportes de ventas y clientes, consulta de compras, pagos a proveedores completos y cuentas por pagar |
| `deposito` | Stock | Repuestos, proveedores, inventario, compras completas, repuestos en OT, reporte de inventario, consulta de pagos a proveedores y cuentas por pagar |

El rol del mecánico se llama `mechanic` (no `mecanico`). Recepcionista y cajero gestionan además los avisos a
clientes (`client-notifications.*`). La bandeja interna (`me/notifications`) y las preferencias (`me/preferences`)
no requieren permiso: cada usuario ve solo lo suyo.

---

## 7. Módulos de la API (resumen)

Detalle de reglas y `error_code`: backend `CLAUDE.md`, sección 6.

* **Clientes, vehículos y datos maestros:** cliente persona o empresa (`kind`; la empresa lleva `business_name` y no
  nombre ni apellido; el tipo cambia solo sin recepciones ni facturas, `CLIENT_KIND_NOT_EDITABLE`). Placa obligatoria
  salvo `no_plate = true` (entonces chasis). Vehículos anidados en `clients/{client}/vehicles` (listar, crear, ver);
  editar y eliminar en `vehicles/{vehicle}`.
* **Recepción y checklist:** estado derivado por el backend (`pending → in_progress → repair → completed`, más
  `delivered` / `cancelled`); nunca se asigna desde la UI salvo cancelar (con motivo). Fotos de recepción.
* **Diagnóstico:** ítems con severidad, estado y fotos. Cada ítem se elige **siempre** del catálogo
  (`diagnostic-item-templates`, `DIA-…`), como el repuesto de una línea de compra: el título es el del catálogo y no se
  edita; severidad, banderas, tiempo, descripción y recomendación llegan como sugerencia. Al editar, el ítem del
  catálogo queda fijo (se elimina y se agrega otro). Cambiar o eliminar la entrada no altera los diagnósticos hechos.
* **Presupuestos (`BUD-…`):** `draft → sent → approved`; `sent → rejected → draft`; cancelar desde `draft|sent`.
  Solo `draft` es editable. Ítems `labor | service | part`. Precios sin IVA; el total suma el IVA. Aprobar y rechazar
  aceptan la respuesta del cliente (medio, contacto y notas, todo opcional); el detalle trae `client_acceptances`.
* **Órdenes de trabajo (`OT-000001`):** nacen de un presupuesto aprobado. `pending → in_progress ⇄ paused →
  completed`, `pending → cancelled`. Ítems, repuestos en OT (`pending → reserved → consumed → returned`),
  asignación de mecánicos y horas. Los repuestos extra (fuera del presupuesto) nacen `awaiting_approval`: no se
  reservan ni consumen hasta registrar la respuesta del cliente (`approve` → `pending`, `reject` → `cancelled`, permiso
  `work-order-parts.approve`); aprobados, cantidad y precio no cambian y no se consume más de lo aprobado. Un extra
  sin respuesta impide completar la OT.
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
* **Preferencias y logo:** `me/preferences` (`GET|PATCH|DELETE`, 11 claves con valores cerrados y predeterminados en el
  backend); logo en `branding` (público) y `system-settings/logo` (`POST` multipart PNG/JPG hasta 2 MB, `DELETE`). El
  backend lo pone en los PDF y en los emails a clientes.
