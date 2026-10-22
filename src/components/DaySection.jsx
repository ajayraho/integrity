import { useState } from 'react'
import EditableLine from './EditableLine'
import { focusLine } from '../utils/focus'
import DateHeader from './DateHeader'
import HabitsSection from './HabitsSection'
import XPPromptModal from './XPPromptModal'
import { useStoreVersion } from '../hooks/useStore'
import { useFeedback } from '../hooks/useFeedback'
import { getDayOrDefault, saveDay, lineXP, getRemindersForLine, deleteRemindersForLine } from '../utils/storage'
import { insertAfter, patchLine, removeLine, selectRadio, linesFromTemplate, newLine } from '../utils/lineOps'
import { formatLongDate } from '../utils/date'

const RULED_BACKGROUND = {
    backgroundImage: `repeating-linear-gradient(
          transparent,
          transparent 31px,
          #D1E5F4 31px,
          #D1E5F4 32px
        )`,
    backgroundPosition: '0 104px',
    backgroundAttachment: 'local',
    backgroundSize: '100% auto',
    paddingTop: '16px',
}

function DaySection({ dayId, isToday, autoFocus }) {
    useStoreVersion() // re-render on any data change (local or from another device)
    const { celebrate } = useFeedback()
    const [xpPromptLine, setXpPromptLine] = useState(null)

    const day = getDayOrDefault(dayId)
    const lines = day.lines?.length ? day.lines : [{ id: `${dayId}-1`, type: 'text', content: '' }]

    const setLines = (newLines) => saveDay(dayId, { lines: newLines })

    // XP removed with these lines (if any were completed tasks)
    const xpOf = (ls) => ls.reduce((s, l) => s + lineXP(l), 0)

    const addLine = (index) => {
        const line = newLine()
        setLines(insertAfter(lines, index, line))
        focusLine(line.id)
    }

    const updateLine = (lineId, patch) => setLines(patchLine(lines, lineId, patch))

    const deleteLine = (index) => {
        if (lines.length === 1) return
        const line = lines[index]
        const lost = lineXP(line)
        setLines(removeLine(lines, line.id))
        deleteRemindersForLine(line.id)
        if (lost) celebrate(-lost, dayId)
        const target = index > 0 ? lines[index - 1] : lines[1]
        focusLine(target.id, index > 0)
    }

    const toggleCheck = (line, checked) => {
        if (checked) {
            setXpPromptLine(line)
        } else {
            const lost = lineXP(line)
            updateLine(line.id, { checked: false })
            if (lost) celebrate(-lost, dayId)
        }
    }

    const confirmXP = (xp) => {
        const line = xpPromptLine
        setXpPromptLine(null)
        if (!line) return
        updateLine(line.id, { checked: true, xp, completedAt: new Date().toISOString() })
        celebrate(xp, dayId)
    }

    const changeType = (line, type) => {
        const stillTask = type === 'checkbox' || type === 'checkbox-time'
        const lost = stillTask ? 0 : lineXP(line)
        updateLine(line.id, stillTask ? { type } : { type, checked: false })
        if (lost) celebrate(-lost, dayId)
    }

    const applyTemplate = (template) => {
        const lost = xpOf(lines)
        lines.forEach(l => deleteRemindersForLine(l.id))
        setLines(linesFromTemplate(template))
        if (lost) celebrate(-lost, dayId)
    }

    return (
        <div
            data-day-id={dayId}
            className="day-section snap-start min-h-screen relative pb-16"
            style={RULED_BACKGROUND}
        >
            <DateHeader
                date={formatLongDate(dayId)}
                dayId={dayId}
                isToday={isToday}
                lines={lines}
                onApplyTemplate={applyTemplate}
            />

            <div className="lines-container px-4 md:px-8 lg:px-16" style={{ paddingTop: '24px' }}>
                {lines.map((line, index) => (
                    <EditableLine
                        key={line.id}
                        line={line}
                        dayId={dayId}
                        reminders={getRemindersForLine(line.id)}
                        onChange={(patch) => updateLine(line.id, patch)}
                        onEnter={() => addLine(index)}
                        onDelete={() => deleteLine(index)}
                        onToggleCheck={(checked) => toggleCheck(line, checked)}
                        onSelectRadio={() => setLines(selectRadio(lines, line.id))}
                        onTypeChange={(type) => changeType(line, type)}
                        autoFocus={autoFocus && index === 0}
                    />
                ))}
            </div>

            <HabitsSection dayId={dayId} />

            {xpPromptLine && <XPPromptModal
                key={xpPromptLine.id}
                isOpen
                onConfirm={confirmXP}
                onCancel={() => setXpPromptLine(null)}
                defaultValue={Number(xpPromptLine?.xp) || 10}
            />}
        </div>
    )
}

export default DaySection
