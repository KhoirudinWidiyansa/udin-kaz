// Budget notification thresholds
export const NOTIFICATION_THRESHOLDS = [80, 90, 100] as const

export interface NotificationPreferences {
  enabled: boolean
  budgetWarnings: boolean
  dailyReminder: boolean
  overspendingAlert: boolean
}

const STORAGE_KEY = 'kas_keluarga_notification_prefs'
const TRIGGERED_KEY = 'kas_keluarga_triggered_notifications'

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      budgetWarnings: true,
      dailyReminder: true,
      overspendingAlert: true,
    }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {}
  
  return {
    enabled: false,
    budgetWarnings: true,
    dailyReminder: true,
    overspendingAlert: true,
  }
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

/**
 * Send a browser notification
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  const prefs = getNotificationPreferences()
  
  if (!prefs.enabled || Notification.permission !== 'granted') {
    return
  }
  
  const notification = new Notification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    ...options,
  })
  
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}

/**
 * Track triggered notifications to avoid duplicates
 */
export function markNotificationTriggered(key: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const triggered = JSON.parse(localStorage.getItem(TRIGGERED_KEY) || '{}')
    triggered[key] = new Date().toISOString()
    localStorage.setItem(TRIGGERED_KEY, JSON.stringify(triggered))
  } catch {}
}

/**
 * Check if notification was already triggered today
 */
export function wasNotificationTriggeredToday(key: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const triggered = JSON.parse(localStorage.getItem(TRIGGERED_KEY) || '{}')
    const lastTriggered = triggered[key]
    
    if (!lastTriggered) return false
    
    const lastDate = new Date(lastTriggered).toDateString()
    const today = new Date().toDateString()
    
    return lastDate === today
  } catch {}
  
  return false
}

/**
 * Clear old triggered notifications (cleanup)
 */
export function cleanupOldNotifications(): void {
  if (typeof window === 'undefined') return
  
  try {
    const triggered = JSON.parse(localStorage.getItem(TRIGGERED_KEY) || '{}')
    const today = new Date()
    const cleaned: Record<string, string> = {}
    
    Object.entries(triggered).forEach(([key, dateStr]) => {
      const date = new Date(dateStr as string)
      const daysDiff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      
      // Keep only last 7 days
      if (daysDiff < 7) {
        cleaned[key] = dateStr as string
      }
    })
    
    localStorage.setItem(TRIGGERED_KEY, JSON.stringify(cleaned))
  } catch {}
}

/**
 * Check budget thresholds and send notifications
 */
export function checkBudgetNotifications(
  kategori: string,
  percentage: number,
  prefs: NotificationPreferences
): void {
  if (!prefs.enabled || !prefs.budgetWarnings) return
  
  NOTIFICATION_THRESHOLDS.forEach(threshold => {
    if (percentage >= threshold) {
      const key = `budget_${kategori}_${threshold}`
      
      if (!wasNotificationTriggeredToday(key)) {
        const emoji = threshold === 100 ? '🚨' : threshold === 90 ? '⚠️' : '📊'
        const message = threshold === 100
          ? `Budget ${kategori} sudah habis!`
          : `Budget ${kategori} sudah ${percentage.toFixed(0)}% terpakai`
        
        sendNotification(`${emoji} Peringatan Budget`, {
          body: message,
          tag: `budget-${kategori}`,
        })
        
        markNotificationTriggered(key)
      }
    }
  })
}

/**
 * Check if daily reminder should be sent (at 8 PM if no transaction logged)
 */
export function checkDailyReminder(hasTransactionToday: boolean): void {
  const prefs = getNotificationPreferences()
  
  if (!prefs.enabled || !prefs.dailyReminder) return
  if (hasTransactionToday) return
  
  const now = new Date()
  const hour = now.getHours()
  
  // Send reminder between 8 PM and 9 PM
  if (hour >= 20 && hour < 21) {
    const key = `daily_reminder_${now.toDateString()}`
    
    if (!wasNotificationTriggeredToday(key)) {
      sendNotification('📝 Pengingat Harian', {
        body: 'Belum ada transaksi dicatat hari ini. Jangan lupa catat pengeluaranmu!',
        tag: 'daily-reminder',
      })
      
      markNotificationTriggered(key)
    }
  }
}

/**
 * Check if overspending alert should be sent
 */
export function checkOverspendingAlert(
  todaySpending: number,
  dailyAverage: number
): void {
  const prefs = getNotificationPreferences()
  
  if (!prefs.enabled || !prefs.overspendingAlert) return
  
  // Alert if spending exceeds average by 50%
  if (todaySpending > dailyAverage * 1.5) {
    const key = `overspending_${new Date().toDateString()}`
    
    if (!wasNotificationTriggeredToday(key)) {
      const percentage = Math.round((todaySpending / dailyAverage) * 100)
      
      sendNotification('💸 Pengeluaran Tinggi!', {
        body: `Pengeluaran hari ini ${percentage}% lebih tinggi dari rata-rata.`,
        tag: 'overspending-alert',
      })
      
      markNotificationTriggered(key)
    }
  }
}
