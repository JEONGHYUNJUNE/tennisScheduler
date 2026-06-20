import { supabase } from '../lib/supabase'

const STORAGE_KEY_PREFIX = 'ons-tennis-widget-order'
const missingSettingsTableCodes = new Set(['42P01', 'PGRST205'])

export const defaultHomeWidgetOrder = ['upcomingEvents', 'members', 'ranking', 'calendar']

const getStorageKey = (memberId) => `${STORAGE_KEY_PREFIX}:${memberId}`

export async function getHomeWidgetOrder(memberId) {
  const storedOrder = getLocalWidgetOrder(memberId)

  const { data, error } = await supabase
    .from('home_widget_settings')
    .select('widget_order')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTableError(error)) return mergeWidgetOrder(storedOrder)
    throw error
  }

  return mergeWidgetOrder(data?.widget_order || storedOrder)
}

export async function saveHomeWidgetOrder(memberId, widgetOrder) {
  const mergedOrder = mergeWidgetOrder(widgetOrder)
  localStorage.setItem(getStorageKey(memberId), JSON.stringify(mergedOrder))

  const { error } = await supabase
    .from('home_widget_settings')
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
  if (!Array.isArray(widgetOrder)) return defaultHomeWidgetOrder

  const knownWidgets = widgetOrder.filter((widgetId) => defaultHomeWidgetOrder.includes(widgetId))
  const missingWidgets = defaultHomeWidgetOrder.filter((widgetId) => !knownWidgets.includes(widgetId))
  return [...knownWidgets, ...missingWidgets]
}

function isMissingSettingsTableError(error) {
  return missingSettingsTableCodes.has(error.code) || /home_widget_settings/.test(error.message || '')
}
