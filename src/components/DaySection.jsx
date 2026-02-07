import { useState, useRef, useEffect } from 'react'
import EditableLine from './EditableLine'
import DateHeader from './DateHeader'
import HabitsSection from './HabitsSection'

function DaySection({ day, onUpdate, isFirst }) {
    const sectionRef = useRef(null)
    const [lines, setLines] = useState(day.lines)

    useEffect(() => {
        setLines(day.lines)
    }, [day.lines])

    const formatDate = (date) => {
        const d = new Date(date)
        const day = d.getDate()
        const suffix = ['th', 'st', 'nd', 'rd']
        const v = day % 100
        const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0]

        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/\d+/, day + ordinal)
    }

    const addLine = (afterIndex) => {
        const newLine = {
            id: `${day.id}-${Date.now()}`,
            content: '',
            type: 'text'
        }
        const newLines = [
            ...lines.slice(0, afterIndex + 1),
            newLine,
            ...lines.slice(afterIndex + 1)
        ]
        setLines(newLines)
        onUpdate(day.id, newLines)
        return newLine.id
    }

    const updateLine = (lineId, content, type) => {
        const newLines = lines.map(line =>
            line.id === lineId ? { ...line, content, type } : line
        )
        setLines(newLines)
        onUpdate(day.id, newLines, day.habits)
    }

    const deleteLine = (lineId) => {
        if (lines.length === 1) return // Keep at least one line
        const newLines = lines.filter(line => line.id !== lineId)
        setLines(newLines)
        onUpdate(day.id, newLines, day.habits)
    }

    const handleHabitsUpdate = (updatedHabits) => {
        onUpdate(day.id, lines, updatedHabits)
    }

    return (
        <div
            ref={sectionRef}
            className="day-section snap-start min-h-screen relative"
            style={{
                backgroundImage: `repeating-linear-gradient(
          transparent,
          transparent 31px,
          #D1E5F4 31px,
          #D1E5F4 32px
        )`,
                backgroundPosition: '0 104px',
                paddingTop: '16px'
            }}
        >
            <DateHeader
                date={formatDate(day.date)}
                dayId={day.id}
            />

            <div className="lines-container px-4 md:px-8 lg:px-16" style={{ paddingTop: '24px' }}>
                {lines.map((line, index) => (
                    <EditableLine
                        key={line.id}
                        line={line}
                        onUpdate={updateLine}
                        onEnter={() => addLine(index)}
                        onDelete={() => deleteLine(line.id)}
                        autoFocus={isFirst && index === 0}
                    />
                ))}
            </div>

            <HabitsSection
                dayId={day.id}
                habits={day.habits || {}}
                onUpdate={handleHabitsUpdate}
            />
        </div>
    )
}

export default DaySection
