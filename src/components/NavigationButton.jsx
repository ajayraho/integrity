import { useState } from 'react'

function NavigationButton({ currentView, onViewChange }) {
    const [showMenu, setShowMenu] = useState(false)

    const views = [
        { id: 'continuous', label: 'Continuous Scroll', icon: '📜' },
        { id: 'calendar', label: 'Calendar View', icon: '📅' },
        { id: 'timeline', label: 'Timeline View', icon: '⏱️' },
        { id: 'grid', label: 'Grid View', icon: '⊞' },
    ]

    return (
        <div className="fixed bottom-6 right-6 z-30">
            {showMenu && (
                <div className="absolute bottom-16 right-0 bg-white border-2 border-line shadow-lg rounded-lg py-2 mb-2 min-w-[180px]">
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
                </div>
            )}

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
