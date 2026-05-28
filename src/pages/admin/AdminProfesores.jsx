import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'

const StatusBadge = ({ activo }) => {
  const isActive = activo === true
  return (
    <span className={`badge ${isActive ? 'positiva' : 'negativa'}`}>
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  )
}

export default function AdminProfesores({ profile }) {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [query, setQuery] = useState('')
  const [profesores, setProfesores] = useState([])

  const [tab, setTab] = useState('activos')

  // cargar profesores (solo activos/inactivos según tab)
  useEffect(() => {
    if (!profile?.id) return

    ;(async () => {
      setLoading(true)
      setStatus(null)
      const activo = tab === 'activos'

      // Usamos la tabla usuarios para no tocar backend adicional.
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          rol,
          activo,
          created_at,
          profesor_asignatura ( 
            curso_id,
            asignatura_id
          )
        `)
        .eq('rol', 'profesor')
        .eq('activo', activo)
        .order('nombre')

      if (error) {
        setStatus({ type: 'error', msg: error.message })
        setProfesores([])
      } else {
        setProfesores(data ?? [])
      }
      setLoading(false)
    })()
  }, [profile?.id, tab])

  const profesoresFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profesores
    return profesores.filter(p => (p.nombre ?? '').toLowerCase().includes(q))
  }, [profesores, query])

  const getCursosCount = (p) => {
    const rows = p.profesor_asignatura ?? []
    const set = new Set(rows.map(r => r.curso_id).filter(Boolean))
    return set.size
  }

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando profesores...
      </div>
    )
  }

  return (
    <div>
      <div className="grid-2 section" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Gestión de Profesores</div>
              <div className="card-subtitle">Listado profesional con estado y cursos asignados</div>
            </div>
            <div>
              <span className="badge default">{profesoresFiltrados.length} resultados</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <input
              className="form-input"
              placeholder="Buscar profesor por nombre..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ maxWidth: 320 }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={`button ${tab === 'activos' ? 'primary' : 'ghost'}`}
                onClick={() => setTab('activos')}
              >
                Activos
              </button>
              <button
                className={`button ${tab === 'inactivos' ? 'primary' : 'ghost'}`}
                onClick={() => setTab('inactivos')}
              >
                Inactivos
              </button>
            </div>
          </div>

          {status && <div className={`alert ${status.type}`}>{status.msg}</div>}

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Profesor</th>
                  <th>Estado</th>
                  <th>Cursos</th>
                  <th>Registrado</th>
                  <th style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {profesoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: 30 }}>
                        <div className="empty-state-icon">🧑‍🏫</div>
                        <p>No hay profesores para mostrar.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  profesoresFiltrados.map(p => {
                    const cursosCount = getCursosCount(p)
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.nombre}</strong>
                        </td>
                        <td>
                          <StatusBadge activo={p.activo} />
                        </td>
                        <td>
                          <span className="badge blue">{cursosCount}</span>
                        </td>
                        <td style={{ color: 'var(--gray-500)', fontSize: '.78rem' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CL') : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="button ghost"
                            style={{ fontSize: '.75rem', padding: '4px 10px' }}
                            onClick={() => {
                              // UI-only: el backend de "perfil" puede existir o no.
                              // Por ahora abrimos un modal futuro o un alert.
                              alert(`Perfil de ${p.nombre} (pendiente de vista detallada).`)
                            }}
                          >
                            Ver perfil
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Vista rápida</div>
              <div className="card-subtitle">Estilo panel institucional</div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 14 }}>
            <div className="stat-card" style={{ padding: 16 }}>
              <div className="stat-icon lime">👨‍🏫</div>
              <div>
                <div className="stat-value">{profesoresFiltrados.length}</div>
                <div className="stat-label">Profesores ({tab})</div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: 16 }}>
              <div className="stat-icon blue">📚</div>
              <div>
                <div className="stat-value">{profesoresFiltrados.reduce((acc, p) => acc + getCursosCount(p), 0)}</div>
                <div className="stat-label">Total cursos (aprox.)</div>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="section-title">Sugerencias de expansión</div>
            <ul style={{ marginLeft: 18, color: 'var(--gray-600)', fontSize: '.84rem' }}>
              <li>Agregar panel de perfil detallado</li>
              <li>Mostrar asignaturas por profesor</li>
              <li>Acciones: deshabilitar/reactivar (si ya existen en UI)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

