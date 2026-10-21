import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconChevronDown, IconLogout } from '@tabler/icons-react'
import { visibleNavigation } from '@/app/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { cx } from '@/lib/cx'
import { roleLabel } from '@/lib/roles'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="page">
      <Sidebar open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} onNavigate={() => setMenuOpen(false)} />
      <div className="page-wrapper">
        <Topbar />
        <Outlet />
      </div>
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}

function Sidebar({ open, onToggle, onNavigate }: SidebarProps) {
  const { can } = useAuth()
  const sections = visibleNavigation(can)

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="sidebar-menu"
          aria-expanded={open}
          aria-label="Abrir menú"
          onClick={onToggle}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="navbar-brand navbar-brand-autodark">
          <Link to="/" className="text-reset text-decoration-none" onClick={onNavigate}>
            SyncTaller
          </Link>
        </div>
        <div className={cx('collapse navbar-collapse', open && 'show')} id="sidebar-menu">
          <ul className="navbar-nav pt-lg-3">
            {sections.map((section, index) => (
              <li key={section.title ?? index} className="nav-item">
                {section.title && (
                  <div className="nav-link text-uppercase text-secondary small fw-bold pb-1 mt-2" aria-hidden="true">
                    {section.title}
                  </div>
                )}
                <ul className="navbar-nav" aria-label={section.title}>
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
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.name
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
  const roles = user.roles.map((role) => roleLabel(role.name)).join(', ')

  return (
    <header className="navbar navbar-expand-md d-print-none">
      <div className="container-xl justify-content-end">
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
            <button type="button" className="dropdown-item" role="menuitem" onClick={() => void logout()}>
              <IconLogout size={16} className="me-2" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
