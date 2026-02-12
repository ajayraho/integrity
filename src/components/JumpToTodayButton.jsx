import { useState, useEffect } from 'react'

function JumpToTodayButton({ onJumpToToday, isVisible }) {
    const [show, setShow] = useState(false)

    useEffect(() => {
        setShow(isVisible)
    }, [isVisible])

    if (!show) return null

    return (
        <button
            onClick={onJumpToToday}
            className="fixed bottom-6 left-6 z-30 bg-white border-2 border-line text-ink px-4 py-3 rounded-full shadow-lg hover:bg-line/20 transition-all hover:scale-105 flex items-center gap-2 font-medium"
            aria-label="Jump to today"
        >
            <span className="text-xl">📅</span>
            <span className="text-sm">Today</span>
        </button>
    )
}

export default JumpToTodayButton
