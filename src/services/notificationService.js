const NOTIFICATIONS_KEY = 'internal_notifications'
const LOCAL_LIMIT = 200

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readNotifications() {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeNotifications(notifications) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, LOCAL_LIMIT)))
    window.dispatchEvent(new Event('internalNotificationsChanged'))
  } catch {
    // ignore write errors
  }
}

function buildNotification(notification) {
  const now = new Date().toISOString()
  return {
    id: notification.id ?? `internal-${now}-${Math.random().toString(36).slice(2, 10)}`,
    created_at: notification.created_at ?? now,
    title: notification.title ?? 'Notificación interna',
    message: notification.message ?? '',
    entity: notification.entity ?? null,
    entity_id: notification.entityId ?? null,
    source: notification.source ?? 'pie',
    target_roles: notification.targetRoles ?? ['profesor'],
    read: notification.read ?? false,
    metadata: notification.metadata ?? null,
  }
}

export function getNotifications() {
  return readNotifications().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export function addNotification(notification) {
  const notifications = readNotifications()
  const entry = buildNotification({ ...notification, read: false })
  notifications.unshift(entry)
  writeNotifications(notifications)
  return entry
}

export function markAllNotificationsRead() {
  const notifications = readNotifications().map((n) => ({ ...n, read: true }))
  writeNotifications(notifications)
  return notifications
}

export function subscribeNotifications(callback) {
  if (!isBrowser()) return () => {}

  const storageHandler = (event) => {
    if (event.key === NOTIFICATIONS_KEY) callback(getNotifications())
  }
  const internalHandler = () => callback(getNotifications())

  window.addEventListener('storage', storageHandler)
  window.addEventListener('internalNotificationsChanged', internalHandler)

  return () => {
    window.removeEventListener('storage', storageHandler)
    window.removeEventListener('internalNotificationsChanged', internalHandler)
  }
}
