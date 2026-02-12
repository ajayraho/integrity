import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

function NavigationButton({ currentView, onViewChange, onManageHabits, onLogout }) {
    const [showMenu, setShowMenu] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })

    const views = [
        { id: 'continuous', label: 'Continuous Scroll', icon: '📜' },
        { id: 'habit-tracker', label: 'Habit Tracker', icon: '📊' },
        { id: 'calendar', label: 'Calendar View', icon: '📅' },
        { id: 'timeline', label: 'Timeline View', icon: '⏱️' },
        { id: 'grid', label: 'Grid View', icon: '⊞' },
    ]

    return (
        <div className="fixed bottom-6 right-6 z-30">
            {showMenu && (
                <div className="absolute bottom-16 right-0 bg-white border-2 border-line shadow-lg rounded-lg py-2 mb-2 min-w-[200px]">
                    {views.map(view => (
                        <button
                            key={view.id}
                            onClick={() => {
                                onViewChange(view.id)
                                setShowMenu(false)
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-line/30 transition-colors flex items-center gap-2 ${currentView === view.id ? 'bg-line/20 font-semibold' : ''
                                }`}
                        >
                            <span className="text-lg">{view.icon}</span>
                            <span className="text-sm text-ink">{view.label}</span>
                        </button>
                    ))}

                    <hr className="my-2 border-line" />

                    <button
                        onClick={() => {
                            onManageHabits()
                            setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors flex items-center gap-2"
                    >
                        <span className="text-lg">⚙️</span>
                        <span className="text-sm text-ink">Manage Habits</span>
                    </button>

                    <button
                        onClick={() => {
                            setConfirmDialog({
                                isOpen: true,
                                action: () => {
                                    onLogout()
                                    setShowMenu(false)
                                    setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
                                },
                                title: 'Logout',
                                message: 'Are you sure you want to logout? All your data is safely stored in the encrypted database.'
                            })
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600"
                    >
                        <span className="text-lg">🚪</span>
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
                confirmText="Logout"
                confirmStyle="danger"
            />

            <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-14 h-14 bg-ink text-white rounded-full shadow-lg hover:bg-ink/90 transition-all hover:scale-110 flex items-center justify-center"
                aria-label="Navigation menu"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {showMenu ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>
        </div>
    )
}

export default NavigationButton
