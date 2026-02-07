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
        <div className="habits-section mt-8 mb-8 px-4 md:px-8 lg:px-16">
            <div className="border-2 border-line rounded-lg bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-6 flex-wrap">
                    {allHabits.map(habit => (
                        <div
                            key={habit.id}
                            className="habit-item flex items-center gap-2"
                        >
                            {renderHabitInput(habit)}
                            <span className="flex items-center gap-1 text-ink font-medium whitespace-nowrap" style={{ fontSize: '17px' }}>
                                <span className="text-xl" style={{ color: habit.color }}>
                                    {habit.icon}
                                </span>
                                {habit.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default HabitsSection
