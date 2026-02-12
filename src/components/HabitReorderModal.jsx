import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function HabitReorderModal({ habits, onClose, onSave }) {
    const [orderedHabits, setOrderedHabits] = useState([])
    const [draggedIndex, setDraggedIndex] = useState(null)

    useEffect(() => {
        // Initialize with current habits, ensure visibility property exists
        setOrderedHabits(habits.map(h => ({ ...h, visible: h.visible !== false })))
    }, [habits])

    const handleDragStart = (index) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return

        const newHabits = [...orderedHabits]
        const draggedItem = newHabits[draggedIndex]
        newHabits.splice(draggedIndex, 1)
        newHabits.splice(index, 0, draggedItem)

        setOrderedHabits(newHabits)
        setDraggedIndex(index)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
    }

    const toggleVisibility = (index) => {
        const newHabits = [...orderedHabits]
        newHabits[index].visible = !newHabits[index].visible
        setOrderedHabits(newHabits)
    }

    const handleSave = () => {
        onSave(orderedHabits)
        onClose()
    }

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white border-4 border-line rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b-2 border-line p-6 bg-white">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-ink">⚡ Reorder Habits</h2>
                        <button
                            onClick={onClose}
                            className="text-ink/60 hover:text-ink text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                    <p className="text-sm text-ink/60 mt-2">Drag to reorder, click eye to hide/show</p>
                </div>

                {/* Habits List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {orderedHabits.map((habit, index) => (
                        <div
                            key={habit.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-4 bg-white border-2 border-line rounded-lg cursor-move hover:bg-line/10 transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''
                                } ${!habit.visible ? 'opacity-60' : ''}`}
                        >
                            {/* Drag Handle */}
                            <div className="text-ink/40 text-xl cursor-grab active:cursor-grabbing">
                                ☰
                            </div>

                            {/* Habit Icon & Name */}
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-2xl" style={{ color: habit.color }}>
                                    {habit.icon}
                                </span>
                                <span className="font-medium text-ink">{habit.name}</span>
                            </div>

                            {/* Visibility Toggle */}
                            <button
                                onClick={() => toggleVisibility(index)}
                                className="text-2xl hover:scale-110 transition-transform"
                                title={habit.visible ? 'Hide habit' : 'Show habit'}
                            >
                                {habit.visible ? '👁️' : '🙈'}
                            </button>
                        </div>
                    ))}

                    {orderedHabits.length === 0 && (
                        <div className="text-center text-ink/60 py-8">
                            No habits to reorder. Create some habits first!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t-2 border-line p-6 bg-white flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-line rounded-lg hover:bg-line/30 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-ink text-white rounded-lg hover:bg-ink/90 transition-colors"
                    >
                        Save Order
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default HabitReorderModal
