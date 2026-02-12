import { useRef, useEffect, useState } from 'react'
import LineTypeMenu from './LineTypeMenu'
import ReminderModal from './ReminderModal'
import XPPromptModal from './XPPromptModal'
import { getRemindersForLine, addXP, removeXPForSource, getXPForSource } from '../utils/storage'

function EditableLine({ line, onUpdate, onEnter, onDelete, autoFocus, dayId, onXPChange }) {
    const contentRef = useRef(null)
    const [showTypeMenu, setShowTypeMenu] = useState(false)
    const [showReminderModal, setShowReminderModal] = useState(false)
    const [showXPPrompt, setShowXPPrompt] = useState(false)
    const [hasReminder, setHasReminder] = useState(false)
    const [isChecked, setIsChecked] = useState(line.checked || false)
    const [lineXP, setLineXP] = useState(line.xp || 0)

    useEffect(() => {
        if (autoFocus && contentRef.current) {
            contentRef.current.focus()
        }
    }, [autoFocus])

    useEffect(() => {
        if (contentRef.current) {
            // Always set the inner text to match the line content
            // This ensures the contentEditable div shows the correct content
            if (line.content !== contentRef.current.innerText) {
                contentRef.current.innerText = line.content
            }
        }
    }, [line.content, line.type])

    useEffect(() => {
        // Check if line has a reminder
        const reminders = getRemindersForLine(line.id)
        setHasReminder(reminders.length > 0)
    }, [line.id])

    useEffect(() => {
        setIsChecked(line.checked || false)
        setLineXP(line.xp || 0)
    }, [line.checked, line.xp])

    const checkForReminder = () => {
        const reminders = getRemindersForLine(line.id)
        setHasReminder(reminders.length > 0)
    }

    const handleCheckboxChange = (checked) => {
        if ((line.type === 'checkbox' || line.type === 'checkbox-time') && checked && !isChecked) {
            // Checking a box - prompt for XP
            setShowXPPrompt(true)
        } else if (!checked && isChecked) {
            // Unchecking - deduct XP
            const removedXP = removeXPForSource(line.id, dayId)
            if (removedXP > 0) {
                onXPChange?.(-removedXP, 'loss')
            }
            setIsChecked(false)
            setLineXP(0)
            onUpdate(line.id, contentRef.current.innerText, line.type, false, 0)
        }
    }

    const handleXPConfirm = (xp) => {
        setShowXPPrompt(false)
        setIsChecked(true)
        setLineXP(xp)

        // Add XP to history
        const taskName = contentRef.current.innerText.trim() || 'Task'
        addXP(dayId, xp, 'task', line.id, taskName)
        onXPChange?.(xp, 'gain')

        // Update line with checked and XP data
        onUpdate(line.id, contentRef.current.innerText, line.type, true, xp)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const newLineId = onEnter()
            // Focus the new line after a short delay
            setTimeout(() => {
                const newLine = document.querySelector(`[data-line-id="${newLineId}"]`)
                if (newLine) newLine.focus()
            }, 0)
        } else if (e.key === 'Backspace') {
            // Get the current text content
            const text = contentRef.current?.innerText || contentRef.current?.textContent || ''
            const trimmedText = text.trim()

            // Only delete if the line is completely empty
            if (trimmedText === '') {
                e.preventDefault()
                onDelete()
            }
        } else if (e.key === 'ArrowUp') {
            // Check if cursor is at the start of the line
            const selection = window.getSelection()
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                if (range.startOffset === 0) {
                    e.preventDefault()
                    // Find previous line
                    const currentLine = contentRef.current
                    if (currentLine) {
                        const allLines = Array.from(document.querySelectorAll('[data-line-id]'))
                        const currentIndex = allLines.indexOf(currentLine)
                        if (currentIndex > 0) {
                            const prevLine = allLines[currentIndex - 1]
                            prevLine.focus()
                            // Move cursor to end of previous line
                            const newRange = document.createRange()
                            const newSelection = window.getSelection()
                            newRange.selectNodeContents(prevLine)
                            newRange.collapse(false)
                            newSelection.removeAllRanges()
                            newSelection.addRange(newRange)
                        }
                    }
                }
            }
        } else if (e.key === 'ArrowDown') {
            // Check if cursor is at the end of the line
            const selection = window.getSelection()
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const text = contentRef.current?.innerText || ''
                if (range.startOffset === text.length) {
                    e.preventDefault()
                    // Find next line
                    const currentLine = contentRef.current
                    if (currentLine) {
                        const allLines = Array.from(document.querySelectorAll('[data-line-id]'))
                        const currentIndex = allLines.indexOf(currentLine)
                        if (currentIndex < allLines.length - 1) {
                            const nextLine = allLines[currentIndex + 1]
                            nextLine.focus()
                            // Move cursor to start of next line
                            const newRange = document.createRange()
                            const newSelection = window.getSelection()
                            newRange.selectNodeContents(nextLine)
                            newRange.collapse(true)
                            newSelection.removeAllRanges()
                            newSelection.addRange(newRange)
                        }
                    }
                }
            }
        }
    }

    const handleInput = (e) => {
        onUpdate(line.id, e.target.innerText, line.type)
    }

    const renderLineContent = () => {
        switch (line.type) {
            case 'checkbox':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                            onChange={(e) => handleCheckboxChange(e.target.checked)}
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Write something..."
                        />
                        {lineXP > 0 && (
                            <span className="mt-1.5 text-sm text-green-600 font-semibold">
                                +{lineXP} XP
                            </span>
                        )}
                    </div>
                )

            case 'checkbox-time':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            className="mt-1.5 w-4 h-4 cursor-pointer flex-shrink-0"
                            onChange={(e) => handleCheckboxChange(e.target.checked)}
                        />
                        <input
                            type="time"
                            className="mt-0.5 px-1 sm:px-2 py-0.5 border border-line rounded text-sm bg-transparent w-20 sm:w-auto"
                            defaultValue="00:00"
                        />
                        <span className="mt-1.5 flex-shrink-0">-</span>
                        <input
                            type="time"
                            className="mt-0.5 px-1 sm:px-2 py-0.5 border border-line rounded text-sm bg-transparent w-20 sm:w-auto"
                            defaultValue="00:00"
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent min-w-0"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Task..."
                        />
                        {lineXP > 0 && (
                            <span className="mt-1.5 text-sm text-green-600 font-semibold flex-shrink-0">
                                +{lineXP} XP
                            </span>
                        )}
                    </div>
                )

            case 'radio':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="radio"
                            name={`radio-group-${line.id}`}
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Option..."
                        />
                    </div>
                )

            default:
                return (
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        data-line-id={line.id}
                        className="outline-none text-ink bg-transparent w-full"
                        style={{
                            minHeight: '32px',
                            lineHeight: '32px',
                            fontSize: '18px',
                            paddingTop: '0px'
                        }}
                        placeholder="Write something..."
                    />
                )
        }
    }

    return (
        <div className="editable-line flex items-start gap-2 group relative">
            <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-line/30 rounded mt-1"
                aria-label="Line options"
            >
                <svg
                    className="w-4 h-4 text-ink/60"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                >
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                </svg>
            </button>

            <div className="flex-1 flex items-start gap-2">
                <div className="flex-1">
                    {renderLineContent()}
                </div>

                {/* Reminder Indicator */}
                {hasReminder && (
                    <button
                        onClick={() => setShowReminderModal(true)}
                        className="flex-shrink-0 mt-1.5 text-ink/60 hover:text-ink transition-colors"
                        title="Has reminder"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                )}
            </div>

            {showTypeMenu && (
                <LineTypeMenu
                    currentType={line.type}
                    hasContent={line.content.trim() !== ''}
                    onSelect={(type) => {
                        onUpdate(line.id, line.content, type)
                        setShowTypeMenu(false)
                    }}
                    onSetReminder={() => {
                        setShowReminderModal(true)
                        setShowTypeMenu(false)
                    }}
                    onClose={() => setShowTypeMenu(false)}
                />
            )}

            {showReminderModal && (
                <ReminderModal
                    lineId={line.id}
                    dayId={dayId}
                    lineContent={line.content}
                    onClose={() => setShowReminderModal(false)}
                    onSave={checkForReminder}
                />
            )}

            <XPPromptModal
                isOpen={showXPPrompt}
                onConfirm={handleXPConfirm}
                onCancel={() => {
                    setShowXPPrompt(false)
                }}
                defaultValue={10}
            />
        </div>
    )
}

export default EditableLine
