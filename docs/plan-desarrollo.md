# Plan de desarrollo — Frontend SyncTaller

Plan por fases para construir la SPA sobre la API existente (`../synctaller-backend`, FASES 10–25, 222 rutas).
Creado el 2026-10-21. Marcar `[x]` al cerrar cada punto (con lint, build y verificación en navegador).

## Decisiones tomadas (2026-10-21)

| Tema | Decisión | Motivo |
|---|---|---|
| Permisos en el cliente | Nuevo endpoint `GET /api/me` en el backend que devuelve el usuario, sus roles y los **nombres** de sus permisos | `POST /login` solo trae IDs de permisos y no había forma de revalidar el token al recargar. Evita duplicar el seeder en el frontend |
| Almacenamiento del token | `localStorage` | La sesión sobrevive a recargas. Los tokens de Sanctum no expiran; `POST /logout` los revoca |
| Datos remotos | TanStack Query | Caché, invalidación tras mutaciones y estados de carga/error uniformes en ~40 pantallas |
| Formularios | Estado de React + `FormField` con errores `422` | Sin librería extra hasta que haga falta |

Pendientes de decidir cuando se llegue: librería de gráficos (F11), runner de tests (Vitest + Testing Library).

## Criterios de cierre de cada fase

* `npm run lint` y `npm run build` sin errores.
* Pantallas verificadas en el navegador con un usuario de cada rol involucrado (no solo administrador).
* Errores de negocio (`error_code`) mostrados con el `message` del backend.
* Rama propia (`feature/…`); commit solo cuando el usuario lo pide.

---

## F0 — Base del proyecto (bloquea todo lo demás)

**Backend** (rama propia en `../synctaller-backend`, cambio aprobado):

- [x] `GET /api/me` bajo `auth:sanctum`, sin permiso específico: `data.user` (`UserResource`) +
      `data.permissions` (nombres ordenados; el administrador recibe todos los del guard `api`). Rama
      `feature/endpoint-me` (2026-10-21), mergeada.
- [x] Tests en `tests/Feature/Auth/LoginTest` (cajero, administrador, sin token; suite: 300 en verde) y documentación
      del backend (`CLAUDE.md`, `README.md`, `handoff.md` 2.2, `guia-postman.md` B.2b).

**Frontend:**

Rama `feature/f0-base` (2026-10-21), mergeada. Lint y build en verde. Flujo verificado por HTTP contra el backend
local (entonces `presupuestador.test`) con origen `localhost:5173`; falta la revisión visual en el navegador.

- [x] `git init`, `.gitignore` (incluye `.env`), estructura: `src/app` (router, navegación), `src/services`,
      `src/types`, `src/components/{ui,layout}`, `src/features/<módulo>`, `src/pages`, `src/lib`; alias `@/`;
      `.env.example` con `VITE_API_URL`; puerto 5173 fijo (`strictPort`).
- [x] Tabler: `@tabler/core` (solo CSS; dropdowns, menú y modales controlados por React); layout con sidebar + topbar
      responsive; páginas 404/403; plantilla Vite eliminada.
- [x] Cliente Axios (`src/services/api.ts`): `ApiError` normalizado, Bearer desde `localStorage`, `401` con token →
      limpia la sesión y vuelve al login; helpers `getData`, `getPage`, `postData`, `putData`, `patchData`, `deleteData`.
- [x] Descarga de archivos (`downloadFile`): blob, error JSON dentro del blob, nombre desde `Content-Disposition`
      (expuesto en CORS por la rama `fix/cors-content-disposition` del backend) con un nombre de respaldo.
- [x] Tipos base: `ApiEnvelope`, `Paginated<T>`, `Pagination`, `ValidationErrors`, `ListParams`.
- [x] TanStack Query: reintentos solo en red/5xx; errores de mutaciones → toast (salvo 422/401 o
      `meta.skipErrorToast`); `meta.successMessage` → toast de éxito. Query keys: `[módulo, ...]` (sesión: `['me']`).
- [x] Autenticación: `LoginPage`, logout, `AuthProvider` que hidrata con `GET /me`, `ProtectedRoute`,
      `RequirePermission`, `can(permission | permission[])`.
- [x] Componentes: `DataTable` (+ `useListParams` con búsqueda diferida), `Pagination`, `FormField` / `TextField` /
      `SelectField` / `TextareaField`, `Modal`, `ConfirmDialog` (con motivo), `StatusBadge` + `StatusMap`,
      `PageHeader` / `PageBody`, `LoadingState` / `EmptyState` / `ErrorState`, `Toaster`.
- [x] Formateadores (`src/lib/format.ts`): guaraníes, decimales, cantidades, fechas (sin desfase en `YYYY-MM-DD`).
- [x] Menú lateral filtrado por permisos (`src/app/navigation.ts`); cada módulo pendiente tiene una pantalla
      provisoria con su permiso, que la fase correspondiente reemplaza.
- [x] Verificación por HTTP (2026-10-21): CORS, login real, `GET /me`, `403` en `/users` para el mecánico, logout y
      `401` posterior; menú esperado: administrador 30 ítems, mecánico 11; todos los permisos del menú existen.
- [ ] Revisión visual en el navegador (layout, menú móvil, recarga con sesión, página 403).

## F1 — Datos maestros del taller

Rama `feature/f1-datos-maestros` (2026-10-21). Lint y build en verde; contratos verificados por HTTP (formas de
listado/detalle y campos de cada 422). Falta la revisión visual.

- [x] Marcas (`brands`) y modelos (`vehicle-models`, permisos `vehicle_models.*` con guion bajo): una pantalla con
      dos tablas (`/brands`).
- [x] Clientes (`/clients`, `/clients/:id`): listado, ficha con sus vehículos, alta/edición (incluye
      `notifications_enabled`), baja; alta de vehículo por `clients/{client}/vehicles`.
- [x] Vehículos (`/vehicles`): listado, alta con buscador de cliente (`ClientPicker`), edición y baja; chapa o
      `no_plate` + chasis; enums de color, combustible y transmisión.
- [x] Ítems de checklist (`/checklists`) y categorías de servicio (filtro y select, solo lectura).
- [x] Servicios (`/services`): filtros por categoría y estado, activar / desactivar (`services.change-status`).
- [x] Mecánicos (`/mechanics`): filtro por estado; el usuario se elige al crear (requiere `users.index`).
- [ ] Revisión visual en el navegador.

Piezas compartidas nuevas: `FormModal`, `DeleteDialog`, `IconButton`, `SwitchField`, `useApiMutation`,
`lib/forms.ts` (`compact`, `toNumber`, `toInput`), `formatMoney`.

Limitaciones del backend que condicionan la UI:

- **Resueltas en `fix/ajustes-datos-maestros` del backend + `feature/f1-ajustes` del frontend (2026-10-21; mergear
  las dos juntas):** filtro `brand_id` en `vehicle-models` (el select ya no carga los 250 modelos); los opcionales
  se vacían al editar (el frontend manda `null`); bajas de marca/modelo con vehículos → 409
  `BRAND_HAS_VEHICLES` / `VEHICLE_MODEL_HAS_VEHICLES` (toast con el mensaje).
- **Resueltas en `fix/decisiones-datos-maestros` del backend (2026-10-21):** el listado de clientes trae
  `document_number` (columna RUC/CI y buscador de clientes); marca con modelos → 409 `BRAND_HAS_MODELS`; costo y
  comisión del mecánico en `null` → 422 (antes 500). El frontend los omite si están vacíos (alta: 0; edición: sin
  cambios).
- `MechanicResource` no trae `user_id`: el usuario del mecánico no se puede cambiar desde la edición.
- `checklists.required` llega como `1/0`, no como booleano.

## F2 — Catálogo de repuestos e inventario

Rama `feature/f2-inventario` (2026-10-21). Lint y build en verde. Verificado por HTTP contra el backend local (con
`fix/opcionales-inventario`): CORS, filtros de cada listado, altas, ediciones que vacían opcionales, bajas, los
`error_code` de inventario (`INVENTORY_INITIAL_ALREADY_REGISTERED`, `INVENTORY_FRACTIONAL_QUANTITY_NOT_ALLOWED`,
`INSUFFICIENT_STOCK`, `INVENTORY_NO_DIFFERENCE`) y los 403 del mecánico (sin `suppliers.index` ni operaciones de
stock).

- [x] Categorías de repuestos (`/part-categories`, filtro activa/inactiva, `is_active`) y proveedores
      (`/suppliers`, filtro por estado; la edición pide el detalle por dirección y notas).
- [x] Repuestos (`/parts`, `/parts/:id`): filtros por categoría, proveedor y estado; ficha con stock, proveedores
      del repuesto (vincular, editar código/último costo/preferido, desvincular) y movimientos; activar / desactivar
      / descontinuar (con confirmación, es definitivo).
- [x] Stock y movimientos (`/inventory`, dos pestañas): stock con filtros bajo mínimo / con existencia; kardex con
      filtros por tipo y fechas y detalle del movimiento (`inventory.show`).
- [x] Stock inicial, salidas (devolución a proveedor / baja) y ajuste por conteo desde la fila del stock o la ficha
      (`InventoryOperationModal`); paso 1 en unidades enteras (`unit|set|kit`).
- [x] Revisión visual en el navegador (hecha por el usuario, 2026-10-21; usuario local `deposito@mail.com.py`
      creado con tinker, no está en el seeder).

Limitaciones del backend que condicionan la UI:

- **Resueltas en `fix/opcionales-inventario` del backend (2026-10-21; mergear junto con esta rama):** las ediciones
  de repuesto, proveedor y vínculo repuesto–proveedor aceptan `null` para vaciar los opcionales (el frontend manda
  `null`); `last_cost` al editar valida `min:0` y máximo; `minimum_stock` en `null` → 422 (antes el alta daba 500):
  el frontend lo omite si está vacío (alta: 0; edición: sin cambios).
- Los movimientos no aceptan `search`: solo filtros (`type`, fechas, `part_id`, `supplier_id`, `created_by`).

## F3 — Recepción y diagnóstico

- [ ] Recepciones: alta con categorías de servicio, edición, eliminación (solo `pending`), cancelación con motivo.
- [ ] Checklist de la recepción (`reception-check-lists`): valor según tipo de ítem.
- [ ] Fotos de recepción.
- [ ] Diagnósticos e ítems de diagnóstico (severidad, estado, fotos).
- [ ] **Ficha de recepción**: pantalla eje que luego muestra presupuestos, OT, factura y entrega.

## F4 — Presupuestos

- [ ] Listado y alta desde la recepción.
- [ ] Editor de ítems `labor | service | part` (solo en `draft`); totales del backend.
- [ ] Acciones `send`, `approve`, `reject`, `reopen`, `cancel` según estado y permiso.
- [ ] Descargar PDF (`budgets/{id}/pdf`).

## F5 — Órdenes de trabajo

- [ ] F5a: crear OT desde presupuesto aprobado; `start`, `pause`, `resume`, `complete`, `cancel`; editar responsable
      y notas (`pending`); ítems: iniciar / completar / cancelar.
- [ ] F5b: asignación de mecánicos por ítem (porcentajes) y horas; repuestos de la OT: agregar, reservar, consumir,
      devolver, cancelar.
- [ ] Cierre económico visible solo con `work-orders.view-economics`.

## F6 — Facturación y cobros

- [ ] Timbrados (`invoice-stamps`, administrador).
- [ ] Facturar OT (`work-orders/{id}/invoice`), editar borrador y líneas, emitir, anular.
- [ ] Pagos de factura (medios, vuelto en efectivo, recibo a crédito); listado de pagos y anulación con motivo.
- [ ] Resumen de caja (`payments/summary`).
- [ ] PDF de factura (`invoices/{id}/pdf`) y recibo (`payments/{id}/receipt`, solo facturas a crédito).

## F7 — Entrega del vehículo

- [ ] Registrar entrega desde la recepción (km, conformidad, firma en imagen).
- [ ] Listado de entregas y anulación con motivo (administrador).
- [ ] PDF del comprobante de entrega (`vehicle-deliveries/{id}/pdf`).

## F8 — Compras y proveedores

- [ ] Compras: borrador, líneas (costo con IVA y tasa), recibir, anular, eliminar borrador.
- [ ] Pagos a proveedores desde la compra; listado, anulación y resumen de egresos.
- [ ] Cuentas por pagar (`accounts-payable`).

## F9 — Historial y mantenimiento preventivo

- [ ] Historial del vehículo: servicios, repuestos y kilometraje (costos solo con `work-orders.view-economics`).
- [ ] Planes de mantenimiento (administrador).
- [ ] Seguimiento por vehículo (`vehicles/{id}/maintenances`) y alertas (`maintenance/alerts`).

## F10 — Comisiones

- [ ] Comisiones por mecánico y liquidación por período (administrador).

## F11 — Reportes y dashboard

- [ ] Dashboard por bloques según permisos (pantalla de inicio).
- [ ] Reportes `sales`, `budgets`, `profitability`, `productivity`, `inventory`, `clients` con filtro de período.
- [ ] Exportar cada reporte a CSV y PDF (`?format=csv|pdf`).

## F12 — Administración

- [ ] Usuarios con roles (`users`).
- [ ] Roles con permisos agrupados por módulo (`roles/permissions-grouped-by-module`) y permisos.
- Puede adelantarse si hace falta crear usuarios antes; mientras tanto se usan los del seeder.

## F13 — Notificaciones

- [ ] Bandeja interna en la topbar: contador (`meta.unread_count`), listado con filtros `unread`/`type`, marcar leído
      y todo leído (`me/notifications`). Sin permiso: cualquier usuario.
- [ ] Avisos a clientes (`client-notifications`): listado con filtros, detalle, reenvío
      (`CLIENT_NOTIFICATION_PENDING`, `CLIENT_WITHOUT_EMAIL`, …); pestaña de avisos en la ficha del cliente.
- La bandeja puede adelantarse a F0/F1 si se quiere la campana desde el inicio.

## F14 — Auditoría

- [ ] Listado de `audit-logs` con filtros (entidad, id, usuario, evento, fechas) y detalle con valores antes/después
      (solo administrador).
