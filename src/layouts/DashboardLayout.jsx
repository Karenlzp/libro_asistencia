    // src/layouts/DashboardLayout.jsx
    import { NavLink } from 'react-router-dom'
    import { supabase } from '../supabaseClient'

    const NAV = {
    admin:    [{ to: '/admin',    label: '🏠 Inicio' }],
    profesor: [{ to: '/profesor', label: '🏠 Inicio' }],
    alumno:   [{ to: '/alumno',   label: '🏠 Inicio' }],
    }

    export default function DashboardLayout({ profile, children }) {
    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const links = NAV[profile?.rol] ?? []

    return (
        <div className="platform-shell">
        <aside className="platform-sidebar">
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
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                {link.label}
                </NavLink>
            ))}
            </nav>

            <div className="sidebar-footer">
            <div className="profile-summary">
                <div>{profile?.nombre}</div>
                <small>{profile?.rol}</small>
            </div>
            <button className="button secondary" onClick={handleSignOut}>
                Cerrar sesión
            </button>
            </div>
        </aside>

        <div className="platform-main">
            <header className="platform-topbar">
            <div>
                <h1>
                {{ admin: 'Panel Admin', profesor: 'Panel Profesor', alumno: 'Panel Alumno' }[profile?.rol]}
                </h1>
                <p>Bienvenido, {profile?.nombre}.</p>
            </div>
            </header>

            <main className="platform-content">
            {children}
            </main>
        </div>
        </div>
    )
    }
