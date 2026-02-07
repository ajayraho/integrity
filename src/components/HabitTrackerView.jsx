import { useState, useEffect } from 'react'
import { loadHabits } from '../utils/storage'
import { loadEntries } from '../utils/storage'

function HabitTrackerView() {
    const [habits, setHabits] = useState([])
    const [entries, setEntries] = useState([])
    const [visibleDays, setVisibleDays] = useState(14) // Show 2 weeks by default

    useEffect(() => {
        setHabits(loadHabits().sort((a, b) => a.order - b.order))

        // Generate the last N days from today
        const allEntries = loadEntries()
        const today = new Date(2026, 1, 8) // Feb 8, 2026 (month is 0-indexed)
        const entryMap = new Map(allEntries.map(entry => [entry.id, entry]))

        const daysArray = []
        for (let i = 0; i < 90; i++) { // Generate up to 90 days
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dayId = date.toISOString().split('T')[0]

            // Use existing entry or create placeholder
            const entry = entryMap.get(dayId) || {
                id: dayId,
                date: date,
                lines: [],
                habits: {}
            }
            daysArray.push(entry)
        }

        setEntries(daysArray)
    }, [])

    const formatDate = (date) => {
        const d = new Date(date)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const getHabitValue = (entry, habitId) => {
        if (!entry.habits) return null
        const value = entry.habits[habitId]

        if (value === true || value === 'true') return '✓'
        if (value === false || value === '' || value === null || value === undefined) return ''
        return value
    }

    const getCellColor = (value, habit) => {
        if (!value || value === '') return 'bg-gray-50'
        if (value === '✓') return 'bg-green-100'
        return 'bg-blue-50'
    }

    if (habits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-gray-500 p-8">
                <p className="text-xl font-semibold mb-4">No Habits Yet</p>
                <p className="text-center">Create some habits to start tracking them!</p>
            </div>
        )
    }

    const displayedEntries = entries.slice(0, visibleDays)

    return (
        <div className="habit-tracker-view h-screen overflow-auto bg-paper p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-ink">Habit Tracker</h1>
                    <select
                        value={visibleDays}
                        onChange={(e) => setVisibleDays(Number(e.target.value))}
                        className="px-4 py-2 border-2 border-line rounded-lg bg-white text-ink font-medium"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>

                <div className="bg-white border-2 border-line rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-ink text-white">
                                    <th className="sticky left-0 z-20 bg-ink px-4 py-3 text-left font-semibold min-w-[120px]">
                                        Date
                                    </th>
                                    {habits.map(habit => (
                                        <th
                                            key={habit.id}
                                            className="px-4 py-3 text-center font-semibold min-w-[100px] border-l border-white/20"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-2xl">{habit.icon}</span>
                                                <span className="text-sm">{habit.name}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedEntries.map((entry, index) => (
                                    <tr
                                        key={entry.id}
                                        className={`border-b border-line hover:bg-line/10 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                            }`}
                                    >
                                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 font-semibold text-ink border-r border-line">
                                            {formatDate(entry.date)}
                                        </td>
                                        {habits.map(habit => {
                                            const value = getHabitValue(entry, habit.id)
                                            return (
                                                <td
                                                    key={habit.id}
                                                    className={`px-4 py-3 text-center border-l border-line/30 ${getCellColor(value, habit)}`}
                                                >
                                                    <span className="font-medium text-ink">
                                                        {value}
                                                    </span>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {habits.map(habit => {
                        let completed = 0
                        let total = displayedEntries.length

                        displayedEntries.forEach(entry => {
                            const value = getHabitValue(entry, habit.id)
                            if (value && value !== '') completed++
                        })

                        const percentage = total > 0 ? ((completed / total) * 100).toFixed(0) : 0

                        return (
                            <div
                                key={habit.id}
                                className="bg-white border-2 border-line rounded-lg p-4 shadow"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{habit.icon}</span>
                                    <span className="font-semibold text-ink">{habit.name}</span>
                                </div>
                                <div className="text-3xl font-bold text-ink mb-1">{percentage}%</div>
                                <div className="text-sm text-gray-600">
                                    {completed} of {total} days
                                </div>
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default HabitTrackerView
