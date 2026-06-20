import { supabase } from '../lib/supabase'

const STORAGE_KEY_PREFIX = 'ons-tennis-dashboard-order'
const missingSettingsTableCodes = new Set(['42P01', 'PGRST205'])

export const defaultDashboardWidgetOrder = ['upcomingEvents', 'members', 'ranking', 'calendar']

const getStorageKey = (memberId) => `${STORAGE_KEY_PREFIX}:${memberId}`

export async function getDashboardWidgetOrder(memberId) {
  const storedOrder = getLocalWidgetOrder(memberId)

  const { data, error } = await supabase
    .from('home_dashboard_settings')
    .select('widget_order')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTableError(error)) return mergeWidgetOrder(storedOrder)
    throw error
  }

  return mergeWidgetOrder(data?.widget_order || storedOrder)
}

export async function saveDashboardWidgetOrder(memberId, widgetOrder) {
  const mergedOrder = mergeWidgetOrder(widgetOrder)
  localStorage.setItem(getStorageKey(memberId), JSON.stringify(mergedOrder))

  const { error } = await supabase
    .from('home_dashboard_settings')
    .upsert(
      {
        member_id: memberId,
        widget_order: mergedOrder,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' },
    )

  if (error && !isMissingSettingsTableError(error)) throw error

  return mergedOrder
}

function getLocalWidgetOrder(memberId) {
  try {
    const storedValue = localStorage.getItem(getStorageKey(memberId))
    return storedValue ? JSON.parse(storedValue) : null
  } catch {
    return null
  }
}

function mergeWidgetOrder(widgetOrder) {
  if (!Array.isArray(widgetOrder)) return defaultDashboardWidgetOrder

  const knownWidgets = widgetOrder.filter((widgetId) => defaultDashboardWidgetOrder.includes(widgetId))
  const missingWidgets = defaultDashboardWidgetOrder.filter((widgetId) => !knownWidgets.includes(widgetId))
  return [...knownWidgets, ...missingWidgets]
}

function isMissingSettingsTableError(error) {
  return missingSettingsTableCodes.has(error.code) || /home_dashboard_settings/.test(error.message || '')
}
