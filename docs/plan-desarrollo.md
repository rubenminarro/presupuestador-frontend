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
- [x] Revisión visual en el navegador (layout, menú móvil, recarga con sesión, página 403; hecha por el usuario).

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
- [x] Revisión visual en el navegador (hecha por el usuario).

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

Rama `feature/f3-recepcion-diagnostico` (2026-10-22). Lint y build en verde. Verificado por HTTP contra el backend
local con `fix/contrato-recepciones`: formas de listado y detalle, checklist (guardar, valor inválido, procesada →
`RECEPTION_CHECKLIST_NOT_EDITABLE`), fotos (subida multipart, URL servida, descripción, baja), alta sin combustible,
diagnóstico sin prioridad, ítem con foto, edición del mecánico sin `mechanic_id`, cancelación con motivo y
`RECEPTION_CLOSED` / `RECEPTION_NOT_DELETABLE`.

- [x] Recepciones (`/receptions`): filtros por estado y fecha de ingreso; alta con buscador de cliente, vehículo del
      cliente y categorías de servicio; edición (cliente y vehículo fijos; categorías solo en `pending`); eliminación
      (solo `pending`); cancelación con motivo.
- [x] Checklist de la recepción: control según el tipo (Sí/No, número, Bueno/Malo/No aplica) y observación; solo
      editable en `pending`.
- [x] Fotos de recepción (`PhotoGallery`, compartido con los ítems de diagnóstico).
- [x] Diagnósticos (`/diagnostics`, `/diagnostics/:id`): alta desde la ficha de la recepción, edición con estado,
      ítems con severidad, estado, estimados y fotos.
- [x] **Ficha de recepción** (`/receptions/:id`): datos, checklist, diagnósticos y fotos; las fases siguientes suman
      presupuestos, OT, factura y entrega.
- [x] Revisión visual en el navegador (hecha por el usuario, 2026-10-22).

Limitaciones del backend que condicionan la UI:

- **Resueltas en `fix/contrato-recepciones` del backend (2026-10-22; mergear junto con esta rama):** fechas `Y-m-d` y
  kilometraje entero en recepciones y diagnósticos (antes `"11/10/2026"`, `"Km: 125000"`); el detalle de la recepción
  trae `check_list.id` (antes no había forma de llegar al checklist), marca, modelo, chasis y color con label;
  `DiagnosticResource` traía siempre `model: null`; el detalle del diagnóstico suma `requires_parts` /
  `requires_repair`; la edición del diagnóstico vacía textos y mecánico; `fuel_level`, `priority` y la
  severidad/estado del ítem en `null` daban 500 → 422 (el frontend los omite o siempre manda un valor).
- El mecánico no tiene `clients.index` ni `mechanics.index`: al editar una recepción, cliente y vehículo quedan fijos
  para todos; en el diagnóstico solo elige mecánico quien puede listarlos.
- La descripción de una foto de diagnóstico no se puede vaciar (`required_without_all:file`); la de recepción sí.
- El estado del checklist lo calcula el backend: `completed` con todos los obligatorios cargados y al menos el 20 %
  de los ítems con valor.

## F4 — Presupuestos

Rama `feature/f4-presupuestos` (2026-10-22). Lint y build en verde. Verificado por HTTP contra el backend local con
`fix/contrato-presupuestos`: alta (la recepción pasa a "En proceso" y vuelve a "Pendiente" al eliminar el borrador),
ítems de los tres tipos (servicio sin precio toma el estándar y las horas del catálogo), fracción en repuesto por
unidad → `INVENTORY_FRACTIONAL_QUANTITY_NOT_ALLOWED`, `BUDGET_WITHOUT_ITEMS`, `BUDGET_NOT_EDITABLE`, enviar → rechazar
→ reabrir, PDF con nombre del backend y 403 del mecánico.

- [x] Listado (`/budgets`) con filtros por estado y fechas; alta (borrador) desde la ficha de la recepción, que
      muestra sus presupuestos.
- [x] Detalle (`/budgets/:id`) con editor de ítems `labor | service | part` (solo en `draft`; buscador de repuestos y
      servicios activos que sugiere nombre y precio) y totales del backend: subtotal sin IVA, IVA y total.
- [x] Acciones `send`, `approve`, `reject`, `reopen`, `cancel` según estado y permiso, con confirmación; notas y baja
      del borrador.
- [x] Descargar PDF (`budgets/{id}/pdf`).
- [x] Revisión visual en el navegador (hecha por el usuario, 2026-10-22).

Notas:

- **IVA:** los precios del presupuesto son sin IVA, pero el backend suma el IVA (`invoice.default_tax_rate`, 10 %)
  al total, igual que el PDF. Se muestran subtotal (sin IVA), IVA y total; el listado rotula "Total (con IVA)".
- **Resuelto en `fix/contrato-presupuestos` del backend (2026-10-22; mergear junto con esta rama):** el detalle trae
  cada ítem con su repuesto o servicio y la recepción con marca y modelo; editar un ítem acepta `%` en la descripción
  (como el alta) y vacía las notas.
- Al editar un ítem el tipo queda fijo. Enviar un presupuesto genera un aviso por email al cliente (si tiene los
  avisos activos).

## F5 — Órdenes de trabajo

Rama `feature/f5-ordenes-trabajo` (2026-10-22). Lint y build en verde. Verificado con requests HTTP reales al kernel
de Laravel dentro de una transacción revertida (sin dejar datos): alta desde el presupuesto aprobado B2 y
`WORK_ORDER_ALREADY_EXISTS`; edición; reparto 60/40 y `WORK_ORDER_ITEM_SHARES_INVALID`; iniciar/pausar/reanudar y
`WORK_ORDER_NOT_IN_PROGRESS`; horas propias del mecánico (ajenas → 403) y de cualquiera con `log-hours-any`;
`WORK_ORDER_HAS_PENDING_ITEMS`; repuesto extra (precio de venta, reserva automática, edición, fracción →
`INVENTORY_FRACTIONAL_QUANTITY_NOT_ALLOWED`, cancelación); completar con cierre y comisiones congelados (recepción →
"Terminado"); `WORK_ORDER_NOT_CANCELLABLE`; el mecánico no ve `economic_summary` ni crea OT.

- [x] F5a: generar la OT desde el presupuesto aprobado (responsable obligatorio); `start`, `pause`, `resume`,
      `complete`, `cancel` con confirmación; editar responsable y notas (`pending`); ítems: iniciar / completar /
      cancelar (OT en reparación). Listado (`/work-orders`), detalle (`/work-orders/:id`) y OT en la ficha de la
      recepción y en el presupuesto.
- [x] F5b: reparto del ítem entre mecánicos (partes iguales o porcentajes que suman 100) y horas (el mecánico solo
      las suyas); repuestos: agregar (fuera del presupuesto), editar, reservar, consumir (una vez, lo usado),
      devolver con motivo, cancelar.
- [x] Cierre económico (venta, costo, margen, sin IVA; provisorio o congelado) y costos de repuestos y mano de obra
      solo con `work-orders.view-economics`; horas y comisiones para todos los que ven la OT.
- [x] Revisión visual en el navegador (hecha por el usuario, 2026-10-22).

Notas:

- **Resuelto en `fix/contrato-ordenes-trabajo` del backend (2026-10-22; mergear junto con esta rama):** cada
  asignación trae `mechanic.user_id` (el frontend ofrece al mecánico cargar solo sus horas) y la recepción trae marca y
  modelo del vehículo.
- Los datos locales no tienen ninguna OT: el presupuesto aprobado B2 (recepción 2) sirve para generar la primera.

## F6 — Facturación y cobros

Rama `feature/f6-facturacion-cobros` (2026-10-22). Lint y build en verde. Verificado con requests HTTP reales al kernel
de Laravel dentro de una transacción revertida, con usuarios cajero, recepcionista y administrador: OT completada
desde el presupuesto B2 → borrador (contado, IVA 10%) y `WORK_ORDER_ALREADY_INVOICED`; edición con opcionales en
`null`; `INVOICE_CUSTOMER_TAX_ID_REQUIRED`, `INVOICE_DUE_DATE_REQUIRED`; línea a IVA 5% con descuento y
`INVOICE_DISCOUNT_EXCEEDS_AMOUNT`; emitir (`001-001-0000001`), `INVOICE_NOT_EDITABLE`; pagos (422 de referencia, banco,
entregado fuera de efectivo y fecha futura; `PAYMENT_EXCEEDS_BALANCE`, vuelto, `INVOICE_ALREADY_PAID`, recibos
`REC-…` solo a crédito y `PAYMENT_WITHOUT_RECEIPT`); resumen de caja; PDF de factura y recibo con nombre del backend;
`INVOICE_HAS_PAYMENTS`, anular pagos y factura, volver a facturar y eliminar el borrador; timbrados
(`INVOICE_STAMP_OVERLAP`, `INVOICE_STAMP_INVALID_PERIOD`, `INVOICE_STAMP_REQUIRED` con dos vigentes y emisión eligiendo
uno); 403 de la recepcionista en facturar y cobros, y del cajero al crear timbrados.

- [x] Timbrados (`/invoice-stamps`): listado con estado (activo y vigente, fuera de vigencia, inactivo); alta y
      edición (vencimiento y activo) solo administrador.
- [x] Facturar la OT completada desde su detalle (borrador con lo realmente usado); la OT muestra su factura vigente.
      Listado (`/invoices`) con filtros por estado y fechas de emisión; detalle (`/invoices/:id`) con datos del cliente,
      condición y vencimiento editables en borrador, líneas (descripción, IVA 0/5/10 y descuento), totales por tasa e
      IVA liquidado del backend; emitir (elige timbrado si hay más de uno vigente), anular con motivo, eliminar el
      borrador.
- [x] Pagos desde la factura emitida (monto propuesto = saldo; referencia salvo efectivo; banco en cheque y
      transferencia; entregado y vuelto en efectivo; fecha entre la emisión y hoy). Cobros (`/payments`) con filtros
      por medio, estado y fechas; detalle del pago con recibo y anulación con motivo.
- [x] Resumen de caja (`/cash-summary`, nuevo ítem del menú con `payments.summary`): total, por medio de pago,
      efectivo recibido y vuelto; sin fechas, el día de hoy.
- [x] PDF de factura y recibo (`DownloadButton`, nuevo componente compartido).
- [x] Revisión visual en el navegador (2026-10-22, Chrome headless con Playwright, administrador, escritorio y móvil):
      facturas, detalle de factura, detalle del pago, cobros, resumen de caja, timbrados y alta, OT con su factura; sin
      errores de consola ni de API. Corrigió el encabezado de página en móvil (en `feature/f8-compras`).

Notas:

- Los importes de factura y pagos se muestran como guaraníes enteros (`formatGuarani`), con IVA incluido. El vuelto
  que se ve al cargar un pago en efectivo es solo una ayuda: el que se guarda lo calcula el backend.
- La recepcionista ve facturas (`invoices.index|show`) pero no pagos: en el detalle no ve el botón de cobro.
- **Deuda técnica pendiente (2026-10-22):** los repuestos agregados en la OT fuera del presupuesto se facturan sin
  aprobación registrada del cliente (backend `docs/handoff.md`, sección 14, #11). La decisión espera a los clientes
  del taller; según cuál sea, puede cambiar la tarjeta de repuestos de la OT y el detalle de la factura.
- **Resuelto en `fix/contrato-cobros` del backend (2026-10-22; mergear junto con esta rama):** el listado de cobros
  trae el nombre del cliente (`customer_name`) además del número de factura.
- Los datos locales no tienen ninguna OT: para probar hay que generar una desde el presupuesto aprobado B2,
  completarla y facturarla. El timbrado `12345678` (001-001) está activo y vigente.

## F7 — Entrega del vehículo

Rama `feature/f7-entregas` (2026-10-22). Lint y build en verde. Verificado con requests HTTP reales al kernel de
Laravel dentro de una transacción revertida (sobre la OT-000001 creada desde la app), enviando la entrega como multipart
igual que el formulario: `DELIVERY_WORK_ORDER_NOT_INVOICED` (sin factura y con borrador), `DELIVERY_INVOICE_NOT_PAID`;
422 de conformidad, km, nombre, firma que no es imagen y combustible; `DELIVERY_MILEAGE_BELOW_RECEPTION`; entrega con
firma (`ENT-000001`, recepción → "Entregado", km del vehículo actualizado) y `DELIVERY_ALREADY_REGISTERED`; listado
por recepción, búsqueda por chapa, detalle y PDF; anulación (recepción → "Terminado") y `DELIVERY_NOT_CANCELLABLE`;
nueva entrega sin firma (`ENT-000002`); 403 del cajero al entregar y de la recepcionista al anular.

- [x] Registrar entrega desde la ficha de la recepción terminada (km final propuesto = el de ingreso, combustible,
      quién retira con los datos del cliente por defecto, conformidad obligatoria, firma en imagen opcional,
      observaciones). La ficha muestra la entrega vigente o la última anulada.
- [x] Listado (`/vehicle-deliveries`) con filtros por estado y fechas; detalle (`/vehicle-deliveries/:id`) con la
      firma y anulación con motivo (administrador).
- [x] PDF del comprobante de entrega.
- [x] Revisión visual en el navegador (2026-10-22, igual que F6): ficha de la recepción entregada, listado y detalle
      de la entrega `ENT-000001` registrada desde la app (sin firma: la imagen de la firma no se vio en pantalla; las
      imágenes subidas se sirven tras el `storage:link`).

Notas:

- **Entorno local (no versionado, 2026-10-22):** el `.env` del backend se había regenerado desde `.env.example`
  (`APP_URL=http://127.0.0.1:8000`, `APP_KEY` vacío) y faltaba `public/storage`: firma y fotos de diagnóstico salían con
  una URL inaccesible y ninguna imagen subida se servía (403). Se corrigió `APP_URL=http://synctaller-backend.test`,
  `php artisan key:generate` y `php artisan storage:link` (requisito anotado en el README).
- **Resuelto en `fix/contrato-entregas` del backend (2026-10-22; mergear junto con esta rama):** el listado de
  entregas trae el nombre del cliente (`client_name`) además de la chapa.

## F8 — Compras y proveedores

Rama `feature/f8-compras` (2026-10-22). Lint y build en verde. Verificado con requests HTTP reales al kernel de Laravel
dentro de una transacción revertida, con depósito, cajero y jefe de taller: borrador con opcionales en `null` (totales
`null` sin líneas), 422 de cabecera, `PURCHASE_WITHOUT_ITEMS`, `INVENTORY_FRACTIONAL_QUANTITY_NOT_ALLOWED`, líneas con
IVA 10%/exenta y edición a 5%; `PURCHASE_DOCUMENT_REQUIRED`, `PURCHASE_DUE_DATE_INVALID`, recibir (stock 10 → 14),
`PURCHASE_NOT_EDITABLE`, `PURCHASE_DUPLICATE_DOCUMENT`; pagos (`SUPPLIER_PAYMENT_DATE_BEFORE_DOCUMENT`,
`SUPPLIER_PAYMENT_EXCEEDS_BALANCE`, parcial), cuentas por pagar (vencido y detalle por proveedor), resumen de egresos;
`PURCHASE_HAS_PAYMENTS`, anular pago y compra (stock 14 → 10), `PURCHASE_NOT_CANCELLABLE`; 403 del cajero al comprar,
del depósito al pagar y anular pagos, y del jefe de taller al recibir y en el resumen.

- [x] Compras (`/purchases`, `/purchases/:id`): listado con filtros por proveedor, estado y fecha de la factura; alta
      del borrador; cabecera (proveedor, factura, timbrado, condición, vencimiento a crédito, notas) y líneas (repuesto,
      cantidad, costo con IVA, tasa) editables en borrador; recibir, anular con motivo, eliminar el borrador. Totales
      por tasa e IVA, y el neto sin IVA que entra al inventario, del backend.
- [x] Pagos a proveedores desde la compra recibida (monto propuesto = saldo, referencia, banco, recibo del proveedor;
      fecha entre la factura y hoy); listado (`/supplier-payments`) con filtros; detalle con anulación.
- [x] Resumen de egresos (`/supplier-payments/summary`, nuevo ítem del menú con `supplier-payments.summary`); la tabla
      por medio de pago se comparte con el resumen de caja (`ByMethodTable`).
- [x] Cuentas por pagar (`/accounts-payable`): saldo total, vencido y por vencer; por proveedor, desplegable con sus
      compras (días de atraso).
- [x] Revisión visual en el navegador (2026-10-22, Chrome headless con Playwright, administrador): flujo completo desde
      la UI sobre la base local (alta, línea, recibir sin factura → error, datos de la factura, recibir, pago parcial,
      cuentas por pagar, resumen, anular con pagos → error, anular pago y compra; escritorio y móvil). Quedó la compra
      `COM-000006` anulada con su pago `PAG-000001` anulado; el stock volvió a su valor.

Notas:

- Al editar una línea, `PurchaseItemResource.part` no trae la unidad del repuesto: el campo cantidad admite decimales y
  el backend rechaza fracciones en repuestos por unidad (`INVENTORY_FRACTIONAL_QUANTITY_NOT_ALLOWED`).
- El cajero y el jefe de taller no listan proveedores (`suppliers.index`): el filtro por proveedor del listado de
  compras solo aparece para quien puede.

## Ajustes de reglas: recepción, diagnóstico y presupuestos (2026-10-22)

Rama `fix/reglas-cierre-recepcion` (junto con `fix/reglas-recepcion-diagnostico-presupuesto` del backend; decisiones
del usuario tras probar F3/F4):

- [x] Recepción entregada o cancelada: sin "Editar" ni acciones sobre fotos (`RECEPTION_CLOSED`); sus diagnósticos y
      presupuestos tampoco se modifican (el presupuesto solo se puede cancelar).
- [x] Diagnóstico terminado o cancelado: sin agregar, editar ni eliminar ítems ni fotos (`DIAGNOSTIC_NOT_EDITABLE`); se
      edita el diagnóstico y, vuelto a "en proceso", se corrigen.
- [x] Enviar un presupuesto exige los diagnósticos de la recepción terminados o cancelados
      (`BUDGET_DIAGNOSTICS_PENDING`; la confirmación lo avisa). Cancelar la recepción cancela sus presupuestos en borrador
      o enviados.
- [x] Listado de diagnósticos ordenado por fecha de diagnóstico (backend).

## Ajustes de reglas: datos maestros en uso (2026-10-22)

Rama `fix/bajas-en-uso` (junto con `fix/bajas-en-uso` del backend; decisiones del usuario):

- [x] Mecánico con trabajos, vehículo con recepciones e ítem de checklist usado no se eliminan (`MECHANIC_IN_USE`,
      `VEHICLE_IN_USE`, `CHECKLIST_ITEM_IN_USE`): los diálogos de baja lo avisan y el backend responde con el mensaje.
- [x] Ítems de checklist con estado activo / inactivo (columna, filtro y switch en el formulario); los inactivos no se
      piden en las recepciones nuevas.
- [x] Servicio usado en presupuestos: el nombre queda fijo (`SERVICE_NAME_NOT_EDITABLE`, aviso en el formulario); no se
      elimina si lo usa un plan de mantenimiento.

## F9 — Historial y mantenimiento preventivo

Rama `feature/f9-mantenimiento` (2026-10-22). Lint y build en verde. Verificado con requests HTTP reales al kernel de
Laravel dentro de una transacción revertida, con mecánico, recepcionista, jefe de taller, cajero y administrador:
historial (resumen y línea de tiempo; `economics` solo con `work-orders.view-economics`), repuestos usados (costos solo
con ese permiso) y kilometraje; mantenimientos del vehículo; registro manual (422 de fecha, `MAINTENANCE_DONE_OUT_OF_ORDER`,
`MAINTENANCE_MILEAGE_BELOW_LAST`, `MAINTENANCE_PLAN_INACTIVE`); intervalos propios y vuelta a los del plan; alertas con
contadores (filtro inválido → 422); planes (422 sin intervalos, nombre repetido o servicio eliminado,
`MAINTENANCE_INTERVAL_REQUIRED`, `MAINTENANCE_PLAN_IN_USE`); 403 del mecánico al registrar y en alertas, de la recepcionista
al configurar y crear planes, y del cajero en mantenimientos.

- [x] Ficha del vehículo (`/vehicles/:id`, con `vehicle-history.view`; desde el listado de vehículos, la ficha del
      cliente y la recepción): resumen (visitas, último ingreso, km, facturado y saldo; resultado sin IVA con
      `work-orders.view-economics`) y pestañas Historial (una tarjeta por recepción con diagnósticos, presupuestos, OT
      con trabajos, repuestos y factura, y entrega), Repuestos usados y Kilometraje (lecturas que bajan, marcadas).
- [x] Planes de mantenimiento (`/maintenance-plans`): listado con búsqueda y estado; alta, edición y baja
      (administrador). Al editar, el servicio se manda solo si cambió (el backend rechaza uno eliminado aunque ya fuera
      el del plan).
- [x] Pestaña Mantenimiento de la ficha (`vehicle-maintenances.index`): km actual (estimado con el promedio), estado por
      plan, último y próximo vencimiento con lo que falta; registrar (`.record`) e intervalos propios (`.configure`).
- [x] Alertas (`/maintenance/alerts`): contadores vencidos y por vencer (filtran), listado con cliente y teléfono.
- [x] Revisión visual en el navegador (2026-10-22, Chrome headless con Playwright, administrador, escritorio y móvil),
      sobre la BBB222: quedaron registrados la rotación de neumáticos (23/09, 85.000 km, al día) y el cambio de aceite
      (06/04, 85.500 km, vencido por fecha), que aparece en las alertas.

Notas:

- `services/api.ts` suma `getWithMeta` para respuestas con `meta` además de la paginación (historial, alertas).
- **Resuelto en `fix/mecanicos-eliminados` del backend (2026-10-22; mergear junto con esta rama):**
  `WorkOrder::mechanic()` y `Diagnostic::mechanic()` no incluían mecánicos eliminados y la OT y el historial perdían el
  nombre del responsable (pasaba con la OT-000001 en los datos locales); ahora usan `withTrashed()`.
- La revisión visual encontró un request que falló como CORS: corrió sin el `.env` del backend (Apache multihilo de
  Laragon; backend `docs/handoff.md`, sección 14, #12). Se corrigió el valor por defecto de la conexión
  (`framework_base` → `mysql`, en `fix/conexion-por-defecto` del backend); la causa de entorno sigue abierta.

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
