// src/layouts/DashboardLayout.jsx
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getNotifications, markAllNotificationsRead, subscribeNotifications } from '../services/notificationService'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 4 9.8v9.2c0 .55.45 1 1 1h4.75a.75.75 0 0 0 .75-.75V14h3v5.25c0 .41.34.75.75.75H19c.55 0 1-.45 1-1V9.8l-8-6.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11Zm6 1.5a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM3.75 18.25a4.75 4.75 0 0 1 9.5 0V19H3.75v-.75Zm10.5.75v-.5a5.7 5.7 0 0 0-1.1-3.36A4.23 4.23 0 0 1 20.25 18.5V19h-6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.86 3.49a2.1 2.1 0 0 1 2.97 2.97l-9.6 9.6a3 3 0 0 1-1.33.77l-3.4.97a.75.75 0 0 1-.93-.93l.97-3.4a3 3 0 0 1 .77-1.33l9.55-9.65Zm-9.08 9.65-.45.45a1.5 1.5 0 0 0-.38.65l-.53 1.85 1.85-.53a1.5 1.5 0 0 0 .65-.38l.45-.45-1.59-1.59Zm2.65.53 8.34-8.33a.6.6 0 0 0-.85-.85l-8.34 8.33 1.59 1.59Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3.75a.75.75 0 0 1 .75.75v1.5h10.5V4.5a.75.75 0 0 1 1.5 0v1.5h.75A2.75 2.75 0 0 1 22 8.75v11.5A2.75 2.75 0 0 1 19.25 23H4.75A2.75 2.75 0 0 1 2 20.25V8.75A2.75 2.75 0 0 1 4.75 6H5V4.5a.75.75 0 0 1 .75-.75ZM4.5 8.75c0-.14.11-.25.25-.25h14.5c.14 0 .25.11.25.25v4.5H4.5v-4.5Zm0 6.5h15v5.0c0 .14-.11.25-.25.25H4.75a.25.25 0 0 1-.25-.25v-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PuzzleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 3a2.5 2.5 0 0 1 2.45 2H14a2 2 0 0 1 2 2v1.8a2.2 2.2 0 1 1 0 4.4V15a2 2 0 0 1-2 2h-1.8a2.2 2.2 0 1 1-4.4 0H6a2 2 0 0 1-2-2v-3.05a2.5 2.5 0 1 1 0-4.9V7a2 2 0 0 1 2-2h1.05A2.5 2.5 0 0 1 9.5 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.75 4A2.75 2.75 0 0 0 8 6.75v2.5a.75.75 0 0 0 1.5 0v-2.5c0-.69.56-1.25 1.25-1.25h5.5c.69 0 1.25.56 1.25 1.25v10.5c0 .69-.56 1.25-1.25 1.25h-5.5c-.69 0-1.25-.56-1.25-1.25v-2.5a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 10.75 20h5.5A2.75 2.75 0 0 0 19 17.25V6.75A2.75 2.75 0 0 0 16.25 4h-5.5Zm-6 8a.75.75 0 0 0 .75.75h7.69l-1.97 1.97a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06l-3.25-3.25a.75.75 0 0 0-1.06 1.06l1.97 1.97H5.5a.75.75 0 0 0-.75.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

const NAV = {
  admin: [
    { to: '/admin', label: 'Inicio', icon: HomeIcon },
    { to: '/admin/profesores', label: 'Profesores', icon: UsersIcon },
  ],
  profesor: [
    { to: '/profesor', label: 'Inicio', icon: HomeIcon },
    { to: '/profesor/horario', label: 'Horario', icon: CalendarIcon },
    { to: '/profesor/nueva-evaluacion', label: 'Nueva evaluacion', icon: PencilIcon },
  ],
  alumno: [{ to: '/alumno', label: 'Inicio', icon: HomeIcon }],
  pie: [{ to: '/pie/dashboard', label: 'PIE', icon: PuzzleIcon }],
}

export default function DashboardLayout({ profile, children }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    if (profile?.rol !== 'profesor') return undefined
    setNotifications(getNotifications())
    const unsubscribe = subscribeNotifications(setNotifications)
    return unsubscribe
  }, [profile?.rol])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleToggleNotifications = () => {
    if (!notificationsOpen && unreadCount > 0) {
      markAllNotificationsRead()
      setNotifications(getNotifications())
    }
    setNotificationsOpen((prev) => !prev)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // Asegura que React Router haga la navegación con sesión ya invalidada.
    navigate('/login', { replace: true })
  }

  const links = NAV[profile?.rol] ?? []
  const shellClass = profile?.rol === 'admin' ? 'platform-shell admin-layout' : 'platform-shell'
  const sidebarClass = profile?.rol === 'admin' ? 'platform-sidebar admin-sidebar' : 'platform-sidebar'
  const topbarClass = profile?.rol === 'admin' ? 'platform-topbar admin-topbar' : 'platform-topbar'
  const contentClass = profile?.rol === 'admin' ? 'platform-content admin-content' : 'platform-content'

  return (
    <div className={shellClass}>
      <aside className={sidebarClass}>
        <div className="brand-block">
          <div className="brand-logo">📚</div>
          <div>
            <strong>Plataforma Escolar</strong>
            <p>Gestión académica</p>
          </div>
        </div>

        <nav className="platform-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin' || link.to === '/profesor' || link.to === '/alumno'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.icon && (
                <span className="nav-link-icon">
                  <link.icon />
                </span>
              )}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-summary">
            <div>{profile?.nombre}</div>
            <small>{profile?.rol}</small>
          </div>
          {profile?.rol === 'admin' ? (
            <button className="sidebar-signout" onClick={handleSignOut} aria-label="Cerrar sesion" title="Cerrar sesion">
              <LogoutIcon />
            </button>
          ) : (
            <button className="button secondary" onClick={handleSignOut}>
              Cerrar sesion
            </button>
          )}
        </div>
      </aside>

      <div className="platform-main">
        <header className={topbarClass}>
          <div>
            <h1>
              {{ admin: 'Panel Admin', profesor: 'Panel Profesor', alumno: 'Panel Alumno' }[profile?.rol]}
            </h1>
            <p>Bienvenido, {profile?.nombre}.</p>
          </div>
          {profile?.rol === 'profesor' && (
            <div className="notification-shell">
              <button className="notification-bell" onClick={handleToggleNotifications} aria-label="Notificaciones">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
                  <path
                    d="M12 22a2.25 2.25 0 0 0 2.25-2.25h-4.5A2.25 2.25 0 0 0 12 22Zm6.75-6V11c0-3.31-2.15-6.1-5.25-6.82V3.5a1.5 1.5 0 0 0-3 0v.68C7.4 4.9 5.25 7.69 5.25 11v5l-1.5 1.5v.75h15v-.75L18.75 16Z"
                    fill="currentColor"
                  />
                </svg>
                {unreadCount > 0 && <span className="notification-bell-dot" />}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div className="notification-popover-header">Notificaciones PIE</div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">No hay notificaciones.</div>
                  ) : (
                    <div className="notification-list">
                      {notifications.slice(0, 6).map((notification) => (
                        <div key={notification.id} className="notification-item">
                          <div className="notification-item-title">{notification.title}</div>
                          <div className="notification-item-message">{notification.message}</div>
                          <div className="notification-item-time">{new Date(notification.created_at).toLocaleString('es-CL')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        <main className={contentClass}>{children}</main>
      </div>
    </div>
  )
}

