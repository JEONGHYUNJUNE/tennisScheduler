export function isAppBadgeSupported() {
  return typeof navigator !== 'undefined' &&
    typeof navigator.setAppBadge === 'function' &&
    typeof navigator.clearAppBadge === 'function'
}

export async function updateAppBadge(count) {
  if (!isAppBadgeSupported()) return

  try {
    if (count > 0) {
      await navigator.setAppBadge(count)
    } else {
      await navigator.clearAppBadge()
    }
  } catch {
    // Badge support differs by browser/OS. Unsupported failures should not affect app usage.
  }
}

export async function clearAppBadge() {
  if (!isAppBadgeSupported()) return

  try {
    await navigator.clearAppBadge()
  } catch {
    // Ignore platform-specific badge failures.
  }
}
