import { useState, useEffect, useRef, useCallback } from 'react'
import DaySection from './DaySection'
import { loadEntries, saveEntries, getDefaultTemplate } from '../utils/storage'

function JournalView({ viewType }) {
    const [days, setDays] = useState([])
    const topSentinelRef = useRef(null)
    const bottomSentinelRef = useRef(null)
    const containerRef = useRef(null)
    const loadingRef = useRef({ top: false, bottom: false })
    const hasScrolledToToday = useRef(false)

    // Create a day object
    const createDay = useCallback((date) => {
        const dateId = date.toISOString().split('T')[0]

        // Check if there's a default template
        const defaultTemplate = getDefaultTemplate()

        let lines
        if (defaultTemplate && defaultTemplate.lines && defaultTemplate.lines.length > 0) {
            // Use template lines with unique IDs
            lines = defaultTemplate.lines.map((templateLine, index) => ({
                id: `${dateId}-${Date.now()}-${index}`,
                type: templateLine.type || 'text',
                content: templateLine.content || ''
            }))
        } else {
            // Default single empty line
            lines = [{ id: `${date.toISOString()}-1`, content: '', type: 'text' }]
        }

        return {
            id: dateId,
            date: new Date(date),
            lines: lines,
            habits: {}
        }
    }, [])

    useEffect(() => {
        // Load saved entries to check for existing content
        const savedEntries = loadEntries()
        const savedMap = new Map(savedEntries.map(entry => [entry.id, entry]))

        // Start with just today
        const today = new Date()
        const todayId = today.toISOString().split('T')[0]

        // Check if today has saved content, otherwise create new
        const todayEntry = savedMap.get(todayId) || createDay(today)

        setDays([todayEntry])

        // Mark that we've already positioned at today
        hasScrolledToToday.current = true
    }, [createDay])

    // Load more past days
    const loadPastDays = useCallback(() => {
        if (loadingRef.current.top) return
        loadingRef.current.top = true

        setDays(prevDays => {
            if (prevDays.length === 0) {
                loadingRef.current.top = false
                return prevDays
            }

            const oldestDay = prevDays[0]
            const oldestDate = new Date(oldestDay.date)
            const newDays = []
            const existingIds = new Set(prevDays.map(d => d.id))

            // Load saved entries to check for existing content
            const savedEntries = loadEntries()
            const savedMap = new Map(savedEntries.map(entry => [entry.id, entry]))

            for (let i = 1; i <= 7; i++) {
                const date = new Date(oldestDate)
                date.setDate(oldestDate.getDate() - i)
                const dayId = date.toISOString().split('T')[0]

                if (!existingIds.has(dayId)) {
                    // Check if this day has saved content
                    const savedDay = savedMap.get(dayId)
                    if (savedDay) {
                        newDays.unshift(savedDay)
                    } else {
                        newDays.unshift(createDay(date))
                    }
                }
            }

            loadingRef.current.top = false
            return [...newDays, ...prevDays]
        })
    }, [createDay])

    // Load more future days
    const loadFutureDays = useCallback(() => {
        if (loadingRef.current.bottom) return
        loadingRef.current.bottom = true

        setDays(prevDays => {
            if (prevDays.length === 0) {
                loadingRef.current.bottom = false
                return prevDays
            }

            const newestDay = prevDays[prevDays.length - 1]
            const newestDate = new Date(newestDay.date)
            const newDays = []
            const existingIds = new Set(prevDays.map(d => d.id))

            // Load saved entries to check for existing content
            const savedEntries = loadEntries()
            const savedMap = new Map(savedEntries.map(entry => [entry.id, entry]))

            for (let i = 1; i <= 7; i++) {
                const date = new Date(newestDate)
                date.setDate(newestDate.getDate() + i)
                const dayId = date.toISOString().split('T')[0]

                if (!existingIds.has(dayId)) {
                    // Check if this day has saved content
                    const savedDay = savedMap.get(dayId)
                    if (savedDay) {
                        newDays.push(savedDay)
                    } else {
                        newDays.push(createDay(date))
                    }
                }
            }

            loadingRef.current.bottom = false
            return [...prevDays, ...newDays]
        })
    }, [createDay])

    // Intersection observer for infinite scroll
    useEffect(() => {
        const topObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadPastDays()
                }
            },
            { threshold: 0.1 }
        )

        const bottomObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadFutureDays()
                }
            },
            { threshold: 0.1 }
        )

        if (topSentinelRef.current) {
            topObserver.observe(topSentinelRef.current)
        }
        if (bottomSentinelRef.current) {
            bottomObserver.observe(bottomSentinelRef.current)
        }

        return () => {
            topObserver.disconnect()
            bottomObserver.disconnect()
        }
    }, [loadPastDays, loadFutureDays])

    useEffect(() => {
        // Auto-save whenever days change
        if (days.length > 0) {
            saveEntries(days)
        }
    }, [days])

    const updateDay = (dayId, updatedLines, habits) => {
        setDays(prevDays =>
            prevDays.map(day =>
                day.id === dayId ? { ...day, lines: updatedLines, habits: habits || day.habits } : day
            )
        )
    }

    if (viewType !== 'continuous') {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500">
                <p className="text-lg">Other views coming soon...</p>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="journal-view scroll-smooth snap-y snap-mandatory h-screen overflow-y-scroll"
        >
            {/* Top sentinel for loading past days */}
            <div ref={topSentinelRef} className="h-4" />

            {days.map((day, index) => (
                <DaySection
                    key={day.id}
                    day={day}
                    onUpdate={updateDay}
                    isFirst={index === 0}
                />
            ))}

            {/* Bottom sentinel for loading future days */}
            <div ref={bottomSentinelRef} className="h-4" />
        </div>
    )
}

export default JournalView
