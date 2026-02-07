import { useState } from 'react'
import TemplateMenu from './TemplateMenu'

function DateHeader({ date, dayId }) {
    const [showMenu, setShowMenu] = useState(false)

    return (
        <div className="date-header sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b-2 border-line px-4 md:px-8 lg:px-16 py-3 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-journal font-semibold text-ink">
                {date}
            </h2>

            <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-line/30 rounded-lg transition-colors relative"
                aria-label="More options"
            >
                <svg
                    className="w-6 h-6 text-ink"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                >
                    <circle cx="2" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="14" cy="8" r="1.5" />
                </svg>

                {showMenu && (
                    <TemplateMenu
                        dayId={dayId}
                        onClose={() => setShowMenu(false)}
                    />
                )}
            </button>
        </div>
    )
}

export default DateHeader
