// Storage keys
const ENTRIES_KEY = 'integrity_journal_entries'
const TEMPLATES_KEY = 'integrity_templates'
const SETTINGS_KEY = 'integrity_settings'
const HABITS_KEY = 'integrity_habits'
const REMINDERS_KEY = 'integrity_reminders'

// Load journal entries
export function loadEntries() {
  try {
    const data = localStorage.getItem(ENTRIES_KEY)
    if (data) {
      const entries = JSON.parse(data)
      // Convert date strings back to Date objects
      return entries.map(entry => ({
        ...entry,
        date: new Date(entry.date)
      }))
    }
    return []
  } catch (error) {
    console.error('Error loading entries:', error)
    return []
  }
}

// Save journal entries
export function saveEntries(entries) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
    return true
  } catch (error) {
    console.error('Error saving entries:', error)
    return false
  }
}

// Load templates
export function loadTemplates() {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading templates:', error)
    return []
  }
}

// Save a new template
export function saveTemplate(template) {
  try {
    const templates = loadTemplates()
    
    // If this is set as default, remove default from others
    if (template.isDefault) {
      templates.forEach(t => t.isDefault = false)
    }
    
    templates.push(template)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
    return true
  } catch (error) {
    console.error('Error saving template:', error)
    return false
  }
}

// Get default template
export function getDefaultTemplate() {
  const templates = loadTemplates()
  return templates.find(t => t.isDefault) || null
}

// Load settings
export function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    return data ? JSON.parse(data) : {
      fontSize: 'medium',
      theme: 'paper',
      autoSave: true
    }
  } catch (error) {
    console.error('Error loading settings:', error)
    return {}
  }
}

// Save settings
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

// Clear all data (useful for debugging)
export function clearAllData() {
  localStorage.removeItem(ENTRIES_KEY)
  localStorage.removeItem(TEMPLATES_KEY)
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(HABITS_KEY)
}

// ===== HABITS MANAGEMENT =====

// Load all habits
export function loadHabits() {
  try {
    const data = localStorage.getItem(HABITS_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading habits:', error)
    return []
  }
}

// Save all habits
export function saveHabits(habits) {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
    return true
  } catch (error) {
    console.error('Error saving habits:', error)
    return false
  }
}

// Add a new habit
export function addHabit(habit) {
  try {
    const habits = loadHabits()
    const newHabit = {
      id: `habit-${Date.now()}`,
      name: habit.name,
      type: habit.type || 'checkbox', // checkbox, number, text
      icon: habit.icon || '✓',
      color: habit.color || '#2C3E50',
      order: habits.length,
      createdAt: new Date().toISOString(),
      ...habit
    }
    habits.push(newHabit)
    saveHabits(habits)
    return newHabit
  } catch (error) {
    console.error('Error adding habit:', error)
    return null
  }
}

// Update a habit
export function updateHabit(habitId, updates) {
  try {
    const habits = loadHabits()
    const index = habits.findIndex(h => h.id === habitId)
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates }
      saveHabits(habits)
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating habit:', error)
    return false
  }
}

// Delete a habit
export function deleteHabit(habitId) {
  try {
    const habits = loadHabits()
    const filtered = habits.filter(h => h.id !== habitId)
    saveHabits(filtered)
    return true
  } catch (error) {
    console.error('Error deleting habit:', error)
    return false
  }
}

// Reorder habits
export function reorderHabits(habitIds) {
  try {
    const habits = loadHabits()
    const reordered = habitIds.map((id, index) => {
      const habit = habits.find(h => h.id === id)
      return { ...habit, order: index }
    })
    saveHabits(reordered)
    return true
  } catch (error) {
    console.error('Error reordering habits:', error)
    return false
  }
}

// ==================== Reminders ====================

// Load all reminders
export function loadReminders() {
  try {
    const data = localStorage.getItem(REMINDERS_KEY)
    if (data) {
      const reminders = JSON.parse(data)
      // Convert date strings back to Date objects
      return reminders.map(reminder => ({
        ...reminder,
        datetime: new Date(reminder.datetime),
        createdAt: new Date(reminder.createdAt)
      }))
    }
    return []
  } catch (error) {
    console.error('Error loading reminders:', error)
    return []
  }
}

// Save reminders
function saveRemindersData(reminders) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
    return true
  } catch (error) {
    console.error('Error saving reminders:', error)
    return false
  }
}

// Add a new reminder
export function addReminder(reminder) {
  try {
    const reminders = loadReminders()
    const newReminder = {
      id: `reminder-${Date.now()}`,
      lineId: reminder.lineId,
      dayId: reminder.dayId,
      lineContent: reminder.lineContent,
      datetime: reminder.datetime,
      recurring: reminder.recurring || 'none', // none, daily, weekly, monthly, custom
      customRecurring: reminder.customRecurring || null, // for custom patterns
      enabled: true,
      createdAt: new Date()
    }
    reminders.push(newReminder)
    saveRemindersData(reminders)
    return newReminder
  } catch (error) {
    console.error('Error adding reminder:', error)
    return null
  }
}

// Update a reminder
export function updateReminder(reminderId, updates) {
  try {
    const reminders = loadReminders()
    const index = reminders.findIndex(r => r.id === reminderId)
    if (index !== -1) {
      reminders[index] = { ...reminders[index], ...updates }
      saveRemindersData(reminders)
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating reminder:', error)
    return false
  }
}

// Delete a reminder
export function deleteReminder(reminderId) {
  try {
    const reminders = loadReminders()
    const filtered = reminders.filter(r => r.id !== reminderId)
    saveRemindersData(filtered)
    return true
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return false
  }
}

// Get reminders for a specific line
export function getRemindersForLine(lineId) {
  try {
    const reminders = loadReminders()
    return reminders.filter(r => r.lineId === lineId && r.enabled)
  } catch (error) {
    console.error('Error getting reminders for line:', error)
    return []
  }
}

// Get all active reminders
export function getActiveReminders() {
  try {
    const reminders = loadReminders()
    return reminders.filter(r => r.enabled)
  } catch (error) {
    console.error('Error getting active reminders:', error)
    return []
  }
}
