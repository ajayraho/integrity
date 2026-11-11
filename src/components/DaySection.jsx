import EditableLine from './EditableLine'
import { focusLine } from '../utils/focus'
import DateHeader from './DateHeader'
import HabitsSection from './HabitsSection'
import { useStoreVersion } from '../hooks/useStore'
import { useFeedback } from '../hooks/useFeedback'
import { getDayOrDefault, saveDay, getRemindersForLine, deleteRemindersForLine } from '../utils/storage'
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
    const { act } = useFeedback()

    const day = getDayOrDefault(dayId)
    const lines = day.lines?.length ? day.lines : [{ id: `${dayId}-1`, type: 'text', content: '' }]

    const setLines = (newLines) => saveDay(dayId, { lines: newLines })

    const addLine = (index) => {
        const line = newLine()
        setLines(insertAfter(lines, index, line))
        focusLine(line.id)
    }

    const updateLine = (lineId, patch) => setLines(patchLine(lines, lineId, patch))

    // act() compares XP / levels before and after, and shows the right feedback
    const deleteLine = (index) => {
        if (lines.length === 1) return
        const line = lines[index]
        act(dayId, () => setLines(removeLine(lines, line.id)))
        deleteRemindersForLine(line.id)
        const target = index > 0 ? lines[index - 1] : lines[1]
        focusLine(target.id, index > 0)
    }

    const toggleCheck = (line, checked) => {
        act(dayId, () => updateLine(line.id, checked
            ? { checked: true, completedAt: new Date().toISOString() }
            : { checked: false, completedAt: null }))
    }

    const changeType = (line, type) => {
        const stillQuest = type === 'checkbox' || type === 'checkbox-time'
        act(dayId, () => updateLine(line.id, stillQuest ? { type } : { type, checked: false }))
    }

    const applyTemplate = (template) => {
        lines.forEach(l => deleteRemindersForLine(l.id))
        act(dayId, () => setLines(linesFromTemplate(template)))
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
                        onQuestChange={(patch) => act(dayId, () => updateLine(line.id, patch))}
                        autoFocus={autoFocus && index === 0}
                    />
                ))}
            </div>

            <HabitsSection dayId={dayId} />

        </div>
    )
}

export default DaySection
