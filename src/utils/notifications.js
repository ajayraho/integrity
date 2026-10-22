// Reminder notifications.
//
// Reminders are stored in Firestore (see storage.js). While the app is open a
// scheduler checks them every 30s and shows a notification when one is due.
// NOTE: browsers can't run timers for a closed PWA, so reminders only fire while
// the app is open (or was opened shortly after the due time — see CATCH_UP_MS).
// True background reminders need push (Firebase Cloud Messaging + a scheduled
// Cloud Function); that's a later step.

import { loadReminders, updateReminder } from './storage'

const CHECK_INTERVAL_MS = 30 * 1000
const CATCH_UP_MS = 12 * 60 * 60 * 1000 // show reminders missed in the last 12h when the app opens
const FIRED_KEY = 'integrity_fired_reminders'

export const NotificationService = {
    supported() {
        return typeof window !== 'undefined' && 'Notification' in window
    },

    async requestPermission() {
        if (!this.supported()) return false
        if (Notification.permission === 'granted') return true
        if (Notification.permission === 'denied') return false
        return (await Notification.requestPermission()) === 'granted'
    },

    async showNotification(reminder) {
        if (!this.supported() || Notification.permission !== 'granted') return
        const title = 'Integrity Journal Reminder'
        const options = {
            body: reminder.lineContent || 'You have a journal task to complete',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: reminder.id,
            data: { reminderId: reminder.id, dayId: reminder.dayId },
        }
        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.getRegistration()
                if (reg) {
                    await reg.showNotification(title, options)
                    return
                }
            }
            new Notification(title, options)
        } catch (error) {
            console.error('Error showing notification:', error)
        }
    },
}

function getFired() {
    try {
        return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]'))
    } catch {
        return new Set()
    }
}

function markFired(key) {
    const fired = getFired()
    fired.add(key)
    try {
        // keep the list bounded
        localStorage.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-200)))
    } catch { /* ignore */ }
}

export function nextOccurrence(reminder, after = new Date()) {
    const next = new Date(reminder.datetime)
    const step = () => {
        switch (reminder.recurring) {
            case 'daily': next.setDate(next.getDate() + 1); break
            case 'weekly': next.setDate(next.getDate() + 7); break
            case 'monthly': {
                const day = next.getDate()
                next.setDate(1)
                next.setMonth(next.getMonth() + 1)
                const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
                next.setDate(Math.min(day, last))
                break
            }
            case 'custom': {
                const days = reminder.customRecurring || []
                if (!days.length) return false
                do { next.setDate(next.getDate() + 1) } while (!days.includes(next.getDay()))
                break
            }
            default: return false
        }
        return true
    }
    let guard = 0
    while (next <= after && guard++ < 2000) {
        if (!step()) return null
    }
    return next > after ? next : null
}

export function checkDueReminders(now = new Date()) {
    const fired = getFired()
    loadReminders().forEach(reminder => {
        if (reminder.enabled === false) return
        const due = new Date(reminder.datetime)
        if (isNaN(due) || due > now) return

        const key = `${reminder.id}|${reminder.datetime}`
        if (!fired.has(key) && now - due <= CATCH_UP_MS) {
            NotificationService.showNotification(reminder)
            markFired(key)
        }

        if (reminder.recurring && reminder.recurring !== 'none') {
            const next = nextOccurrence(reminder, now)
            if (next) updateReminder(reminder.id, { datetime: next })
            else updateReminder(reminder.id, { enabled: false })
        } else {
            updateReminder(reminder.id, { enabled: false })
        }
    })
}

/** Start checking reminders. Returns a stop function. */
export function startReminderScheduler() {
    checkDueReminders()
    const interval = setInterval(() => checkDueReminders(), CHECK_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') checkDueReminders() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVisible)
    }
}
