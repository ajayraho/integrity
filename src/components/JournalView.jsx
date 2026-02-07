import { useState, useEffect } from 'react'
import DaySection from './DaySection'
import { loadEntries, saveEntries } from '../utils/storage'

function JournalView({ viewType }) {
    const [days, setDays] = useState([])

    useEffect(() => {
        // Load entries from storage
        const savedEntries = loadEntries()
        if (savedEntries.length > 0) {
            setDays(savedEntries)
        } else {
            // Initialize with today and a few recent days
            const today = new Date()
            const initialDays = []
            for (let i = 0; i < 7; i++) {
                const date = new Date(today)
                date.setDate(date.getDate() - i)
                initialDays.push({
                    id: date.toISOString().split('T')[0],
                    date: date,
                    lines: [{ id: `${date.toISOString()}-1`, content: '', type: 'text' }]
                })
            }
            setDays(initialDays)
        }
    }, [])

    useEffect(() => {
        // Auto-save whenever days change
        if (days.length > 0) {
            saveEntries(days)
        }
    }, [days])

    const updateDay = (dayId, updatedLines) => {
        setDays(prevDays =>
            prevDays.map(day =>
                day.id === dayId ? { ...day, lines: updatedLines } : day
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
        <div className="journal-view scroll-smooth snap-y snap-mandatory h-screen overflow-y-scroll">
            {days.map((day, index) => (
                <DaySection
                    key={day.id}
                    day={day}
                    onUpdate={updateDay}
                    isFirst={index === 0}
                />
            ))}
        </div>
    )
}

export default JournalView
