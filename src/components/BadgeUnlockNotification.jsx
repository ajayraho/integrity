import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Badge-specific color themes
const BADGE_COLORS = {
    DEEP_WORK_2HR: {
        gradient: 'from-indigo-500 via-purple-500 to-pink-500',
        border: 'border-indigo-300',
        textAccent: 'text-indigo-100'
    },
    DEEP_WORK_5HR: {
        gradient: 'from-red-500 via-orange-500 to-yellow-500',
        border: 'border-red-300',
        textAccent: 'text-orange-100'
    },
    WATER_WARRIOR: {
        gradient: 'from-blue-400 via-cyan-400 to-teal-400',
        border: 'border-blue-300',
        textAccent: 'text-cyan-100'
    },
    EXERCISE_PRO: {
        gradient: 'from-green-500 via-emerald-500 to-teal-500',
        border: 'border-green-300',
        textAccent: 'text-green-100'
    },
    EARLY_BIRD: {
        gradient: 'from-pink-400 via-rose-400 to-orange-400',
        border: 'border-pink-300',
        textAccent: 'text-pink-100'
    },
    NIGHT_OWL: {
        gradient: 'from-purple-600 via-indigo-600 to-blue-700',
        border: 'border-purple-300',
        textAccent: 'text-purple-100'
    },
    TASK_MASTER: {
        gradient: 'from-lime-500 via-green-500 to-emerald-500',
        border: 'border-lime-300',
        textAccent: 'text-lime-100'
    },
    HABIT_STREAK_7: {
        gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
        border: 'border-violet-300',
        textAccent: 'text-violet-100'
    },
    PERFECT_DAY: {
        gradient: 'from-yellow-400 via-amber-400 to-orange-500',
        border: 'border-yellow-300',
        textAccent: 'text-yellow-100'
    },
    READING_BUG: {
        gradient: 'from-amber-600 via-yellow-600 to-orange-600',
        border: 'border-amber-300',
        textAccent: 'text-amber-100'
    },
    PRODUCTIVITY_BEAST: {
        gradient: 'from-cyan-500 via-blue-500 to-purple-600',
        border: 'border-cyan-300',
        textAccent: 'text-cyan-100'
    }
}

function BadgeUnlockNotification({ badge, onClose }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        // Trigger entrance animation
        setTimeout(() => setIsVisible(true), 100)

        // Auto-close after 4 seconds
        const timer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
                onClose?.()
            }, 500)
        }, 4000)

        return () => clearTimeout(timer)
    }, [onClose])

    if (!badge) return null

    // Get colors for this badge type, fallback to default
    const colors = BADGE_COLORS[badge.type] || {
        gradient: 'from-yellow-400 via-orange-400 to-red-500',
        border: 'border-yellow-300',
        textAccent: 'text-yellow-100'
    }

    return createPortal(
        <div className={`fixed inset-0 z-[150] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className={`pointer-events-auto bg-gradient-to-br ${colors.gradient} rounded-2xl shadow-2xl p-8 max-w-md border-4 ${colors.border} transition-all duration-500 ${isVisible && !isExiting ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
                }`}>
                {/* Sparkle effects */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-4 left-4 text-4xl animate-ping">✨</div>
                    <div className="absolute top-4 right-4 text-4xl animate-ping animation-delay-100">✨</div>
                    <div className="absolute bottom-4 left-4 text-4xl animate-ping animation-delay-200">✨</div>
                    <div className="absolute bottom-4 right-4 text-4xl animate-ping animation-delay-300">✨</div>
                </div>

                <div className="relative text-center">
                    {/* Badge Icon */}
                    <div className="text-8xl mb-4 animate-bounce">
                        {badge.icon}
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                        🎉 Badge Unlocked! 🎉
                    </h2>

                    {/* Badge Name */}
                    <h3 className={`text-2xl font-bold ${colors.textAccent} mb-3`}>
                        {badge.name}
                    </h3>

                    {/* XP Boost */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 inline-block">
                        <div className="text-xl font-bold text-white">
                            +{badge.xpBoost} XP Boost! 🚀
                        </div>
                    </div>

                    {/* Description if available */}
                    {badge.description && (
                        <p className="text-white/90 text-sm mt-3">
                            {badge.description}
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default BadgeUnlockNotification
