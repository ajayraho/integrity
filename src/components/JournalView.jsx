import { useState, useEffect, useRef, useCallback } from 'react'
import DaySection from './DaySection'
import { loadEntries, saveEntries } from '../utils/storage'

function JournalView({ viewType }) {
    const [days, setDays] = useState([])
    const topSentinelRef = useRef(null)
    const bottomSentinelRef = useRef(null)
    const containerRef = useRef(null)

    // Create a day object
    const createDay = useCallback((date) => ({
        id: date.toISOString().split('T')[0],
        date: date,
        lines: [{ id: `${date.toISOString()}-1`, content: '', type: 'text' }],
        habits: {}
    }), [])

    useEffect(() => {
        // Load entries from storage
        const savedEntries = loadEntries()
        if (savedEntries.length > 0) {
            setDays(savedEntries)
        } else {
            // Initialize with today and a few recent days
            const today = new Date()
            const initialDays = []
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today)
                date.setDate(date.getDate() - i)
                initialDays.push(createDay(date))
            }
            setDays(initialDays)
        }
    }, [createDay])

    // Load more past days
    const loadPastDays = useCallback(() => {
        if (days.length === 0) return
        
        const oldestDay = days[0]
        const newDays = []
        
        for (let i = 1; i <= 7; i++) {
            const date = new Date(oldestDay.date)
            date.setDate(date.getDate() - i)
            newDays.unshift(createDay(date))
        }
        
        setDays(prev => [...newDays, ...prev])
    }, [days, createDay])

    // Load more future days
    const loadFutureDays = useCallback(() => {
        if (days.length === 0) return
        
        const newestDay = days[days.length - 1]
        const newDays = []
        
        for (let i = 1; i <= 7; i++) {
            const date = new Date(newestDay.date)
            date.setDate(date.getDate() + i)
            newDays.push(createDay(date))
        }
        
        setDays(prev => [...prev, ...newDays])
    }, [days, createDay])

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
