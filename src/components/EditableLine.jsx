import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import LineTypeMenu from './LineTypeMenu'
import ReminderModal from './ReminderModal'
import QuestModal from './QuestModal'
import MateriaOrb from './MateriaOrb'
import { getMateriaStat, getDayLedger } from '../utils/storage'
import { questXP } from '../game/engine.js'

import { focusLine, consumePendingFocus } from '../utils/focus'

const LINE_STYLE = {
    minHeight: '32px',
    lineHeight: '32px',
    fontSize: '18px',
}

/** Caret offset (in characters) from the start of `el`, or -1. */
function caretOffset(el) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return -1
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return -1
    const pre = range.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.startContainer, range.startOffset)
    return pre.toString().length
}

function moveToSibling(current, direction) {
    const all = Array.from(document.querySelectorAll('[data-line-id]'))
    const idx = all.indexOf(current)
    const target = all[idx + direction]
    if (!target) return false
    target.focus()
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(direction > 0) // down: caret at start, up: caret at end
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    return true
}

/**
 * One journal line.
 * Props:
 *   line                {id, type, content, checked, xp, timeStart, timeEnd, selected}
 *   onChange(patch)     merge fields into the line
 *   onEnter()           create a line below
 *   onDelete()          remove this (empty) line
 *   onToggleCheck(bool) checkbox clicked (parent handles XP prompt)
 *   onSelectRadio()     radio clicked
 *   onTypeChange(type)
 *   onQuestChange(patch) set quest XP / materia
 *   reminders           reminders for this line (omit to disable reminders, e.g. templates)
 *   dayId
 *   mode                'journal' | 'template'
 */
function EditableLine({
    line, onChange, onEnter, onDelete, onToggleCheck, onSelectRadio, onTypeChange, onQuestChange,
    reminders, dayId, autoFocus, mode = 'journal',
}) {
    const contentRef = useRef(null)
    const [showTypeMenu, setShowTypeMenu] = useState(false)
    const [showReminderModal, setShowReminderModal] = useState(false)
    const [showQuestModal, setShowQuestModal] = useState(false)
    const isTemplate = mode === 'template'
    const hasReminder = !isTemplate && (reminders || []).some(r => r.enabled !== false)

    useEffect(() => {
        if (autoFocus && contentRef.current) contentRef.current.focus()
    }, [autoFocus])

    useLayoutEffect(() => {
        consumePendingFocus(line.id, contentRef.current)
    }, [line.id, line.type])

    // Keep the DOM text in sync with data (remote edits, template apply, type change).
    // While typing, data already equals the DOM text, so the caret isn't disturbed.
    useEffect(() => {
        const el = contentRef.current
        if (!el) return
        const content = line.content || ''
        if (el.innerText.replace(/\n$/, '') !== content) el.innerText = content
    }, [line.content, line.type])

    const handleKeyDown = (e) => {
        const el = contentRef.current
        if (!el) return
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnter?.()
        } else if (e.key === 'Backspace') {
            if ((el.innerText || '').trim() === '' && caretOffset(el) <= 0) {
                e.preventDefault()
                onDelete?.()
            }
        } else if (e.key === 'ArrowUp') {
            if (caretOffset(el) === 0 && moveToSibling(el, -1)) e.preventDefault()
        } else if (e.key === 'ArrowDown') {
            if (caretOffset(el) === (el.innerText || '').replace(/\n$/, '').length && moveToSibling(el, 1)) e.preventDefault()
        }
    }

    const handleInput = (e) => {
        onChange({ content: e.currentTarget.innerText.replace(/\n$/, '') })
    }

    // Paste as plain text (no fonts/colours from other apps)
    const handlePaste = (e) => {
        e.preventDefault()
        const text = (e.clipboardData?.getData('text/plain') || '').replace(/\r?\n/g, ' ')
        document.execCommand('insertText', false, text)
    }

    const editable = (placeholder, extraClass = '') => (
        <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            data-line-id={line.id}
            data-placeholder={placeholder}
            className={`journal-line flex-1 outline-none text-ink bg-transparent min-w-0 break-words ${extraClass}`}
            style={LINE_STYLE}
        />
    )

    const checked = Boolean(line.checked)
    const materia = getMateriaStat(line.materiaId)
    const baseXP = questXP(line)
    const earned = !isTemplate && checked
        ? getDayLedger(dayId)?.items.find(i => i.kind === 'quest' && i.id === line.id)?.earned ?? baseXP
        : null
    // Quest chip: catalyser materia + XP. Tap to edit.
    const xpBadge = (
        <button
            type="button"
            onClick={() => setShowQuestModal(true)}
            className={`mt-1 flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold transition-colors ${checked && !isTemplate
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-line bg-white/70 text-ink/70 hover:border-ink/40'}`}
            title={materia ? `${materia.name} ×${materia.multiplier}` : 'Set quest XP and materia'}
        >
            {materia && <MateriaOrb materia={materia} size={10} />}
            {materia && <span className="font-normal">{materia.name}</span>}
            {earned !== null ? `+${earned} XP` : `${baseXP} XP`}
        </button>
    )

    const renderLineContent = () => {
        switch (line.type) {
            case 'checkbox':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            checked={checked}
                            disabled={isTemplate}
                            className="mt-2 w-4 h-4 cursor-pointer flex-shrink-0"
                            onChange={(e) => onToggleCheck?.(e.target.checked)}
                        />
                        {editable('Task...', checked ? 'line-through text-ink/50' : '')}
                        {xpBadge}
                    </div>
                )

            case 'checkbox-time':
                // Text + chip on the first ruled line, the time range on the second
                return (
                    <div>
                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={isTemplate}
                                className="mt-2 w-4 h-4 cursor-pointer flex-shrink-0"
                                onChange={(e) => onToggleCheck?.(e.target.checked)}
                            />
                            {editable('Task...', checked ? 'line-through text-ink/50' : '')}
                            {xpBadge}
                        </div>
                        <div className="flex items-center gap-1.5 pl-6 text-ink/70" style={{ height: 32 }}>
                            <span className="text-xs">⏰</span>
                            <input
                                type="time"
                                value={line.timeStart || ''}
                                onChange={(e) => onChange({ timeStart: e.target.value })}
                                className="px-1 py-0 border border-line rounded text-xs bg-transparent"
                                aria-label="Start time"
                            />
                            <span className="text-xs">–</span>
                            <input
                                type="time"
                                value={line.timeEnd || ''}
                                onChange={(e) => onChange({ timeEnd: e.target.value })}
                                className="px-1 py-0 border border-line rounded text-xs bg-transparent"
                                aria-label="End time"
                            />
                        </div>
                    </div>
                )

            case 'radio':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="radio"
                            checked={Boolean(line.selected)}
                            onChange={() => {}}
                            onClick={() => onSelectRadio?.()}
                            className="mt-2 w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                        {editable('Option...')}
                    </div>
                )

            default:
                return <div className="flex">{editable('Write something...')}</div>
        }
    }

    return (
        <div className="editable-line flex items-start gap-2 group relative">
            <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="opacity-30 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-line/30 rounded mt-1 flex-shrink-0"
                aria-label="Line options"
            >
                <svg className="w-4 h-4 text-ink/60" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                </svg>
            </button>

            <div className="flex-1 flex items-start gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                    {renderLineContent()}
                </div>

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
                    hasContent={(line.content || '').trim() !== ''}
                    allowReminder={!isTemplate}
                    onSelect={(type) => {
                        setShowTypeMenu(false)
                        if (type !== line.type) onTypeChange?.(type)
                        focusLine(line.id)
                    }}
                    onSetReminder={() => {
                        setShowReminderModal(true)
                        setShowTypeMenu(false)
                    }}
                    onClose={() => setShowTypeMenu(false)}
                />
            )}

            {showQuestModal && (
                <QuestModal
                    line={line}
                    isTemplate={isTemplate}
                    onSave={(patch) => onQuestChange ? onQuestChange(patch) : onChange(patch)}
                    onClose={() => setShowQuestModal(false)}
                />
            )}

            {showReminderModal && (
                <ReminderModal
                    lineId={line.id}
                    dayId={dayId}
                    lineContent={line.content}
                    onClose={() => setShowReminderModal(false)}
                />
            )}
        </div>
    )
}

export default EditableLine
