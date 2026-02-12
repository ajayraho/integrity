import { loadAllData, saveAllData } from './database'

// In-memory cache
let dataCache = {
  entries: [],
  habits: [],
  templates: [],
  reminders: [],
  xpHistory: [], // Array of {date, amount, source, timestamp, lineId/habitId}
  badges: [], // Array of {id, type, date, timestamp, xpBoost}
  medals: [] // Array of {id, tier, month, year, xpThreshold, timestamp}
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

// ============= BADGE SYSTEM =============

export const BADGE_TYPES = {
  DEEP_WORK_2HR: { id: 'deep_work_2hr', name: 'Deep Focus 2H', icon: '🎯', xpBoost: 50, description: 'Complete a 2-hour deep work session' },
  DEEP_WORK_5HR: { id: 'deep_work_5hr', name: 'Deep Focus 5H', icon: '🔥', xpBoost: 150, description: 'Complete a 5-hour deep work session' },
  WATER_WARRIOR: { id: 'water_warrior', name: 'Water Warrior', icon: '💧', xpBoost: 30, description: 'Drink 8 glasses of water' },
  EXERCISE_PRO: { id: 'exercise_pro', name: 'Exercise Pro', icon: '💪', xpBoost: 40, description: 'Complete your exercise routine' },
  EARLY_BIRD: { id: 'early_bird', name: 'Early Bird', icon: '🌅', xpBoost: 25, description: 'Complete a task before 8 AM' },
  NIGHT_OWL: { id: 'night_owl', name: 'Night Owl', icon: '🦉', xpBoost: 25, description: 'Complete a task after 10 PM' },
  TASK_MASTER: { id: 'task_master', name: 'Task Master', icon: '✅', xpBoost: 60, description: 'Complete 10 tasks in a day' },
  HABIT_STREAK_7: { id: 'habit_streak_7', name: '7-Day Streak', icon: '🔄', xpBoost: 100, description: 'Maintain a habit for 7 days' },
  PERFECT_DAY: { id: 'perfect_day', name: 'Perfect Day', icon: '⭐', xpBoost: 200, description: 'Complete all habits and 5+ tasks' },
  READING_BUG: { id: 'reading_bug', name: 'Reading Bug', icon: '📚', xpBoost: 35, description: 'Read for 1 hour' },
  PRODUCTIVITY_BEAST: { id: 'productivity_beast', name: 'Productivity Beast', icon: '🚀', xpBoost: 150, description: 'Earn 200+ XP in a day' }
}

export const MEDAL_TIERS = {
  BRONZE: { id: 'bronze', name: 'Bronze Medal', icon: '🥉', threshold: 100, color: '#CD7F32', description: 'Earn 100+ XP in a month' },
  SILVER: { id: 'silver', name: 'Silver Medal', icon: '🥈', threshold: 500, color: '#C0C0C0', description: 'Earn 500+ XP in a month' },
  GOLD: { id: 'gold', name: 'Gold Medal', icon: '🥇', threshold: 1000, color: '#FFD700', description: 'Earn 1000+ XP in a month' },
  PLATINUM: { id: 'platinum', name: 'Platinum Medal', icon: '💎', threshold: 2500, color: '#E5E4E2', description: 'Earn 2500+ XP in a month' },
  DIAMOND: { id: 'diamond', name: 'Diamond Medal', icon: '💠', threshold: 5000, color: '#B9F2FF', description: 'Earn 5000+ XP in a month' },
  LEGEND: { id: 'legend', name: 'Legend Medal', icon: '👑', threshold: 10000, color: '#9D00FF', description: 'Earn 10000+ XP in a month' }
}

/**
 * Award a badge to user
 */
export function awardBadge(badgeType, date) {
  try {
    if (!dataCache.badges) {
      dataCache.badges = []
    }

    // Check if badge already earned today
    const existing = dataCache.badges.find(b => b.type === badgeType && b.date === date)
    if (existing) {
      return null // Already earned
    }

    const badgeInfo = BADGE_TYPES[badgeType]
    if (!badgeInfo) {
      console.error('Unknown badge type:', badgeType)
      return null
    }

    const badge = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: badgeType,
      name: badgeInfo.name,
      icon: badgeInfo.icon,
      xpBoost: badgeInfo.xpBoost,
      description: badgeInfo.description || '',
      date,
      timestamp: new Date().toISOString()
    }

    dataCache.badges.push(badge)
    
    // Award XP boost
    addXP(date, badgeInfo.xpBoost, 'badge', badge.id, `Badge: ${badgeInfo.name}`)
    
    scheduleSave()
    return badge
  } catch (error) {
    console.error('Error awarding badge:', error)
    return null
  }
}

/**
 * Create a custom badge
 */
export function createCustomBadge(badgeData, date) {
  try {
    if (!dataCache.badges) {
      dataCache.badges = []
    }

    const badge = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: 'CUSTOM',
      name: badgeData.name,
      icon: badgeData.icon,
      xpBoost: badgeData.xpBoost,
      description: badgeData.description || '',
      date,
      timestamp: new Date().toISOString()
    }

    dataCache.badges.push(badge)
    
    // Award XP boost
    addXP(date, badgeData.xpBoost, 'badge', badge.id, `Badge: ${badgeData.name}`)
    
    scheduleSave()
    return badge
  } catch (error) {
    console.error('Error creating custom badge:', error)
    return null
  }
}

/**
 * Get all badges for a specific date
 */
export function getBadgesForDate(date) {
  try {
    if (!dataCache.badges) return []
    return dataCache.badges.filter(b => b.date === date)
  } catch (error) {
    console.error('Error getting badges for date:', error)
    return []
  }
}

/**
 * Get all earned badges
 */
export function getAllBadges() {
  try {
    if (!dataCache.badges) return []
    return dataCache.badges
  } catch (error) {
    console.error('Error getting all badges:', error)
    return []
  }
}

/**
 * Delete a badge
 */
export function deleteBadge(badgeId) {
  try {
    if (!dataCache.badges) return { success: false, error: 'No badges found' }
    
    const badgeIndex = dataCache.badges.findIndex(b => b.id === badgeId)
    if (badgeIndex === -1) {
      return { success: false, error: 'Badge not found' }
    }
    
    const badge = dataCache.badges[badgeIndex]
    
    // Remove the badge XP
    removeXPForSource(badgeId, badge.date)
    
    // Remove the badge
    dataCache.badges.splice(badgeIndex, 1)
    scheduleSave()
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting badge:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a badge's date
 */
export function updateBadge(badgeId, updates) {
  try {
    if (!dataCache.badges) return { success: false, error: 'No badges found' }
    
    const badge = dataCache.badges.find(b => b.id === badgeId)
    if (!badge) {
      return { success: false, error: 'Badge not found' }
    }
    
    // If XP changed, update the XP history
    if (updates.xpBoost !== undefined && updates.xpBoost !== badge.xpBoost) {
      removeXPForSource(badgeId, badge.date)
      badge.xpBoost = updates.xpBoost
      addXP(badge.date, badge.xpBoost, 'badge', badge.id, `Badge: ${badge.name}`)
    }
    
    // Update other properties
    if (updates.icon !== undefined) badge.icon = updates.icon
    if (updates.name !== undefined) badge.name = updates.name
    if (updates.description !== undefined) badge.description = updates.description
    
    badge.timestamp = new Date().toISOString()
    
    scheduleSave()
    
    return { success: true, badge }
  } catch (error) {
    console.error('Error updating badge:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if user is eligible for a badge based on date's data
 */
export function checkBadgeEligibility(date) {
  try {
    const earnedBadges = []
    const dayXP = getXPForDate(date)
    const entries = loadEntries().find(e => e.date.toISOString().split('T')[0] === date)
    
    // Check PRODUCTIVITY_BEAST (200+ XP in a day)
    if (dayXP >= 200) {
      const badge = awardBadge('PRODUCTIVITY_BEAST', date)
      if (badge) earnedBadges.push(badge)
    }

    // Check TASK_MASTER (10 completed tasks)
    if (entries) {
      const completedTasks = entries.lines.filter(l => 
        (l.type === 'checkbox' || l.type === 'checkbox-time') && l.checked
      ).length
      
      if (completedTasks >= 10) {
        const badge = awardBadge('TASK_MASTER', date)
        if (badge) earnedBadges.push(badge)
      }
    }

    return earnedBadges
  } catch (error) {
    console.error('Error checking badge eligibility:', error)
    return []
  }
}

// ============= MEDAL SYSTEM =============

/**
 * Award a medal for monthly XP milestone
 */
export function awardMedal(tier, year, month) {
  try {
    if (!dataCache.medals) {
      dataCache.medals = []
    }

    // Check if medal already earned for this month
    const existing = dataCache.medals.find(m => m.tier === tier && m.year === year && m.month === month)
    if (existing) {
      return null
    }

    const medalInfo = MEDAL_TIERS[tier]
    if (!medalInfo) {
      console.error('Unknown medal tier:', tier)
      return null
    }

    const medal = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      tier,
      name: medalInfo.name,
      icon: medalInfo.icon,
      threshold: medalInfo.threshold,
      description: medalInfo.description || '',
      year,
      month,
      timestamp: new Date().toISOString()
    }

    dataCache.medals.push(medal)
    scheduleSave()
    return medal
  } catch (error) {
    console.error('Error awarding medal:', error)
    return null
  }
}

/**
 * Create a custom medal
 */
export function createCustomMedal(medalData, year, month) {
  try {
    if (!dataCache.medals) {
      dataCache.medals = []
    }

    const medal = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      tier: 'CUSTOM',
      name: medalData.name,
      icon: medalData.icon,
      threshold: medalData.threshold,
      description: medalData.description || '',
      year,
      month,
      timestamp: new Date().toISOString()
    }

    dataCache.medals.push(medal)
    scheduleSave()
    return medal
  } catch (error) {
    console.error('Error creating custom medal:', error)
    return null
  }
}

/**
 * Get medal for specific month
 */
export function getMedalForMonth(year, month) {
  try {
    if (!dataCache.medals) return null
    
    // Get all medals for this month and return the highest tier
    const monthMedals = dataCache.medals.filter(m => m.year === year && m.month === month)
    if (monthMedals.length === 0) return null
    
    // Sort by threshold descending to get highest tier
    monthMedals.sort((a, b) => b.threshold - a.threshold)
    return monthMedals[0]
  } catch (error) {
    console.error('Error getting medal for month:', error)
    return null
  }
}

/**
 * Get all medals
 */
export function getAllMedals() {
  try {
    if (!dataCache.medals) return []
    return dataCache.medals.sort((a, b) => {
      // Sort by year, then month, then threshold (descending)
      if (a.year !== b.year) return b.year - a.year
      if (a.month !== b.month) return b.month - a.month
      return b.threshold - a.threshold
    })
  } catch (error) {
    console.error('Error getting all medals:', error)
    return []
  }
}

/**
 * Delete a medal
 */
export function deleteMedal(medalId) {
  try {
    if (!dataCache.medals) return { success: false, error: 'No medals found' }
    
    const medalIndex = dataCache.medals.findIndex(m => m.id === medalId)
    if (medalIndex === -1) {
      return { success: false, error: 'Medal not found' }
    }
    
    // Remove the medal
    dataCache.medals.splice(medalIndex, 1)
    scheduleSave()
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting medal:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a medal's month/year
 */
export function updateMedal(medalId, updates) {
  try {
    if (!dataCache.medals) return { success: false, error: 'No medals found' }
    
    const medal = dataCache.medals.find(m => m.id === medalId)
    if (!medal) {
      return { success: false, error: 'Medal not found' }
    }
    
    // Update properties
    if (updates.icon !== undefined) medal.icon = updates.icon
    if (updates.name !== undefined) medal.name = updates.name
    if (updates.threshold !== undefined) medal.threshold = updates.threshold
    if (updates.description !== undefined) medal.description = updates.description
    
    medal.timestamp = new Date().toISOString()
    
    scheduleSave()
    
    return { success: true, medal }
  } catch (error) {
    console.error('Error updating medal:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check and award medal based on monthly XP
 */
export function checkMonthlyMedals(year, month) {
  try {
    const monthlyData = getXPForMonth(year, month)
    const totalXP = monthlyData.reduce((sum, day) => sum + day.total, 0)

    let awardedMedal = null
    
    // Check from highest to lowest tier
    const tiers = ['LEGEND', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE']
    for (const tier of tiers) {
      if (totalXP >= MEDAL_TIERS[tier].threshold) {
        awardedMedal = awardMedal(tier, year, month)
        break
      }
    }

    return awardedMedal
  } catch (error) {
    console.error('Error checking monthly medals:', error)
    return null
  }
}

