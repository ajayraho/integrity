import { useState } from 'react'
import { getAllDays, dayHasContent, loadHabits } from '../utils/storage'
import { useStoreVersion } from '../hooks/useStore'
import { fromDateId, toDateId, todayId } from '../utils/date'

function TimelineView({ onOpenDay }) {
    useStoreVersion()
    const [filter, setFilter] = useState('all') // all, week, month, year
    const habitsById = new Map(loadHabits().map(h => [h.id, h]))
    const today = todayId()
    // Newest first; future days only show if something was written there
    const entries = getAllDays()
        .map(d => ({ ...d, date: fromDateId(d.id) }))
        .sort((a, b) => b.id.localeCompare(a.id))

    const getFilteredEntries = () => {
        const today = new Date()

        switch (filter) {
            case 'week': {
                const weekAgo = new Date(today)
                weekAgo.setDate(today.getDate() - 7)
                return entries.filter(entry => entry.id >= toDateId(weekAgo))
            }
            case 'month': {
                const monthAgo = new Date(today)
                monthAgo.setMonth(today.getMonth() - 1)
                return entries.filter(entry => entry.id >= toDateId(monthAgo))
            }
            case 'year': {
                const yearAgo = new Date(today)
                yearAgo.setFullYear(today.getFullYear() - 1)
                return entries.filter(entry => entry.id >= toDateId(yearAgo))
            }
            default:
                return entries
        }
    }

    const formatDate = (date) => {
        const d = new Date(date)
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getRelativeTime = (date) => {
        const diffDays = Math.round((fromDateId(today) - new Date(date)) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return diffDays === -1 ? 'Tomorrow' : `In ${-diffDays} days`
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
        return `${Math.floor(diffDays / 365)} years ago`
    }

    const hasContent = dayHasContent

    const filteredEntries = getFilteredEntries().filter(hasContent)

    return (
        <div className="timeline-view h-screen overflow-auto bg-paper p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
                    <h1 className="text-3xl font-bold text-ink">Timeline</h1>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'week', 'month', 'year'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${filter === f
                                        ? 'bg-ink text-white border-ink'
                                        : 'bg-white text-ink border-line hover:border-ink'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                {filteredEntries.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-400 text-lg">No entries to display</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-line" />

                        <div className="space-y-8">
                            {filteredEntries.map((entry) => (
                                <div key={entry.id} className="relative pl-20">
                                    {/* Timeline Dot */}
                                    <div className="absolute left-6 top-6 w-5 h-5 rounded-full bg-ink border-4 border-paper" />

                                    {/* Entry Card */}
                                    <div
                                        className="bg-white border-2 border-line rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer"
                                        onClick={() => onOpenDay?.(entry.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-ink">
                                                    {formatDate(entry.date)}
                                                </h3>
                                                <p className="text-sm text-ink/60">{getRelativeTime(entry.date)}</p>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        {entry.lines.filter(line => (line.content || '').trim() !== '').length > 0 && (
                                            <div className="mb-4">
                                                <div className="space-y-2">
                                                    {entry.lines
                                                        .filter(line => (line.content || '').trim() !== '')
                                                        .slice(0, 3)
                                                        .map(line => (
                                                            <div
                                                                key={line.id}
                                                                className="flex items-start gap-2 text-ink"
                                                            >
                                                                {(line.type === 'checkbox' || line.type === 'checkbox-time') && (
                                                                    <span className="text-lg">{line.checked ? '☑' : '☐'}</span>
                                                                )}
                                                                {line.type === 'radio' && (
                                                                    <span className="text-lg">○</span>
                                                                )}
                                                                <span className="flex-1">{line.content}</span>
                                                            </div>
                                                        ))}
                                                    {entry.lines.filter(line => (line.content || '').trim() !== '').length > 3 && (
                                                        <p className="text-sm text-ink/60 italic">
                                                            +{entry.lines.filter(line => (line.content || '').trim() !== '').length - 3} more lines
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Habits */}
                                        {Object.keys(entry.habits || {}).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {Object.entries(entry.habits).map(([habitId, value]) => {
                                                    if (value === '' || value === false || value == null) return null
                                                    const habit = habitsById.get(habitId)
                                                    return (
                                                        <div
                                                            key={habitId}
                                                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1"
                                                        >
                                                            <span>{habit?.icon || '✓'}</span>
                                                            <span>{habit?.name || 'Habit'}{value === true || value === 'true' ? '' : `: ${value}`}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TimelineView
