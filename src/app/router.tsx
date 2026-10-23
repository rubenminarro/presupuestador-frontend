import type { ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { navigation } from '@/app/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, RequirePermission } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { BrandsPage } from '@/features/brands/BrandsPage'
import { BudgetDetailPage } from '@/features/budgets/BudgetDetailPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { ChecklistsPage } from '@/features/checklists/ChecklistsPage'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { CommissionsPage } from '@/features/commissions/CommissionsPage'
import { DeliveriesPage } from '@/features/deliveries/DeliveriesPage'
import { DeliveryDetailPage } from '@/features/deliveries/DeliveryDetailPage'
import { DiagnosticDetailPage } from '@/features/diagnostics/DiagnosticDetailPage'
import { DiagnosticsPage } from '@/features/diagnostics/DiagnosticsPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { InvoiceStampsPage } from '@/features/invoice-stamps/InvoiceStampsPage'
import { InvoiceDetailPage } from '@/features/invoices/InvoiceDetailPage'
import { InvoicesPage } from '@/features/invoices/InvoicesPage'
import { MaintenanceAlertsPage } from '@/features/maintenance/MaintenanceAlertsPage'
import { MaintenancePlansPage } from '@/features/maintenance/MaintenancePlansPage'
import { MechanicsPage } from '@/features/mechanics/MechanicsPage'
import { PartCategoriesPage } from '@/features/parts/PartCategoriesPage'
import { PartDetailPage } from '@/features/parts/PartDetailPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { CashSummaryPage } from '@/features/payments/CashSummaryPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { AccountsPayablePage } from '@/features/purchases/AccountsPayablePage'
import { PurchaseDetailPage } from '@/features/purchases/PurchaseDetailPage'
import { PurchasesPage } from '@/features/purchases/PurchasesPage'
import { SupplierPaymentsPage } from '@/features/supplier-payments/SupplierPaymentsPage'
import { SupplierPaymentsSummaryPage } from '@/features/supplier-payments/SupplierPaymentsSummaryPage'
import { ReceptionDetailPage } from '@/features/receptions/ReceptionDetailPage'
import { ReceptionsPage } from '@/features/receptions/ReceptionsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { ServicesPage } from '@/features/services/ServicesPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { VehicleDetailPage } from '@/features/vehicle-history/VehicleDetailPage'
import { VehiclesPage } from '@/features/vehicles/VehiclesPage'
import { WorkOrderDetailPage } from '@/features/work-orders/WorkOrderDetailPage'
import { WorkOrdersPage } from '@/features/work-orders/WorkOrdersPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFoundPage } from '@/pages/ErrorPages'
import { HomePage } from '@/pages/HomePage'

/** Ruta de un módulo con su permiso de lectura (el backend lo vuelve a validar). */
function guarded(path: string, permission: string | string[], element: ReactNode): RouteObject {
  return { path, element: <RequirePermission permission={permission}>{element}</RequirePermission> }
}

// Módulos construidos (F1 en adelante).
const moduleRoutes: RouteObject[] = [
  guarded('receptions', 'receptions.index', <ReceptionsPage />),
  guarded('receptions/:id', 'receptions.show', <ReceptionDetailPage />),
  guarded('diagnostics', 'diagnostics.index', <DiagnosticsPage />),
  guarded('diagnostics/:id', 'diagnostics.show', <DiagnosticDetailPage />),
  guarded('budgets', 'budgets.index', <BudgetsPage />),
  guarded('budgets/:id', 'budgets.show', <BudgetDetailPage />),
  guarded('work-orders', 'work-orders.index', <WorkOrdersPage />),
  guarded('work-orders/:id', 'work-orders.show', <WorkOrderDetailPage />),
  guarded('vehicle-deliveries', 'vehicle-deliveries.index', <DeliveriesPage />),
  guarded('vehicle-deliveries/:id', 'vehicle-deliveries.show', <DeliveryDetailPage />),
  guarded('invoices', 'invoices.index', <InvoicesPage />),
  guarded('invoices/:id', 'invoices.show', <InvoiceDetailPage />),
  guarded('payments', 'payments.index', <PaymentsPage />),
  guarded('cash-summary', 'payments.summary', <CashSummaryPage />),
  guarded('invoice-stamps', 'invoice-stamps.index', <InvoiceStampsPage />),
  guarded('purchases', 'purchases.index', <PurchasesPage />),
  guarded('purchases/:id', 'purchases.show', <PurchaseDetailPage />),
  guarded('supplier-payments', 'supplier-payments.index', <SupplierPaymentsPage />),
  guarded('supplier-payments/summary', 'supplier-payments.summary', <SupplierPaymentsSummaryPage />),
  guarded('accounts-payable', 'accounts-payable.view', <AccountsPayablePage />),
  guarded('clients', 'clients.index', <ClientsPage />),
  guarded('clients/:id', 'clients.show', <ClientDetailPage />),
  guarded('vehicles', 'vehicles.index', <VehiclesPage />),
  guarded('vehicles/:id', 'vehicle-history.view', <VehicleDetailPage />),
  guarded('maintenance-plans', 'maintenance-plans.index', <MaintenancePlansPage />),
  guarded('maintenance/alerts', 'maintenance-alerts.index', <MaintenanceAlertsPage />),
  guarded('brands', ['brands.index', 'vehicle_models.index'], <BrandsPage />),
  guarded('checklists', 'checklists.index', <ChecklistsPage />),
  guarded('commissions', 'mechanic-commissions.index', <CommissionsPage />),
  guarded(
    'reports',
    ['reports.sales', 'reports.budgets', 'reports.profitability', 'reports.productivity', 'reports.inventory', 'reports.clients'],
    <ReportsPage />,
  ),
  guarded('services', 'services.index', <ServicesPage />),
  guarded('mechanics', 'mechanics.index', <MechanicsPage />),
  guarded('part-categories', 'part-categories.index', <PartCategoriesPage />),
  guarded('suppliers', 'suppliers.index', <SuppliersPage />),
  guarded('parts', 'parts.index', <PartsPage />),
  guarded('parts/:id', 'parts.show', <PartDetailPage />),
  guarded('inventory', 'inventory.index', <InventoryPage />),
]

const builtPaths = new Set(moduleRoutes.map((route) => route.path))

// Módulos aún no construidos: una pantalla provisoria por ítem del menú, con su permiso.
const pendingModules: RouteObject[] = navigation
  .flatMap((section) => section.items)
  .filter((item) => item.to !== '/' && !builtPaths.has(item.to.slice(1)))
  .map((item) => {
    const page = <ComingSoonPage title={item.label} phase={item.phase} />
    return item.permission ? guarded(item.to.slice(1), item.permission, page) : { path: item.to.slice(1), element: page }
  })

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [{ index: true, element: <HomePage /> }, ...moduleRoutes, ...pendingModules, { path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
])
