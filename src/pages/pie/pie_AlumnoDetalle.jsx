import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  createObservacionPie,
  createRetiroPie,
  getAlumnoPieDetail,
  getObservacionesPie,
  getRetirosPie,
  registrarRetornoPie,
} from '../../services/pieService'


function formatCurso(c) {
  if (!c) return '—'
  return `${c.nivel}°${c.letra}`
}

function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CL')
  } catch {
    return iso
  }
}

export default function PieAlumnoDetalle({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const alumnoId = id
  


  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)

  const [alumno, setAlumno] = useState(null)
  const [observaciones, setObservaciones] = useState([])
  const [retiros, setRetiros] = useState([])

  // UI state
  const [tab, setTab] = useState('observaciones')

  const [obsForm, setObsForm] = useState({ observacion: '' })
  const [retiroOpen, setRetiroOpen] = useState(false)
  const [retiroForm, setRetiroForm] = useState({ motivo: '', tipo: 'retiro' })

  const pieEstado = useMemo(() => {
    const act = alumno?.pie === true
    return act ? { label: 'PIE activo', cls: 'positiva' } : { label: 'PIE inactivo', cls: 'negativa' }
  }, [alumno?.pie])

  const notify = (type, msg) => {
    setStatus({ type, msg })
    setTimeout(() => setStatus(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    setStatus(null)

    const [det, obs, ret] = await Promise.all([
      getAlumnoPieDetail(alumnoId),
      getObservacionesPie(alumnoId),
      getRetirosPie(alumnoId),
    ])

    if (det.error) return notify('error', det.error.message)

    setAlumno(det.data)
    setObservaciones(obs.data ?? [])
    setRetiros(ret.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!profile?.id) return
    if (!alumnoId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, alumnoId])

  const handleGuardarObservacion = async (e) => {
    e.preventDefault()
    if (!obsForm.observacion.trim()) return notify('error', 'Escribe una observación.')
    if (!alumno) return

    const { error } = await createObservacionPie({
      alumnoId: alumno.id,
      pieId: profile.id,
      observacion: obsForm.observacion.trim(),
    })

    if (error) return notify('error', error.message)

    setObsForm({ observacion: '' })
    await load()
    notify('success', 'Observación guardada correctamente.')
  }

  const handleCrearRetiro = async (e) => {
    e.preventDefault()
    if (!retiroForm.motivo.trim()) return notify('error', 'Escribe el motivo.')
    if (!alumno) return

    const tieneRetiroActivo = retiros.some((r) => String(r.estado) === 'activo')
    if (tieneRetiroActivo) {
      return notify(
        'error',
        'El alumno ya posee un retiro activo. Debe registrar el retorno antes de crear un nuevo retiro.',
      )
    }

    const cursoId = alumno.curso_id

    const { error } = await createRetiroPie({
      alumnoId: alumno.id,
      cursoId,
      pieId: profile.id,
      motivo: retiroForm.motivo.trim(),
      tipo: retiroForm.tipo,
    })

    if (error) {
      // Mensaje amigable si la restricción única bloquea (por activación concurrente)
      const msg = error.message || ''
      if (msg.includes('unique constraint') || msg.includes('idx_pie_retiro_activo_unico') || msg.includes('duplicate key')) {
        return notify(
          'error',
          'El alumno ya posee un retiro activo. Debe registrar el retorno antes de crear un nuevo retiro.',
        )
      }
      return notify('error', error.message)
    }

    setRetiroOpen(false)
    setRetiroForm({ motivo: '', tipo: 'retiro' })
    await load()
    notify('success', 'Retiro registrado.')
  }

  const handleRegistrarRetorno = async (retiroId) => {
    const { error } = await registrarRetornoPie(retiroId)

    if (error) {
      notify('error', error.message)
      return
    }

    await load()
    notify('success', 'Retorno registrado correctamente.')
  }





  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" /> Cargando detalle PIE...
      </div>
    )
  }

  if (!alumno) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🧩</div>
        <p>No se pudo cargar el alumno PIE.</p>
        <button className="button ghost" onClick={() => navigate('/pie/dashboard')}>← Volver</button>
      </div>
    )
  }

  return (
    <div>
      <div className="card section" style={{ paddingBottom: 18 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="card-title">{alumno.nombre}</div>
            <div className="card-subtitle">Curso: {formatCurso(alumno.cursos)} · Historial PIE</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`badge ${pieEstado.cls}`}>{pieEstado.label}</span>
            <button className="button ghost" onClick={() => navigate('/pie/dashboard')}>← Volver</button>
          </div>
        </div>
      </div>

      {status && <div className={`alert ${status.type}`} style={{ marginBottom: 16 }}>{status.msg}</div>}

      <div className="tab-strip">
        {[
          { key: 'observaciones', label: `Observaciones (${observaciones.length})` },
          { key: 'retiros', label: `Retiros (${retiros.length})` },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'observaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">A) Observaciones PIE</div>
                <div className="card-subtitle">Historial con fecha y contenido</div>
              </div>
            </div>

            {observaciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p>No hay observaciones registradas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {observaciones.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--blue)',
                    }}
                  >
                    <div style={{ fontSize: '.88rem', marginBottom: 8, color: 'var(--gray-900)', whiteSpace: 'pre-wrap' }}>
                      {o.observacion}
                    </div>
                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                      {formatFecha(o.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Agregar observación</div>
                <div className="card-subtitle">Se registra en pie_observaciones</div>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleGuardarObservacion}>
              <div className="form-group full">
                <label className="form-label">Observación</label>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ resize: 'vertical' }}
                  placeholder="Escribe la observación..."
                  value={obsForm.observacion}
                  onChange={(e) => setObsForm({ observacion: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions">
                <button className="button primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'retiros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">B) Retiros de clase</div>
                <div className="card-subtitle">Motivo, estado y fecha</div>
              </div>
              <div>
                {retiros.some((r) => String(r.estado) === 'activo') ? (
                  <>
                    <div className="badge" style={{ background: 'var(--blue)', color: 'white' }}>
                      Alumno actualmente retirado de clases
                    </div>
                  </>
                ) : (
                  <button className="button primary" onClick={() => setRetiroOpen(true)}>
                    Retirar de clase
                  </button>
                )}
              </div>

            </div>

            {retiros.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚪</div>
                <p>No hay retiros registrados.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Fecha Retorno</th>
                      <th>Hora Retorno</th>

                    </tr>
                  </thead>
                  <tbody>
                    {retiros.map((r) => (
                      <tr key={r.id}>
                        <td><span className="badge default">{r.tipo}</span></td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{r.motivo}</td>
                      <td>
                          {String(r.estado) === 'activo' ? (
                            <button
                              className="button primary"
                              style={{ padding: '6px 12px', fontSize: '.78rem' }}
                              onClick={() => handleRegistrarRetorno(r.id)}
                            >
                              Registrar retorno
                            </button>
                          ) : (
                            <span className="badge" style={{ background: 'var(--blue)', color: 'white' }}>
                              Retornado
                            </span>
                          )}

                        </td>

                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.created_at)}</td>
                        <td style={{ color: 'var(--muted)' }}>{formatFecha(r.fecha_retorno)}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.hora_retorno ?? '—'}</td>
                      </tr>

                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {retiroOpen && (
            <div className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Registrar retiro</div>
                  <div className="card-subtitle">Crea un registro en pie_retiros</div>
                </div>
                <button className="button ghost" onClick={() => setRetiroOpen(false)}>✕ Cerrar</button>
              </div>

              <form className="form-grid" onSubmit={handleCrearRetiro}>
                <div className="form-group full">
                  <label className="form-label">Motivo</label>
                  <input
                    className="form-input"
                    placeholder="Describe el motivo del retiro..."
                    value={retiroForm.motivo}
                    onChange={(e) => setRetiroForm((p) => ({ ...p, motivo: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={retiroForm.tipo}
                    onChange={(e) => setRetiroForm((p) => ({ ...p, tipo: e.target.value }))}
                  >
                    <option value="retiro">retiro</option>
                    <option value="apoyo">apoyo</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button className="button primary" type="submit">Guardar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

