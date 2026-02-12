import { useState, useEffect } from 'react'
import TemplateMenu from './TemplateMenu'
import { getBadgesForDate } from '../utils/storage'

// Generate consistent color based on badge name
const getColorForBadge = (badgeName) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#FF8FA3', '#C9ADA7', '#6C757D', '#A8DADC', '#E63946'
    ]

    // Create a hash from the badge name
    let hash = 0
    for (let i = 0; i < badgeName.length; i++) {
        hash = badgeName.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
}

// Get initials from badge name
const getInitials = (badgeName) => {
    return badgeName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function DateHeader({ date, dayId, dayDate, lines, onApplyTemplate }) {
    const [showMenu, setShowMenu] = useState(false)
    const [badges, setBadges] = useState([])

    useEffect(() => {
        // Get badges for this day
        const dayBadges = getBadgesForDate(dayId)
        setBadges(dayBadges)
    }, [dayId])

    return (
        <div className="date-header sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b-2 border-line px-4 md:px-8 lg:px-16 py-3 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-journal font-semibold text-ink">
                {date}
            </h2>

            <div className="flex items-center gap-2">
                {/* Badge Thumbnails */}
                {badges.length > 0 && (
                    <div className="flex items-center gap-1 mr-2">
                        {badges.slice(0, 5).map((badge) => {
                            const bgColor = getColorForBadge(badge.name)
                            const initials = getInitials(badge.name)

                            return (
                                <div
                                    key={badge.id}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-110 transition-transform cursor-pointer"
                                    style={{ backgroundColor: bgColor }}
                                    title={`${badge.name} (+${badge.xpBoost} XP)`}
                                >
                                    {initials}
                                </div>
                            )
                        })}
                        {badges.length > 5 && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-400 text-white text-xs font-bold shadow-md">
                                +{badges.length - 5}
                            </div>
                        )}
                    </div>
                )}

                {/* Three dots menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-line/30 rounded-lg transition-colors"
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
                    </button>

                    {showMenu && (
                        <TemplateMenu
                            dayId={dayId}
                            dayDate={dayDate}
                            lines={lines}
                            onClose={() => setShowMenu(false)}
                            onApplyTemplate={onApplyTemplate}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default DateHeader
