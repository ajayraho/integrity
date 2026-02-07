import { useState, useEffect } from 'react'
import { loadEntries, saveEntries } from '../utils/storage'

function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 8)) // Feb 8, 2026
    const [entries, setEntries] = useState([])
    const [selectedDay, setSelectedDay] = useState(null)

    useEffect(() => {
        setEntries(loadEntries())
    }, [])

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        return { daysInMonth, startingDayOfWeek, year, month }
    }

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

    const getEntryForDate = (day) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0]
        return entries.find(entry => entry.id === dateStr)
    }

    const hasContent = (day) => {
        const entry = getEntryForDate(day)
        if (!entry) return false
        return entry.lines.some(line => line.content.trim() !== '') ||
            Object.keys(entry.habits || {}).length > 0
    }

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
        setSelectedDay(null)
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
        setSelectedDay(null)
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const isToday = (day) => {
        const today = new Date(2026, 1, 8) // Feb 8, 2026
        return day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
    }

    const selectedEntry = selectedDay ? getEntryForDate(selectedDay) : null

    return (
        <div className="calendar-view h-screen overflow-auto bg-paper p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border-2 border-line rounded-lg shadow-lg p-6">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    onClick={previousMonth}
                                    className="p-2 hover:bg-line/30 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-2xl font-bold text-ink">
                                    {monthNames[month]} {year}
                                </h2>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-line/30 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Day Names */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {dayNames.map(day => (
                                    <div key={day} className="text-center font-semibold text-ink/60 text-sm py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-2">
                                {/* Empty cells for days before month starts */}
                                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square" />
                                ))}

                                {/* Actual days */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1
                                    const today = isToday(day)
                                    const hasData = hasContent(day)
                                    const isSelected = selectedDay === day

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`
                                                aspect-square rounded-lg border-2 transition-all
                                                flex flex-col items-center justify-center
                                                hover:border-ink hover:shadow-md
                                                ${isSelected ? 'border-ink bg-ink text-white' : 'border-line bg-white'}
                                                ${today && !isSelected ? 'border-ink/50 bg-ink/5' : ''}
                                            `}
                                        >
                                            <span className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-ink'}`}>
                                                {day}
                                            </span>
                                            {hasData && (
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-ink'}`} />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Day Preview */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border-2 border-line rounded-lg shadow-lg p-6 sticky top-4">
                            {selectedDay ? (
                                <>
                                    <h3 className="text-xl font-bold text-ink mb-4">
                                        {monthNames[month]} {selectedDay}, {year}
                                    </h3>
                                    {selectedEntry ? (
                                        <div className="space-y-4">
                                            {selectedEntry.lines.filter(line => line.content.trim() !== '').length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-ink/60 mb-2">Notes:</h4>
                                                    <div className="space-y-2">
                                                        {selectedEntry.lines
                                                            .filter(line => line.content.trim() !== '')
                                                            .map(line => (
                                                                <div key={line.id} className="text-ink text-sm pl-3 border-l-2 border-line">
                                                                    {line.content}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(selectedEntry.habits || {}).length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-ink/60 mb-2">Habits:</h4>
                                                    <div className="space-y-1 text-sm text-ink">
                                                        {Object.entries(selectedEntry.habits).map(([habitId, value]) => (
                                                            <div key={habitId} className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                                                <span>{value === true ? '✓' : value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedEntry.lines.filter(line => line.content.trim() !== '').length === 0 &&
                                                Object.keys(selectedEntry.habits || {}).length === 0 && (
                                                    <p className="text-gray-400 text-sm">No content for this day</p>
                                                )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm">No content for this day</p>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Select a day to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CalendarView
