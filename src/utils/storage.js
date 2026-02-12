import { loadAllData, saveAllData } from './database'

// In-memory cache
let dataCache = {
  entries: [],
  habits: [],
  templates: [],
  reminders: [],
  xpHistory: [] // Array of {date, amount, source, timestamp, lineId/habitId}
}

let isInitialized = false
let saveTimeout = null

/**
 * Initialize storage by loading from database
 */
export async function initializeStorage() {
  try {
    const data = await loadAllData()
    dataCache = data
    isInitialized = true
    return { success: true }
  } catch (error) {
    console.error('Failed to initialize storage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save all data to database with debouncing
 */
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(async () => {
    try {
      await saveAllData(dataCache)
      console.log('Data saved to database')
    } catch (error) {
      console.error('Failed to save to database:', error)
    }
  }, 1000) // Save after 1 second of inactivity
}

/**
 * Force immediate save
 */
export async function forceSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  try {
    await saveAllData(dataCache)
    return { success: true }
  } catch (error) {
    console.error('Failed to force save:', error)
    return { success: false, error: error.message }
  }
}

// ============= ENTRIES =============

export function loadEntries() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning empty entries')
    return []
  }
  // Convert date strings back to Date objects
  return dataCache.entries.map(entry => ({
    ...entry,
    date: new Date(entry.date)
  }))
}

export function saveEntries(entries) {
  dataCache.entries = entries
  scheduleSave()
  return true
}

// ============= TEMPLATES =============

export function loadTemplates() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning empty templates')
    return []
  }
  return dataCache.templates
}

export function saveTemplate(template) {
  try {
    const templates = dataCache.templates
    
    // If this is set as default, remove default from others
    if (template.isDefault) {
      templates.forEach(t => t.isDefault = false)
    }
    
    // Add unique ID
    template.id = Date.now().toString()
    templates.push(template)
    dataCache.templates = templates
    scheduleSave()
    return true
  } catch (error) {
    console.error('Error saving template:', error)
    return false
  }
}

export function updateTemplate(templateId, updates) {
  try {
    console.log('updateTemplate called with:', templateId, updates)
    const templates = dataCache.templates
    console.log('Current templates:', templates)
    const index = templates.findIndex(t => t.id === templateId)
    console.log('Template index:', index)
    
    if (index !== -1) {
      // If setting as default, remove default from others
      if (updates.isDefault) {
        templates.forEach(t => t.isDefault = false)
      }
      
      // Merge updates
      templates[index] = { ...templates[index], ...updates }
      dataCache.templates = templates
      scheduleSave()
      console.log('Updated templates:', templates)
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating template:', error)
    return false
  }
}

export function deleteTemplate(templateId) {
  try {
    console.log('deleteTemplate called with:', templateId)
    const templates = dataCache.templates
    console.log('Templates before delete:', templates)
    const filtered = templates.filter(t => t.id !== templateId)
    console.log('Templates after filter:', filtered)
    dataCache.templates = filtered
    scheduleSave()
    return true
  } catch (error) {
    console.error('Error deleting template:', error)
    return false
  }
}

export function getDefaultTemplate() {
  const templates = dataCache.templates
  return templates.find(t => t.isDefault) || null
}

// ============= HABITS =============

export function loadHabits() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning empty habits')
    return []
  }
  return dataCache.habits
}

export function saveHabits(habits) {
  dataCache.habits = habits
  scheduleSave()
  return true
}

export function addHabit(habit) {
  try {
    const habits = dataCache.habits
    habit.id = Date.now().toString()
    habits.push(habit)
    dataCache.habits = habits
    scheduleSave()
    return habit
  } catch (error) {
    console.error('Error adding habit:', error)
    return null
  }
}

export function updateHabit(habitId, updates) {
  try {
    const habits = dataCache.habits
    const index = habits.findIndex(h => h.id === habitId)
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates }
      dataCache.habits = habits
      scheduleSave()
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating habit:', error)
    return false
  }
}

export function deleteHabit(habitId) {
  try {
    const habits = dataCache.habits
    dataCache.habits = habits.filter(h => h.id !== habitId)
    scheduleSave()
    return true
  } catch (error) {
    console.error('Error deleting habit:', error)
    return false
  }
}

// ============= REMINDERS =============

export function loadReminders() {
  if (!isInitialized) {
    console.warn('Storage not initialized, returning empty reminders')
    return []
  }
  return dataCache.reminders
}

export function saveReminder(reminder) {
  try {
    const reminders = dataCache.reminders
    reminder.id = Date.now().toString()
    reminders.push(reminder)
    dataCache.reminders = reminders
    scheduleSave()
    return reminder
  } catch (error) {
    console.error('Error saving reminder:', error)
    return null
  }
}

export function addReminder(reminder) {
  return saveReminder(reminder)
}

export function getRemindersForLine(lineId) {
  try {
    const reminders = dataCache.reminders
    return reminders.filter(r => r.lineId === lineId)
  } catch (error) {
    console.error('Error getting reminders:', error)
    return []
  }
}

export function deleteReminder(reminderId) {
  try {
    const reminders = dataCache.reminders
    dataCache.reminders = reminders.filter(r => r.id !== reminderId)
    scheduleSave()
    return true
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return false
  }
}

export function updateReminder(reminderId, updates) {
  try {
    const reminders = dataCache.reminders
    const index = reminders.findIndex(r => r.id === reminderId)
    if (index !== -1) {
      reminders[index] = { ...reminders[index], ...updates }
      dataCache.reminders = reminders
      scheduleSave()
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating reminder:', error)
    return false
  }
}

// ============= SETTINGS =============

export function loadSettings() {
  // Settings can remain in localStorage for now (theme, preferences, etc.)
  try {
    const data = localStorage.getItem('integrity_settings')
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('Error loading settings:', error)
    return {}
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem('integrity_settings', JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

// ============= XP SYSTEM =============

/**
 * Add XP to history
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} amount - XP amount (positive or negative)
 * @param {string} source - 'habit' or 'task'
 * @param {string} sourceId - habitId or lineId
 * @param {string} sourceName - Name of the habit or task
 */
export function addXP(date, amount, source, sourceId, sourceName = '') {
  try {
    if (!dataCache.xpHistory) {
      dataCache.xpHistory = []
    }
    
    const xpEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date,
      amount,
      source,
      sourceId,
      sourceName,
      timestamp: new Date().toISOString()
    }
    
    dataCache.xpHistory.push(xpEntry)
    scheduleSave()
    return xpEntry
  } catch (error) {
    console.error('Error adding XP:', error)
    return null
  }
}

/**
 * Get total XP for a specific date
 */
export function getXPForDate(date) {
  try {
    if (!dataCache.xpHistory) return 0
    return dataCache.xpHistory
      .filter(xp => xp.date === date)
      .reduce((sum, xp) => sum + xp.amount, 0)
  } catch (error) {
    console.error('Error getting XP for date:', error)
    return 0
  }
}

/**
 * Get total XP for all time
 */
export function getTotalXP() {
  try {
    if (!dataCache.xpHistory) return 0
    return dataCache.xpHistory.reduce((sum, xp) => sum + xp.amount, 0)
  } catch (error) {
    console.error('Error getting total XP:', error)
    return 0
  }
}

/**
 * Get XP history for a month
 * @param {number} year
 * @param {number} month - 1-based (1 = January)
 */
export function getXPForMonth(year, month) {
  try {
    if (!dataCache.xpHistory) return []
    
    const monthStr = month.toString().padStart(2, '0')
    const prefix = `${year}-${monthStr}`
    
    // Group by date
    const dailyXP = {}
    dataCache.xpHistory
      .filter(xp => xp.date.startsWith(prefix))
      .forEach(xp => {
        if (!dailyXP[xp.date]) {
          dailyXP[xp.date] = { date: xp.date, total: 0, entries: [] }
        }
        dailyXP[xp.date].total += xp.amount
        dailyXP[xp.date].entries.push(xp)
      })
    
    return Object.values(dailyXP).sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error('Error getting XP for month:', error)
    return []
  }
}

/**
 * Remove XP entries for a specific source (when unchecking)
 * @param {string} sourceId - habitId or lineId
 * @param {string} date - Date in YYYY-MM-DD format
 */
export function removeXPForSource(sourceId, date) {
  try {
    if (!dataCache.xpHistory) return 0
    
    const removed = dataCache.xpHistory.filter(xp => xp.sourceId === sourceId && xp.date === date)
    const totalRemoved = removed.reduce((sum, xp) => sum + xp.amount, 0)
    
    dataCache.xpHistory = dataCache.xpHistory.filter(xp => !(xp.sourceId === sourceId && xp.date === date))
    scheduleSave()
    
    return totalRemoved
  } catch (error) {
    console.error('Error removing XP:', error)
    return 0
  }
}

/**
 * Get XP entries for a specific source and date
 */
export function getXPForSource(sourceId, date) {
  try {
    if (!dataCache.xpHistory) return []
    return dataCache.xpHistory.filter(xp => xp.sourceId === sourceId && xp.date === date)
  } catch (error) {
    console.error('Error getting XP for source:', error)
    return []
  }
}
