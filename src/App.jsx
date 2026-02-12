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
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('continuous')
  const [showHabitManagement, setShowHabitManagement] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('isAuthenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    // Initialize PWA notifications
    if (isAuthenticated) {
      initializeNotifications()
    }
  }, [isAuthenticated])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('username')
    setIsAuthenticated(false)
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
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
