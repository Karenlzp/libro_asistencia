import { supabase } from '../supabaseClient'

const AUDIT_TABLE = 'audit_logs'
const LOCAL_AUDIT_KEY = 'plataforma_escolar_audit_logs'
const LOCAL_AUDIT_LIMIT = 500

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeJson(value) {
  if (value == null) return null
  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function normalizeActor(actor) {
  return {
    actor_id: actor?.id ?? null,
    actor_name: actor?.nombre ?? actor?.name ?? 'Sistema',
    actor_role: actor?.rol ?? actor?.role ?? 'sistema',
  }
}

function readLocalAuditLogs() {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(LOCAL_AUDIT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalAuditLogs(logs) {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, LOCAL_AUDIT_LIMIT)))
  } catch {
    // Ignora errores de almacenamiento local para no romper el flujo principal.
  }
}

function buildPayload(entry) {
  const actor = normalizeActor(entry.actor)

  return {
    id: entry.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    created_at: entry.created_at ?? new Date().toISOString(),
    actor_id: actor.actor_id,
    actor_name: actor.actor_name,
    actor_role: actor.actor_role,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    field_name: entry.fieldName ?? null,
    old_value: safeJson(entry.oldValue),
    new_value: safeJson(entry.newValue),
    metadata: entry.metadata ?? null,
    source: entry.source ?? 'app',
    storage_mode: entry.storage_mode ?? 'supabase',
  }
}

function saveLocalFallback(payload, reason) {
  const logs = readLocalAuditLogs()
  const entry = {
    ...payload,
    storage_mode: 'local',
    fallback_reason: reason ?? 'Auditoria remota no disponible',
  }

  logs.unshift(entry)
  writeLocalAuditLogs(logs)

  return entry
}

export async function writeAuditLog(entry) {
  const payload = buildPayload(entry)

  try {
    const { data, error } = await supabase
      .from(AUDIT_TABLE)
      .insert({
        actor_id: payload.actor_id,
        actor_name: payload.actor_name,
        actor_role: payload.actor_role,
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entity_id,
        field_name: payload.field_name,
        old_value: payload.old_value,
        new_value: payload.new_value,
        metadata: payload.metadata,
        source: payload.source,
      })
      .select('id, created_at')
      .single()

    if (error) {
      return {
        data: saveLocalFallback(payload, error.message),
        error: null,
        storage: 'local',
      }
    }

    return {
      data: {
        ...payload,
        id: data?.id ?? payload.id,
        created_at: data?.created_at ?? payload.created_at,
        storage_mode: 'supabase',
      },
      error: null,
      storage: 'supabase',
    }
  } catch (error) {
    return {
      data: saveLocalFallback(payload, error.message),
      error: null,
      storage: 'local',
    }
  }
}

export async function getAuditLogs({ limit = 200 } = {}) {
  const localLogs = readLocalAuditLogs()

  try {
    const { data, error } = await supabase
      .from(AUDIT_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return {
        data: localLogs.slice(0, limit),
        error: null,
        storage: 'local',
        warning: error.message,
      }
    }

    const remoteLogs = (data ?? []).map((item) => ({
      ...item,
      storage_mode: 'supabase',
    }))

    const merged = [...remoteLogs, ...localLogs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)

    return {
      data: merged,
      error: null,
      storage: localLogs.length ? 'mixed' : 'supabase',
      warning: null,
    }
  } catch (error) {
    return {
      data: localLogs.slice(0, limit),
      error: null,
      storage: 'local',
      warning: error.message,
    }
  }
}

export function downloadAuditCsv(logs) {
  const rows = logs.map((log) => ({
    fecha: new Date(log.created_at).toLocaleString('es-CL'),
    usuario: log.actor_name ?? 'Sistema',
    rol: log.actor_role ?? 'sistema',
    accion: log.action ?? '',
    modulo: log.entity ?? '',
    campo: log.field_name ?? '',
    valor_anterior: log.old_value ?? '',
    valor_nuevo: log.new_value ?? '',
    origen: log.storage_mode ?? 'supabase',
  }))

  downloadCsv('auditoria.csv', rows)
}

export async function downloadAuditExcel(logs) {
  const rows = logs.map((log) => ({
    Fecha: new Date(log.created_at).toLocaleString('es-CL'),
    Usuario: log.actor_name ?? 'Sistema',
    Rol: log.actor_role ?? 'sistema',
    Acción: log.action ?? '',
    Módulo: log.entity ?? '',
    Campo: log.field_name ?? '',
    'Valor anterior': log.old_value ?? '',
    'Valor nuevo': log.new_value ?? '',
    Origen: log.storage_mode ?? 'supabase',
  }))

  await downloadExcel('auditoria.xlsx', rows, { sheetName: 'Auditoria' })
}

export function downloadCsv(filename, rows) {
  if (!isBrowser() || !rows?.length) return

  const headers = Object.keys(rows[0])
  const delimiter = ';'
  const csvLines = [
    headers.join(delimiter),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? ''
          const escaped = String(value).replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(delimiter)
    ),
  ]

  const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function downloadExcel(filename, rows, { sheetName = 'Hoja1' } = {}) {
  if (!isBrowser() || !rows?.length) return

  const { default: ExcelJS } = await import('exceljs')
  const headers = Object.keys(rows[0])
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(
      Math.max(
        header.length + 4,
        ...rows.map((row) => String(row[header] ?? '').length + 2)
      ),
      42
    ),
  }))

  rows.forEach((row) => {
    worksheet.addRow(row)
  })

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FF1A202C' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF6' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.border = {
    bottom: { style: 'thin', color: { argb: 'FFB8C2CC' } },
  }

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.height = rowNumber === 1 ? 20 : 18

    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
