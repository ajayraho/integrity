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
        if (lines.length === 1) return null // Keep at least one line

        const lineIndex = lines.findIndex(line => line.id === lineId)
        const newLines = lines.filter(line => line.id !== lineId)
        setLines(newLines)
        onUpdate(day.id, newLines, day.habits)

        // Return the previous line's ID if it exists, otherwise return the next line (which becomes the new line at this position)
        if (lineIndex > 0) {
            return lines[lineIndex - 1].id
        } else if (newLines.length > 0) {
            // If deleting the first line, return the ID of what will become the new first line
            return newLines[0].id
        }
        return null
    }

    const handleHabitsUpdate = (updatedHabits) => {
        onUpdate(day.id, lines, updatedHabits)
    }

    const applyTemplate = (template) => {
        console.log('applyTemplate called with:', template)
        if (template && template.lines) {
            // Create new lines from template with unique IDs
            const newLines = template.lines.map((templateLine, index) => ({
                id: `${day.id}-${Date.now()}-${index}`,
                type: templateLine.type || 'text',
                content: templateLine.content || ''
            }))

            console.log('Applying new lines:', newLines)
            setLines(newLines)
            onUpdate(day.id, newLines, day.habits)
        } else {
            console.log('Template is invalid or has no lines')
        }
    }

    return (
        <div
            ref={sectionRef}
            data-day-id={day.id}
            className="day-section snap-start min-h-screen relative pb-16"
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
                dayDate={day.date}
                lines={lines}
                onApplyTemplate={applyTemplate}
            />

            <div className="lines-container px-4 md:px-8 lg:px-16" style={{ paddingTop: '24px' }}>
                {lines.map((line, index) => (
                    <EditableLine
                        key={`${line.id}-${line.type}`}
                        line={line}
                        dayId={day.id}
                        onUpdate={updateLine}
                        onEnter={() => addLine(index)}
                        onDelete={() => {
                            const prevLineId = deleteLine(line.id)
                            if (prevLineId) {
                                // Focus the previous/next line
                                setTimeout(() => {
                                    const targetLine = document.querySelector(`[data-line-id="${prevLineId}"]`)
                                    if (targetLine) {
                                        targetLine.focus()
                                        // Move cursor to end if it was a previous line (normal delete)
                                        // Move cursor to start if it's the new first line (deleted first line)
                                        const range = document.createRange()
                                        const selection = window.getSelection()
                                        range.selectNodeContents(targetLine)
                                        // If this was the first line (index 0), cursor at start, otherwise at end
                                        range.collapse(index === 0 ? true : false)
                                        selection.removeAllRanges()
                                        selection.addRange(range)
                                    }
                                }, 0)
                            }
                        }}
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
