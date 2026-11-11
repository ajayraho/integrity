import { useState } from 'react'
import { loadHabits, addHabit, updateHabit, deleteHabit, getMateriaStats } from '../utils/storage'
import MateriaOrb from './MateriaOrb'
import { useStoreVersion } from '../hooks/useStore'
import ConfirmDialog from './ConfirmDialog'

function HabitManagement({ onClose }) {
    useStoreVersion()
    const habits = loadHabits()
    const materiaList = getMateriaStats()
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingHabit, setEditingHabit] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })
    const [newHabit, setNewHabit] = useState({
        name: '',
        type: 'checkbox',
        icon: '✓',
        color: '#2C3E50',
        goal: 1,
        xp: 10
    })

    const handleAddHabit = () => {
        if (!newHabit.name.trim()) return

        if (editingHabit) {
            // Update existing habit
            updateHabit(editingHabit.id, newHabit)
            setEditingHabit(null)
        } else {
            // Add new habit
            addHabit(newHabit)
        }

        setNewHabit({ name: '', type: 'checkbox', icon: '✓', color: '#2C3E50', goal: 1, xp: 10 })
        setShowAddForm(false)
    }

    const handleEditHabit = (habit) => {
        setEditingHabit(habit)
        setNewHabit({
            name: habit.name,
            type: habit.type,
            icon: habit.icon,
            color: habit.color || '#2C3E50',
            goal: habit.goal || 1,
            xp: habit.xp || 10,
            materiaId: habit.materiaId || null,
        })
        setShowAddForm(true)
    }

    const handleCancelEdit = () => {
        setEditingHabit(null)
        setNewHabit({ name: '', type: 'checkbox', icon: '✓', color: '#2C3E50', goal: 1, xp: 10 })
        setShowAddForm(false)
    }

    const handleDeleteHabit = (habitId) => {
        setConfirmDialog({
            isOpen: true,
            action: () => {
                deleteHabit(habitId)
                setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
            },
            title: 'Delete Habit',
            message: 'Delete this habit? It will disappear from your days. Values and XP already recorded on past days are kept.'
        })
    }

    const iconOptions = [
        '✓', '💪', '📚', '🏃', '🧘', '💧', '🍎', '😴', '📝', '🎯', '⭐', '🔥',
        '💼', '🎨', '🎵', '🎮', '💻', '📱', '☕', '🍕', '🏋️', '🚴', '🏊', '⚽',
        '🏀', '🎾', '🏐', '🎳', '🧠', '🎪', '🎭', '🎬', '📷', '📖', '✏️', '📊',
        '💡', '🌟', '🌈', '🌸', '🌺', '🌻', '🌹', '🍀', '🌿', '🌱', '🌾', '🍃',
        '❤️', '💚', '💙', '💜', '🧡', '💛', '🤍', '🖤', '💖', '💗', '💓', '💝'
    ]
    const typeOptions = [
        { value: 'checkbox', label: 'Checkbox (Yes/No)' },
        { value: 'number', label: 'Number (Count)' },
        { value: 'text', label: 'Text (Note)' }
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-paper rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-line">
                {/* Header */}
                <div className="bg-ink text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Manage Habits</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-300 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Add Habit Button */}
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 border-2 border-dashed border-line rounded-lg text-ink font-semibold hover:bg-line/20 transition-colors mb-6"
                        >
                            + Add New Habit
                        </button>
                    )}

                    {/* Add/Edit Habit Form */}
                    {showAddForm && (
                        <div className="mb-6 p-4 border-2 border-line rounded-lg bg-white">
                            <h3 className="font-semibold text-ink mb-4">
                                {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">Habit Name</label>
                                    <input
                                        type="text"
                                        value={newHabit.name}
                                        onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                                        placeholder="e.g., Morning Exercise"
                                        className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">Type</label>
                                    <select
                                        value={newHabit.type}
                                        onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink"
                                    >
                                        {typeOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">Icon</label>
                                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-line rounded-lg">
                                        {iconOptions.map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewHabit({ ...newHabit, icon })}
                                                className={`text-2xl w-12 h-12 rounded-lg border-2 ${newHabit.icon === icon ? 'border-ink bg-line/30' : 'border-line'
                                                    } hover:bg-line/20 transition-colors flex-shrink-0`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newHabit.type === 'number' && (
                                    <div>
                                        <label className="block text-sm font-medium text-ink mb-1">Daily Goal</label>
                                        <input
                                            type="number"
                                            value={newHabit.goal}
                                            onChange={(e) => setNewHabit({ ...newHabit, goal: parseInt(e.target.value) || 1 })}
                                            min="1"
                                            placeholder="e.g., 10"
                                            className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">The target number you want to achieve daily</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">XP Reward</label>
                                    <input
                                        type="number"
                                        value={newHabit.xp}
                                        onChange={(e) => setNewHabit({ ...newHabit, xp: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        placeholder="e.g., 10"
                                        className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {newHabit.type === 'checkbox'
                                            ? 'Full XP awarded on completion'
                                            : 'XP awarded proportionally based on progress toward goal'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">Materia</label>
                                    <select
                                        value={newHabit.materiaId || ''}
                                        onChange={(e) => setNewHabit({ ...newHabit, materiaId: e.target.value || null })}
                                        className="w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink"
                                    >
                                        <option value="">None</option>
                                        {materiaList.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}{m.category ? ` · ${m.category}` : ''} (×{m.multiplier})</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Habit XP is boosted by the materia, and the materia gains AP.</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddHabit}
                                        className="flex-1 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink/90 transition-colors"
                                    >
                                        {editingHabit ? 'Update Habit' : 'Create Habit'}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 border-2 border-line rounded-lg hover:bg-line/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Habits List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {habits.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No habits yet. Create one to get started!</p>
                        ) : (
                            habits.map(habit => (
                                <div
                                    key={habit.id}
                                    className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 p-4 border-2 border-line rounded-lg bg-white hover:bg-line/10 transition-colors"
                                >
                                    <span className="text-3xl">{habit.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-ink">{habit.name}</div>
                                        <div className="text-sm text-gray-600">
                                            Type: {typeOptions.find(t => t.value === habit.type)?.label}
                                            {habit.type === 'number' && habit.goal && ` • Goal: ${habit.goal}`}
                                            {habit.xp > 0 && ` • XP: ${habit.xp}`}
                                            {materiaList.find(m => m.id === habit.materiaId) && (
                                                <span className="inline-flex items-center gap-1 ml-1">
                                                    • <MateriaOrb materia={materiaList.find(m => m.id === habit.materiaId)} size={9} /> {materiaList.find(m => m.id === habit.materiaId).name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => handleEditHabit(habit)}
                                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteHabit(habit.id)}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                    >
                                        Delete
                                    </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
            />
        </div>
    )
}

export default HabitManagement
