import { useCallback, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  IconAdjustments,
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
} from '@tabler/icons-react'
import { visibleNavigation, type NavSection } from '@/app/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { usePreferences } from '@/features/preferences/usePreferences'
import { useBranding } from '@/features/system-settings/useBranding'
import { cx } from '@/lib/cx'
import { roleLabel } from '@/lib/roles'
import { useDismiss } from '@/lib/useDismiss'

/**
 * Estructura de la página según la posición del menú elegida en Preferencias. Sigue el marcado de Tabler 1.7: los
 * atributos `data-bs-*` de `<html>` (tema de la navegación, flotante, fija, plegada) actúan sobre los `.navbar`
 * hijos directos de `.page`.
 *
 * - Lateral: barra lateral con el menú y, dentro de `.page-wrapper`, la barra del usuario (como siempre).
 * - Superior: barra con la marca y el usuario, y debajo la fila del menú con desplegables por sección.
 * - Combinada: barra lateral con el menú y la barra del usuario a nivel de página.
 */
export function AppLayout() {
  const { preferences } = useAuth()
  const position = preferences.navbar_position

  if (position === 'horizontal') {
    return (
      <div className="page">
        <HorizontalNavbar />
        <div className="page-wrapper">
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Sidebar />
      {position === 'combined' && <Topbar />}
      <div className="page-wrapper">
        {position === 'vertical' && <Topbar sticky={preferences.navbar === 'sticky'} />}
        <Outlet />
      </div>
    </div>
  )
}

/** Logo del sistema (si hay) y nombre. En la barra plegada, el nombre se colapsa como los títulos del menú. */
function Brand({ onNavigate, collapsibleName }: { onNavigate?: () => void; collapsibleName?: boolean }) {
  const logoUrl = useBranding()

  return (
    <Link to="/" className="d-inline-flex align-items-center gap-2 text-reset text-decoration-none" onClick={onNavigate}>
      {logoUrl && <img src={logoUrl} alt="" className="navbar-brand-image" />}
      <span className={cx(collapsibleName && 'nav-link-title')}>SyncTaller</span>
    </Link>
  )
}

function Sidebar() {
  const { can } = useAuth()
  const { preferences, update } = usePreferences()
  const [open, setOpen] = useState(false)
  const sections = visibleNavigation(can)
  const folded = preferences.sidebar !== 'default'

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="sidebar-menu"
          aria-expanded={open}
          aria-label="Abrir menú"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="navbar-brand">
          <Brand onNavigate={() => setOpen(false)} collapsibleName />
          {/* Tabler lo muestra solo con la barra expandida (al pasar el mouse); para desplegarla está el botón de la barra superior. */}
          <button
            type="button"
            className="btn btn-icon btn-ghost-secondary d-none d-lg-inline-flex"
            data-bs-toggle="sidebar-folded"
            aria-pressed={folded}
            aria-label={folded ? 'Fijar la barra lateral expandida' : 'Plegar la barra lateral'}
            title={folded ? 'Fijar expandida' : 'Plegar'}
            onClick={() => update({ sidebar: folded ? 'default' : 'folded' })}
          >
            <IconLayoutSidebarLeftCollapse size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={cx('collapse navbar-collapse', open && 'show')} id="sidebar-menu">
          <ul className="navbar-nav pt-lg-3">
            {sections.map((section, index) => (
              <SidebarSection key={section.title ?? index} section={section} onNavigate={() => setOpen(false)} />
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({ section, onNavigate }: { section: NavSection; onNavigate: () => void }) {
  return (
    <>
      {section.title && <li className="nav-section-title">{section.title}</li>}
      {section.items.map((item) => (
        <li key={item.to} className="nav-item">
          <NavLink
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cx('nav-link', isActive && 'active')}
            onClick={onNavigate}
          >
            <span className="nav-link-icon d-md-none d-lg-inline-block">
              <item.icon size={20} stroke={1.75} aria-hidden="true" />
            </span>
            <span className="nav-link-title">{item.label}</span>
          </NavLink>
        </li>
      ))}
    </>
  )
}

/** Barra del usuario (notificaciones y menú de la cuenta). Con la barra lateral plegada, también la despliega. */
function Topbar({ sticky = false }: { sticky?: boolean }) {
  const { preferences, update } = usePreferences()

  return (
    <header className={cx('navbar navbar-expand-md d-print-none', sticky && 'sticky-top')}>
      <div className="container-xl position-relative">
        {preferences.sidebar === 'folded' && (
          <button
            type="button"
            className="btn btn-icon btn-ghost-secondary d-none d-lg-inline-flex"
            aria-label="Expandir la barra lateral"
            title="Expandir la barra lateral"
            onClick={() => update({ sidebar: 'default' })}
          >
            <IconLayoutSidebarLeftExpand size={18} aria-hidden="true" />
          </button>
        )}
        <div className="navbar-nav flex-row ms-auto align-items-center">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function HorizontalNavbar() {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const sections = visibleNavigation(can)

  return (
    <>
      <header className="navbar navbar-expand-md d-print-none">
        <div className="container-xl position-relative">
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="navbar-menu"
            aria-expanded={open}
            aria-label="Abrir menú"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="navbar-brand pe-0 pe-md-3">
            <Brand onNavigate={() => setOpen(false)} />
          </div>
          <div className="navbar-nav flex-row order-md-last align-items-center">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>
      <header className="navbar-expand-md d-print-none">
        <div className={cx('collapse navbar-collapse', open && 'show')} id="navbar-menu">
          <div className="navbar">
            <div className="container-xl">
              <HorizontalMenu sections={sections} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

/** Menú superior: un desplegable por sección (las secciones sin título, como Inicio, van como enlace directo). */
function HorizontalMenu({ sections, onNavigate }: { sections: NavSection[]; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const [openSection, setOpenSection] = useState<string | null>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const close = useCallback(() => setOpenSection(null), [])
  useDismiss(menuRef, openSection !== null, close)

  function navigate() {
    close()
    onNavigate()
  }

  return (
    <ul className="navbar-nav" ref={menuRef}>
      {sections.map((section, index) => {
        if (!section.title) {
          return section.items.map((item) => (
            <li key={item.to} className="nav-item">
              <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => cx('nav-link', isActive && 'active')} onClick={navigate}>
                <span className="nav-link-icon">
                  <item.icon size={20} stroke={1.75} aria-hidden="true" />
                </span>
                <span className="nav-link-title">{item.label}</span>
              </NavLink>
            </li>
          ))
        }

        const isOpen = openSection === section.title
        const active = section.items.some((item) => item.to !== '/' && (pathname === item.to || pathname.startsWith(`${item.to}/`)))
        const SectionIcon = section.items[0].icon
        const menuId = `navbar-section-${index}`

        return (
          <li key={section.title} className={cx('nav-item dropdown', active && 'active')}>
            <button
              type="button"
              className={cx('nav-link dropdown-toggle border-0 bg-transparent', isOpen && 'show')}
              aria-expanded={isOpen}
              aria-controls={menuId}
              onClick={() => setOpenSection(isOpen ? null : section.title!)}
            >
              <span className="nav-link-icon">
                <SectionIcon size={20} stroke={1.75} aria-hidden="true" />
              </span>
              <span className="nav-link-title">{section.title}</span>
            </button>
            {/* data-bs-popper="static": sin el JS de Bootstrap (Popper), es lo que ubica el menú debajo del botón. */}
            <div id={menuId} className={cx('dropdown-menu', isOpen && 'show')} data-bs-popper="static">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => cx('dropdown-item', isActive && 'active')}
                  onClick={navigate}
                >
                  <item.icon size={18} stroke={1.75} className="me-2" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(menuRef, open, close)

  if (!user) return null

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.name
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
  const roles = user.roles.map((role) => roleLabel(role.name)).join(', ')

  return (
    <div className="nav-item dropdown" ref={menuRef}>
      <button
        type="button"
        className="nav-link d-flex lh-1 text-reset p-0 border-0 bg-transparent"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar avatar-sm" aria-hidden="true">
          {initials}
        </span>
        <span className="d-none d-sm-block ps-2 text-start">
          <span className="d-block">{fullName}</span>
          <span className="d-block mt-1 small text-secondary">{roles}</span>
        </span>
        <IconChevronDown size={16} className="ms-1 align-self-center" aria-hidden="true" />
      </button>
      <div className={cx('dropdown-menu dropdown-menu-end dropdown-menu-arrow', open && 'show')} role="menu" style={{ right: 0 }}>
        <span className="dropdown-header">{user.email}</span>
        <Link to="/preferences" className="dropdown-item" role="menuitem" onClick={close}>
          <IconAdjustments size={16} className="me-2" aria-hidden="true" />
          Preferencias
        </Link>
        <div className="dropdown-divider" />
        <button type="button" className="dropdown-item" role="menuitem" onClick={() => void logout()}>
          <IconLogout size={16} className="me-2" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
