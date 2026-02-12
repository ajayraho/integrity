import { useState, useEffect, useRef } from 'react'
import { loadHabits, saveHabits } from '../utils/storage'
import ConfirmDialog from './ConfirmDialog'
import HabitReorderModal from './HabitReorderModal'

function HabitsSection({ dayId, habits, onUpdate }) {
    const [allHabits, setAllHabits] = useState([])
    const [dayHabits, setDayHabits] = useState(habits || {})
    const [showMenu, setShowMenu] = useState(false)
    const [showReorderModal, setShowReorderModal] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false)
            }
        }

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMenu])

    useEffect(() => {
        // Load all defined habits
        const loaded = loadHabits()
        setAllHabits(loaded.sort((a, b) => (a.order || 0) - (b.order || 0)))
    }, [])

    useEffect(() => {
        setDayHabits(habits || {})
    }, [habits])

    const handleSaveReorder = (reorderedHabits) => {
        // Update habits with new order and visibility
        const updatedHabits = reorderedHabits.map((habit, index) => ({
            ...habit,
            order: index,
            visible: habit.visible
        }))
        saveHabits(updatedHabits)
        setAllHabits(updatedHabits)
    }

    const handleHabitChange = (habitId, value) => {
        let updated
        if (habitId === null) {
            // Bulk update (for reset all)
            updated = value
        } else {
            // Single habit update
            updated = { ...dayHabits, [habitId]: value }
        }
        setDayHabits(updated)
        onUpdate(updated)
    }

    const renderHabitInput = (habit) => {
        const value = dayHabits[habit.id]

        switch (habit.type) {
            case 'checkbox':
                return (
                    <input
                        type="checkbox"
                        checked={value === true || value === 'true'}
                        onChange={(e) => handleHabitChange(habit.id, e.target.checked)}
                        className="w-5 h-5 cursor-pointer accent-ink"
                    />
                )

            case 'number':
                return (
                    <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => handleHabitChange(habit.id, e.target.value)}
                        placeholder="0"
                        className="w-14 sm:w-16 px-2 py-1 border border-line rounded text-center bg-transparent outline-none focus:border-ink"
                        style={{ fontSize: '16px' }}
                    />
                )

            case 'text':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleHabitChange(habit.id, e.target.value)}
                        placeholder="..."
                        className="w-24 sm:w-32 px-2 py-1 border border-line rounded bg-transparent outline-none focus:border-ink"
                        style={{ fontSize: '16px' }}
                    />
                )

            default:
                return null
        }
    }

    if (allHabits.length === 0) {
        return null
    }

    return (
        <div className="habits-section mt-8 mb-8 px-4 md:px-8 lg:px-16">
            <div className="relative border-2 border-dashed border-ink/30 rounded-lg bg-transparent p-4" ref={menuRef}>
                {/* Three-dot menu button - always visible */}
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-line/30 rounded transition-colors"
                    aria-label="Habits options"
                >
                    <svg className="w-4 h-4 text-ink/60" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="2" r="1.5"></circle>
                        <circle cx="8" cy="8" r="1.5"></circle>
                        <circle cx="8" cy="14" r="1.5"></circle>
                    </svg>
                </button>

                {/* Menu dropdown */}
                {showMenu && (
                    <div className="absolute top-10 right-2 bg-white border-2 border-line shadow-lg rounded-lg py-2 z-20 min-w-[180px]">
                        <button
                            onClick={() => {
                                setShowReorderModal(true)
                                setShowMenu(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                        >
                            ⚡ Reorder Habits
                        </button>
                        <button
                            onClick={() => {
                                setConfirmDialog({
                                    isOpen: true,
                                    action: () => {
                                        const cleared = {}
                                        allHabits.forEach(h => cleared[h.id] = h.type === 'checkbox' ? false : '')
                                        handleHabitChange(null, cleared)
                                        setShowMenu(false)
                                        setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
                                    },
                                    title: 'Reset All Habits',
                                    message: 'Are you sure you want to reset all habits for today? This will clear all checkboxes and reset all values.'
                                })
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                        >
                            🔄 Reset All
                        </button>
                        <button
                            onClick={() => {
                                setShowMenu(false)
                                // Could add more options here later
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                        >
                            📊 View Statistics
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-6 flex-wrap">
                    {allHabits.filter(h => h.visible !== false).map(habit => (
                        <div
                            key={habit.id}
                            className="habit-item flex items-center gap-2"
                        >
                            {renderHabitInput(habit)}
                            <span className="flex items-center gap-1 text-ink font-medium whitespace-nowrap" style={{ fontSize: '17px' }}>
                                <span className="text-xl" style={{ color: habit.color }}>
                                    {habit.icon}
                                </span>
                                {habit.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
            />

            {showReorderModal && (
                <HabitReorderModal
                    habits={allHabits}
                    onClose={() => setShowReorderModal(false)}
                    onSave={handleSaveReorder}
                />
            )}
        </div>
    )
}

export default HabitsSection
