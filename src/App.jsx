import { useState, useEffect } from 'react'
import JournalView from './components/JournalView'
import HabitTrackerView from './components/HabitTrackerView'
import CalendarView from './components/CalendarView'
import TimelineView from './components/TimelineView'
import GridView from './components/GridView'
import HabitManagement from './components/HabitManagement'
import NavigationButton from './components/NavigationButton'
import Login from './components/Login'
import { initializeNotifications } from './utils/notifications'
import { initSession, clearSession } from './utils/database'
import { initializeStorage } from './utils/storage'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('continuous')
  const [showHabitManagement, setShowHabitManagement] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('isAuthenticated')
    const username = localStorage.getItem('username')
    const password = localStorage.getItem('userPassword')

    if (authStatus === 'true' && username && password) {
      // Re-initialize session
      initSession(username, password)
      initializeStorage().then((result) => {
        if (result.success) {
          setIsAuthenticated(true)
        } else {
          setLoadError('Failed to load data. Please login again.')
          localStorage.clear()
        }
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initialize PWA notifications
    if (isAuthenticated) {
      initializeNotifications()
    }
  }, [isAuthenticated])

  const handleLogin = async (username, password) => {
    setIsLoading(true)
    try {
      // Initialize storage with user data
      const result = await initializeStorage()
      if (result.success) {
        // Store password temporarily (in production, use more secure method)
        localStorage.setItem('userPassword', password)
        setIsAuthenticated(true)
        setLoadError('')
      } else {
        setLoadError('Failed to load user data')
      }
    } catch (error) {
      setLoadError('Error loading data: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    localStorage.clear()
    setIsAuthenticated(false)
  }

  // Show loading screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📔</div>
          <div className="text-ink font-medium">Loading your data...</div>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        {loadError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border-2 border-red-300 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50">
            {loadError}
          </div>
        )}
      </>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'habit-tracker':
        return <HabitTrackerView />
      case 'continuous':
        return <JournalView viewType={currentView} />
      case 'calendar':
        return <CalendarView />
      case 'timeline':
        return <TimelineView />
      case 'grid':
        return <GridView />
      default:
        return (
          <div className="flex items-center justify-center h-screen text-gray-500">
            <p className="text-lg">This view is coming soon...</p>
          </div>
        )
    }
  }

  return (
    <div className="app min-h-screen bg-paper">
      {renderView()}

      <NavigationButton
        currentView={currentView}
        onViewChange={setCurrentView}
        onManageHabits={() => setShowHabitManagement(true)}
        onLogout={handleLogout}
      />

      {showHabitManagement && (
        <HabitManagement onClose={() => setShowHabitManagement(false)} />
      )}
    </div>
  )
}

export default App
