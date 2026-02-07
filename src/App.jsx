import { useState } from 'react'
import JournalView from './components/JournalView'
import HabitTrackerView from './components/HabitTrackerView'
import HabitManagement from './components/HabitManagement'
import NavigationButton from './components/NavigationButton'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('continuous')
  const [showHabitManagement, setShowHabitManagement] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case 'habit-tracker':
        return <HabitTrackerView />
      case 'continuous':
        return <JournalView viewType={currentView} />
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
      />

      {showHabitManagement && (
        <HabitManagement onClose={() => setShowHabitManagement(false)} />
      )}
    </div>
  )
}

export default App
