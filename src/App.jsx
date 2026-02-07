import { useState } from 'react'
import JournalView from './components/JournalView'
import NavigationButton from './components/NavigationButton'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('continuous')

  return (
    <div className="app min-h-screen bg-paper">
      <JournalView viewType={currentView} />
      <NavigationButton
        currentView={currentView}
        onViewChange={setCurrentView}
      />
    </div>
  )
}

export default App
