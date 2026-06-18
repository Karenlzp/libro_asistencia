// src/layouts/DashboardLayout.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
  profesor: [{ to: '/profesor', label: 'Inicio', icon: HomeIcon }],
  alumno: [{ to: '/alumno', label: 'Inicio', icon: HomeIcon }],
  pie: [{ to: '/pie/dashboard', label: 'PIE', icon: PuzzleIcon }],
}

export default function DashboardLayout({ profile, children }) {
  const navigate = useNavigate()

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
              Cerrar sesión
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
        </header>

        <main className={contentClass}>{children}</main>
      </div>
    </div>
  )
}

