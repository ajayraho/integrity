// Notification service for PWA
export class NotificationService {
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
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

  static async checkPermission() {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  static async scheduleReminder(reminder) {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      console.warn('Notification permission not granted')
      return false
    }

    // Register service worker if not already registered
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        
        // Send message to service worker to schedule the notification
        if (registration.active) {
          registration.active.postMessage({
            type: 'SCHEDULE_REMINDER',
            reminderId: reminder.id,
            lineContent: reminder.lineContent,
            datetime: reminder.datetime
          })
        }

        // Also set a local timeout as backup
        this.scheduleLocalNotification(reminder)
        
        return true
      } catch (error) {
        console.error('Error scheduling notification:', error)
        // Fallback to local notification
        this.scheduleLocalNotification(reminder)
        return false
      }
    } else {
      // Fallback to local notification if service worker not available
      this.scheduleLocalNotification(reminder)
      return true
    }
  }

  static scheduleLocalNotification(reminder) {
    const now = new Date()
    const reminderTime = new Date(reminder.datetime)
    const delay = reminderTime - now

    if (delay > 0 && delay < 2147483647) { // Max setTimeout delay
      setTimeout(() => {
        this.showNotification(reminder)
      }, delay)
    }
  }

  static async showNotification(reminder) {
    const hasPermission = await this.checkPermission()
    if (!hasPermission) return

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('Integrity Journal Reminder', {
          body: reminder.lineContent || 'You have a journal task to complete',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: reminder.id,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: {
            reminderId: reminder.id,
            dateOfArrival: Date.now(),
            primaryKey: reminder.id
          },
          actions: [
            {
              action: 'open',
              title: 'Open Journal'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        })
      } catch (error) {
        console.error('Error showing notification:', error)
        // Fallback to basic notification
        new Notification('Integrity Journal Reminder', {
          body: reminder.lineContent || 'You have a journal task to complete',
          icon: '/icon-192.png'
        })
      }
    } else {
      // Basic notification
      new Notification('Integrity Journal Reminder', {
        body: reminder.lineContent || 'You have a journal task to complete',
        icon: '/icon-192.png'
      })
    }
  }

  static async scheduleRecurringReminder(reminder) {
    // Schedule the first instance
    await this.scheduleReminder(reminder)

    // For recurring reminders, we need to check and reschedule
    // This is handled by the main app checking active reminders periodically
  }

  static cancelReminder(reminderId) {
    // Since we can't cancel a setTimeout in service worker,
    // we'll mark it as cancelled in storage and ignore it when it fires
    // The reminder will be deleted from storage, so it won't fire again
  }
}

// Check for reminders on app load
export function initializeNotifications() {
  // Request permission on first run
  if ('Notification' in window && Notification.permission === 'default') {
    // Don't request immediately, let user set first reminder
  }

  // Check for due reminders every minute
  setInterval(() => {
    checkDueReminders()
  }, 60000) // Check every minute
}

function checkDueReminders() {
  try {
    const reminders = JSON.parse(localStorage.getItem('integrity_reminders') || '[]')
    const now = new Date()

    reminders.forEach(reminder => {
      if (!reminder.enabled) return

      const reminderTime = new Date(reminder.datetime)
      const timeDiff = reminderTime - now

      // If reminder is within the next minute and not yet shown
      if (timeDiff > 0 && timeDiff < 60000) {
        NotificationService.showNotification(reminder)
        
        // Handle recurring reminders
        if (reminder.recurring !== 'none') {
          scheduleNextOccurrence(reminder)
        }
      }
    })
  } catch (error) {
    console.error('Error checking due reminders:', error)
  }
}

function scheduleNextOccurrence(reminder) {
  const currentTime = new Date(reminder.datetime)
  let nextTime = new Date(currentTime)

  switch (reminder.recurring) {
    case 'daily':
      nextTime.setDate(nextTime.getDate() + 1)
      break
    case 'weekly':
      nextTime.setDate(nextTime.getDate() + 7)
      break
    case 'monthly':
      nextTime.setMonth(nextTime.getMonth() + 1)
      break
    case 'custom':
      // Find next occurrence based on selected days
      if (reminder.customRecurring && reminder.customRecurring.length > 0) {
        nextTime = getNextCustomDay(currentTime, reminder.customRecurring)
      }
      break
  }

  // Update reminder in storage with new datetime
  try {
    const reminders = JSON.parse(localStorage.getItem('integrity_reminders') || '[]')
    const index = reminders.findIndex(r => r.id === reminder.id)
    if (index !== -1) {
      reminders[index].datetime = nextTime.toISOString()
      localStorage.setItem('integrity_reminders', JSON.stringify(reminders))
      
      // Schedule the next notification
      NotificationService.scheduleReminder(reminders[index])
    }
  } catch (error) {
    console.error('Error scheduling next occurrence:', error)
  }
}

function getNextCustomDay(currentDate, selectedDays) {
  const nextDate = new Date(currentDate)
  let daysChecked = 0
  
  while (daysChecked < 7) {
    nextDate.setDate(nextDate.getDate() + 1)
    if (selectedDays.includes(nextDate.getDay())) {
      return nextDate
    }
    daysChecked++
  }
  
  return nextDate
}
