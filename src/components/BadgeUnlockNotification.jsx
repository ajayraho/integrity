import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

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

    return createPortal(
        <div className={`fixed inset-0 z-[150] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className={`pointer-events-auto bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-2xl shadow-2xl p-8 max-w-md border-4 border-yellow-300 transition-all duration-500 ${isVisible && !isExiting ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
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
                    <h3 className="text-2xl font-bold text-yellow-100 mb-3">
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
