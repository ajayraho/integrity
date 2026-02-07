import { useState, useEffect } from 'react'
import { addReminder, updateReminder, deleteReminder, getRemindersForLine } from '../utils/storage'
import { NotificationService } from '../utils/notifications'

function ReminderModal({ lineId, dayId, lineContent, onClose, onSave }) {
    const [datetime, setDatetime] = useState('')
    const [recurring, setRecurring] = useState('none')
    const [customDays, setCustomDays] = useState([])
    const [existingReminder, setExistingReminder] = useState(null)
    const [showNotificationPermission, setShowNotificationPermission] = useState(false)

    useEffect(() => {
        // Check if line already has a reminder
        const reminders = getRemindersForLine(lineId)
        if (reminders.length > 0) {
            const reminder = reminders[0]
            setExistingReminder(reminder)

            // Format datetime for input
            const dt = new Date(reminder.datetime)
            const formattedDt = dt.toISOString().slice(0, 16)
            setDatetime(formattedDt)
            setRecurring(reminder.recurring)
            if (reminder.customRecurring) {
                setCustomDays(reminder.customRecurring)
            }
        } else {
            // Default to tomorrow at 9 AM
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(9, 0, 0, 0)
            setDatetime(tomorrow.toISOString().slice(0, 16))
        }

        // Check notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            setShowNotificationPermission(true)
        }
    }, [lineId])

    const handleRequestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                setShowNotificationPermission(false)
            }
        }
    }

    const handleSave = async () => {
        const reminderData = {
            lineId,
            dayId,
            lineContent,
            datetime: new Date(datetime),
            recurring,
            customRecurring: recurring === 'custom' ? customDays : null
        }

        let savedReminder
        if (existingReminder) {
            updateReminder(existingReminder.id, reminderData)
            savedReminder = { ...existingReminder, ...reminderData }
        } else {
            savedReminder = addReminder(reminderData)
        }

        // Schedule PWA notification
        if (savedReminder) {
            await NotificationService.scheduleReminder(savedReminder)
        }

        if (onSave) onSave()
        onClose()
    }

    const handleDelete = () => {
        if (existingReminder) {
            deleteReminder(existingReminder.id)
            NotificationService.cancelReminder(existingReminder.id)
            if (onSave) onSave()
        }
        onClose()
    }

    const toggleCustomDay = (day) => {
        setCustomDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const weekDays = [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' }
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-line rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b-2 border-line p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-ink">
                        {existingReminder ? 'Edit Reminder' : 'Set Reminder'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-ink/60 hover:text-ink transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Line Preview */}
                    <div className="bg-paper border-2 border-line rounded-lg p-3">
                        <p className="text-sm text-ink/60 mb-1">Reminder for:</p>
                        <p className="text-ink font-medium">{lineContent || 'Empty line'}</p>
                    </div>

                    {/* Notification Permission Warning */}
                    {showNotificationPermission && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-sm text-yellow-800 mb-2">
                                        Enable notifications to receive reminders
                                    </p>
                                    <button
                                        onClick={handleRequestPermission}
                                        className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline"
                                    >
                                        Enable Notifications
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={datetime}
                            onChange={(e) => setDatetime(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-line rounded-lg bg-white text-ink focus:border-ink outline-none"
                        />
                    </div>

                    {/* Recurring Options */}
                    <div>
                        <label className="block text-sm font-semibold text-ink mb-2">
                            Repeat
                        </label>
                        <div className="space-y-2">
                            {[
                                { value: 'none', label: 'Does not repeat', icon: '🔔' },
                                { value: 'daily', label: 'Daily', icon: '📅' },
                                { value: 'weekly', label: 'Weekly', icon: '📆' },
                                { value: 'monthly', label: 'Monthly', icon: '🗓️' },
                                { value: 'custom', label: 'Custom (Select days)', icon: '⚙️' }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setRecurring(option.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg text-left transition-all flex items-center gap-3 ${recurring === option.value
                                        ? 'bg-ink text-white border-ink'
                                        : 'bg-white text-ink border-line hover:border-ink'
                                        }`}
                                >
                                    <span className="text-xl">{option.icon}</span>
                                    <span className="font-medium">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Days Selection */}
                    {recurring === 'custom' && (
                        <div>
                            <label className="block text-sm font-semibold text-ink mb-2">
                                Select Days
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map(day => (
                                    <button
                                        key={day.value}
                                        onClick={() => toggleCustomDay(day.value)}
                                        className={`aspect-square rounded-lg border-2 transition-all font-semibold text-sm ${customDays.includes(day.value)
                                            ? 'bg-ink text-white border-ink'
                                            : 'bg-white text-ink border-line hover:border-ink'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t-2 border-line p-4 flex gap-3">
                    {existingReminder && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border-2 border-line text-ink rounded-lg font-semibold hover:bg-line/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink/90 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ReminderModal
