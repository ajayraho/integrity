import { useState, useEffect } from 'react'
import { loadHabits } from '../utils/storage'

function HabitsSection({ dayId, habits, onUpdate }) {
  const [allHabits, setAllHabits] = useState([])
  const [dayHabits, setDayHabits] = useState(habits || {})

  useEffect(() => {
    // Load all defined habits
    const loaded = loadHabits()
    setAllHabits(loaded.sort((a, b) => a.order - b.order))
  }, [])

  useEffect(() => {
    setDayHabits(habits || {})
  }, [habits])

  const handleHabitChange = (habitId, value) => {
    const updated = { ...dayHabits, [habitId]: value }
    setDayHabits(updated)
    onUpdate(updated)
  }

  const renderHabitInput = (habit) => {
    const value = dayHabits[habit.id]

    switch (habit.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => handleHabitChange(habit.id, e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-ink"
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleHabitChange(habit.id, e.target.value)}
            placeholder="0"
            className="w-16 px-2 py-1 border border-line rounded text-center bg-transparent outline-none focus:border-ink"
            style={{ fontSize: '16px' }}
          />
        )
      
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleHabitChange(habit.id, e.target.value)}
            placeholder="..."
            className="w-32 px-2 py-1 border border-line rounded bg-transparent outline-none focus:border-ink"
            style={{ fontSize: '16px' }}
          />
        )
      
      default:
        return null
    }
  }

  if (allHabits.length === 0) {
    return null
  }

  return (
    <div className="habits-section mt-8 pt-6 border-t-2 border-line">
      <h3 className="text-lg font-semibold text-ink mb-4 px-4 md:px-8 lg:px-16">
        Daily Habits
      </h3>
      <div className="habits-grid px-4 md:px-8 lg:px-16 space-y-3">
        {allHabits.map(habit => (
          <div 
            key={habit.id}
            className="habit-item flex items-center gap-3 p-2 hover:bg-line/20 rounded-lg transition-colors"
          >
            <span className="text-2xl" style={{ color: habit.color }}>
              {habit.icon}
            </span>
            <span className="flex-1 text-ink font-medium" style={{ fontSize: '17px' }}>
              {habit.name}
            </span>
            {renderHabitInput(habit)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HabitsSection
