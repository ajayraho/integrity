import { useState, useEffect } from 'react'
import { loadEntries } from '../utils/storage'

function GridView() {
    const [entries, setEntries] = useState([])
    const [viewMode, setViewMode] = useState('week') // week, month
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 8)) // Feb 8, 2026

    useEffect(() => {
        const allEntries = loadEntries()
        setEntries(allEntries)
    }, [])

    const getWeekDays = (date) => {
        const days = []
        const current = new Date(date)
        const dayOfWeek = current.getDay()

        // Start from Sunday
        current.setDate(current.getDate() - dayOfWeek)

        for (let i = 0; i < 7; i++) {
            days.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }

        return days
    }

    const getMonthDays = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startingDayOfWeek = firstDay.getDay()
        const daysInMonth = lastDay.getDate()

        const days = []

        // Add empty days for alignment
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }

        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i))
        }

        return days
    }

    const getEntryForDate = (date) => {
        if (!date) return null
        const dateStr = date.toISOString().split('T')[0]
        return entries.find(entry => entry.id === dateStr)
    }

    const hasContent = (entry) => {
        if (!entry) return false
        return entry.lines.some(line => line.content.trim() !== '') ||
            Object.keys(entry.habits || {}).length > 0
    }

    const previousPeriod = () => {
        const newDate = new Date(currentDate)
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7)
        } else {
            newDate.setMonth(newDate.getMonth() - 1)
        }
        setCurrentDate(newDate)
    }

    const nextPeriod = () => {
        const newDate = new Date(currentDate)
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7)
        } else {
            newDate.setMonth(newDate.getMonth() + 1)
        }
        setCurrentDate(newDate)
    }

    const days = viewMode === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const formatPeriod = () => {
        if (viewMode === 'week') {
            const start = days[0]
            const end = days[6]
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        } else {
            return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
    }

    const isToday = (date) => {
        if (!date) return false
        const today = new Date(2026, 1, 8) // Feb 8, 2026
        return date.toDateString() === today.toDateString()
    }

    return (
        <div className="grid-view h-screen overflow-auto bg-paper p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-ink">Grid View</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${viewMode === 'week'
                                        ? 'bg-ink text-white border-ink'
                                        : 'bg-white text-ink border-line hover:border-ink'
                                    }`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${viewMode === 'month'
                                        ? 'bg-ink text-white border-ink'
                                        : 'bg-white text-ink border-line hover:border-ink'
                                    }`}
                            >
                                Month
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={previousPeriod}
                        className="p-2 hover:bg-line/30 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold text-ink">{formatPeriod()}</h2>
                    <button
                        onClick={nextPeriod}
                        className="p-2 hover:bg-line/30 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Grid */}
                <div className="bg-white border-2 border-line rounded-lg shadow-lg p-4">
                    <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-3`}>
                        {/* Day names */}
                        {dayNames.map(day => (
                            <div key={day} className="text-center font-semibold text-ink/60 text-sm py-2">
                                {day}
                            </div>
                        ))}

                        {/* Day cells */}
                        {days.map((date, index) => {
                            const entry = getEntryForDate(date)
                            const hasData = hasContent(entry)
                            const today = isToday(date)

                            if (!date) {
                                return <div key={`empty-${index}`} className="aspect-square" />
                            }

                            return (
                                <div
                                    key={date.toISOString()}
                                    className={`
                                        border-2 rounded-lg p-3 transition-all
                                        ${today ? 'border-ink bg-ink/5' : 'border-line'}
                                        ${hasData ? 'bg-white hover:shadow-md' : 'bg-gray-50'}
                                    `}
                                    style={{ minHeight: viewMode === 'week' ? '200px' : '120px' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-lg font-bold ${today ? 'text-ink' : 'text-ink/70'}`}>
                                            {date.getDate()}
                                        </span>
                                        {hasData && (
                                            <div className="w-2 h-2 rounded-full bg-ink" />
                                        )}
                                    </div>

                                    {entry && hasData && (
                                        <div className="space-y-1 text-xs text-ink/70 overflow-hidden">
                                            {entry.lines
                                                .filter(line => line.content.trim() !== '')
                                                .slice(0, viewMode === 'week' ? 4 : 2)
                                                .map(line => (
                                                    <div
                                                        key={line.id}
                                                        className="truncate flex items-start gap-1"
                                                    >
                                                        {line.type === 'checkbox' && <span>☐</span>}
                                                        {line.type === 'radio' && <span>○</span>}
                                                        <span className="flex-1 truncate">{line.content}</span>
                                                    </div>
                                                ))}
                                            {entry.lines.filter(line => line.content.trim() !== '').length > (viewMode === 'week' ? 4 : 2) && (
                                                <div className="text-ink/50 italic">
                                                    +{entry.lines.filter(line => line.content.trim() !== '').length - (viewMode === 'week' ? 4 : 2)} more
                                                </div>
                                            )}
                                            {Object.keys(entry.habits || {}).filter(k => entry.habits[k]).length > 0 && (
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    {Object.keys(entry.habits || {})
                                                        .filter(k => entry.habits[k])
                                                        .slice(0, 3)
                                                        .map(k => (
                                                            <div key={k} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GridView
