import type { ComponentType } from 'react'
import {
  IconAddressBook,
  IconAlertTriangle,
  IconBox,
  IconBuildingBank,
  IconBuildingWarehouse,
  IconCalendarStats,
  IconCar,
  IconCash,
  IconCategory,
  IconClipboardList,
  IconCoin,
  IconFileInvoice,
  IconFileText,
  IconHistory,
  IconHome,
  IconListCheck,
  IconListDetails,
  IconMail,
  IconReceipt,
  IconReportAnalytics,
  IconReportMoney,
  IconSettings,
  IconShieldCheck,
  IconShieldExclamation,
  IconShieldLock,
  IconShoppingCart,
  IconStethoscope,
  IconTool,
  IconTruck,
  IconTruckDelivery,
  IconUserCog,
  IconUsers,
  IconWallet,
  type IconProps,
} from '@tabler/icons-react'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<IconProps>
  /** Permiso del listado en el backend; con una lista alcanza con uno. Sin permiso: visible para todos. */
  permission?: string | string[]
  /** Fase del plan (docs/plan-desarrollo.md) en la que se construye la pantalla. */
  phase?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    items: [{ label: 'Inicio', to: '/', icon: IconHome }],
  },
  {
    title: 'Taller',
    items: [
      { label: 'Recepciones', to: '/receptions', icon: IconClipboardList, permission: 'receptions.index', phase: 'F3' },
      { label: 'Diagnósticos', to: '/diagnostics', icon: IconStethoscope, permission: 'diagnostics.index', phase: 'F3' },
      { label: 'Presupuestos', to: '/budgets', icon: IconFileText, permission: 'budgets.index', phase: 'F4' },
      { label: 'Órdenes de trabajo', to: '/work-orders', icon: IconTool, permission: 'work-orders.index', phase: 'F5' },
      { label: 'Siniestros', to: '/claims', icon: IconShieldCheck, permission: 'claims.index', phase: 'FA1' },
      { label: 'Excepciones internas', to: '/internal-exceptions', icon: IconShieldExclamation, permission: 'internal-exceptions.index', phase: 'FA2' },
      { label: 'Entregas', to: '/vehicle-deliveries', icon: IconTruckDelivery, permission: 'vehicle-deliveries.index', phase: 'F7' },
      { label: 'Alertas de mantenimiento', to: '/maintenance/alerts', icon: IconAlertTriangle, permission: 'maintenance-alerts.index', phase: 'F9' },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { label: 'Clientes', to: '/clients', icon: IconAddressBook, permission: 'clients.index', phase: 'F1' },
      { label: 'Vehículos', to: '/vehicles', icon: IconCar, permission: 'vehicles.index', phase: 'F1' },
      { label: 'Aseguradoras', to: '/insurers', icon: IconBuildingBank, permission: 'insurers.index', phase: 'FA1' },
      { label: 'Avisos a clientes', to: '/client-notifications', icon: IconMail, permission: 'client-notifications.index', phase: 'F13' },
    ],
  },
  {
    title: 'Inventario',
    items: [
      { label: 'Repuestos', to: '/parts', icon: IconBox, permission: 'parts.index', phase: 'F2' },
      { label: 'Stock y movimientos', to: '/inventory', icon: IconBuildingWarehouse, permission: 'inventory.index', phase: 'F2' },
      { label: 'Proveedores', to: '/suppliers', icon: IconTruck, permission: 'suppliers.index', phase: 'F2' },
      { label: 'Compras', to: '/purchases', icon: IconShoppingCart, permission: 'purchases.index', phase: 'F8' },
    ],
  },
  {
    title: 'Caja',
    items: [
      { label: 'Facturas', to: '/invoices', icon: IconFileInvoice, permission: 'invoices.index', phase: 'F6' },
      { label: 'Cobros', to: '/payments', icon: IconCash, permission: 'payments.index', phase: 'F6' },
      { label: 'Resumen de caja', to: '/cash-summary', icon: IconReportMoney, permission: 'payments.summary', phase: 'F6' },
      { label: 'Pagos a proveedores', to: '/supplier-payments', icon: IconWallet, permission: 'supplier-payments.index', phase: 'F8' },
      { label: 'Resumen de egresos', to: '/supplier-payments/summary', icon: IconReportMoney, permission: 'supplier-payments.summary', phase: 'F8' },
      { label: 'Cuentas por pagar', to: '/accounts-payable', icon: IconReceipt, permission: 'accounts-payable.view', phase: 'F8' },
    ],
  },
  {
    title: 'Reportes',
    items: [
      {
        label: 'Reportes',
        to: '/reports',
        icon: IconReportAnalytics,
        permission: [
          'reports.sales',
          'reports.budgets',
          'reports.profitability',
          'reports.productivity',
          'reports.inventory',
          'reports.clients',
          'reports.receivables',
          'reports.claims',
        ],
        phase: 'F11',
      },
      { label: 'Comisiones', to: '/commissions', icon: IconCoin, permission: 'mechanic-commissions.index', phase: 'F10' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Mecánicos', to: '/mechanics', icon: IconUserCog, permission: 'mechanics.index', phase: 'F1' },
      { label: 'Servicios', to: '/services', icon: IconTool, permission: 'services.index', phase: 'F1' },
      { label: 'Marcas y modelos', to: '/brands', icon: IconCar, permission: ['brands.index', 'vehicle_models.index'], phase: 'F1' },
      { label: 'Ítems de checklist', to: '/checklists', icon: IconListCheck, permission: 'checklists.index', phase: 'F1' },
      {
        label: 'Ítems de diagnóstico',
        to: '/diagnostic-item-templates',
        icon: IconListDetails,
        permission: 'diagnostic-item-templates.index',
      },
      { label: 'Categorías de repuestos', to: '/part-categories', icon: IconCategory, permission: 'part-categories.index', phase: 'F2' },
      { label: 'Planes de mantenimiento', to: '/maintenance-plans', icon: IconCalendarStats, permission: 'maintenance-plans.index', phase: 'F9' },
      { label: 'Timbrados', to: '/invoice-stamps', icon: IconReceipt, permission: 'invoice-stamps.index', phase: 'F6' },
      { label: 'Usuarios', to: '/users', icon: IconUsers, permission: 'users.index', phase: 'F12' },
      { label: 'Roles', to: '/roles', icon: IconShieldLock, permission: 'roles.index', phase: 'F12' },
      { label: 'Auditoría', to: '/audit-logs', icon: IconHistory, permission: 'audit-logs.index', phase: 'F14' },
      { label: 'Configuración del sistema', to: '/system-settings', icon: IconSettings, permission: 'system-settings.update' },
    ],
  },
]

/** Secciones con solo los ítems que el usuario puede ver; las vacías se omiten. */
export function visibleNavigation(can: (permission: string | string[]) => boolean): NavSection[] {
  return navigation
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.permission || can(item.permission)) }))
    .filter((section) => section.items.length > 0)
}
