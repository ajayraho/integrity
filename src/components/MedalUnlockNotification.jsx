import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function MedalUnlockNotification({ medal, monthName, onClose }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        // Trigger entrance animation
        setTimeout(() => setIsVisible(true), 100)

        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
                onClose?.()
            }, 500)
        }, 5000)

        return () => clearTimeout(timer)
    }, [onClose])

    if (!medal) return null

    const getGradientColors = () => {
        switch (medal.tier) {
            case 'BRONZE':
                return 'from-orange-600 via-orange-400 to-yellow-600'
            case 'SILVER':
                return 'from-gray-400 via-gray-200 to-gray-500'
            case 'GOLD':
                return 'from-yellow-500 via-yellow-300 to-yellow-600'
            case 'PLATINUM':
                return 'from-slate-300 via-white to-slate-400'
            case 'DIAMOND':
                return 'from-cyan-400 via-blue-200 to-cyan-500'
            case 'LEGEND':
                return 'from-purple-600 via-pink-500 to-purple-700'
            default:
                return 'from-gray-400 to-gray-600'
        }
    }

    return createPortal(
        <div className={`fixed inset-0 z-[150] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className={`pointer-events-auto bg-gradient-to-br ${getGradientColors()} rounded-2xl shadow-2xl p-10 max-w-lg border-4 border-white/50 transition-all duration-500 ${isVisible && !isExiting ? 'scale-100 rotate-0' : 'scale-50 -rotate-12'
                }`}>
                {/* Confetti effects */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-8 left-8 text-5xl animate-bounce">🎊</div>
                    <div className="absolute top-8 right-8 text-5xl animate-bounce animation-delay-100">🎊</div>
                    <div className="absolute bottom-8 left-1/4 text-5xl animate-bounce animation-delay-200">🎉</div>
                    <div className="absolute bottom-8 right-1/4 text-5xl animate-bounce animation-delay-300">🎉</div>
                </div>

                <div className="relative text-center">
                    {/* Medal Icon */}
                    <div className="text-9xl mb-6 animate-pulse">
                        {medal.icon}
                    </div>

                    {/* Title */}
                    <h2 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
                        🏆 MEDAL EARNED! 🏆
                    </h2>

                    {/* Medal Name */}
                    <h3 className="text-3xl font-bold text-white/95 mb-4 drop-shadow-md">
                        {medal.name}
                    </h3>

                    {/* Month Info */}
                    <div className="bg-white/30 backdrop-blur-sm rounded-xl px-8 py-4 inline-block mb-4">
                        <div className="text-2xl font-bold text-white">
                            {monthName} {medal.year}
                        </div>
                        <div className="text-lg text-white/90 mt-1">
                            {medal.threshold}+ XP Milestone
                        </div>
                    </div>

                    {/* Congratulations */}
                    <p className="text-white text-xl font-semibold mt-4">
                        Keep up the amazing work! 💪
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default MedalUnlockNotification
