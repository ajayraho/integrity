// Storage keys
const ENTRIES_KEY = 'integrity_journal_entries'
const TEMPLATES_KEY = 'integrity_templates'
const SETTINGS_KEY = 'integrity_settings'

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
}
