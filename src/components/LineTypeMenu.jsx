import { useEffect, useRef } from 'react'

function LineTypeMenu({ currentType, hasContent, onSelect, onSetReminder, onClose }) {
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const options = [
        { type: 'text', label: 'Plain Text', icon: '📝' },
        { type: 'checkbox', label: 'Checkbox', icon: '☐' },
        { type: 'checkbox-time', label: 'Checkbox + Time', icon: '⏰' },
        { type: 'radio', label: 'Radio Button', icon: '◯' },
    ]

    return (
        <div
            ref={menuRef}
            className="absolute left-8 top-0 bg-white border-2 border-line shadow-lg rounded-lg py-2 z-20 min-w-[200px]"
        >
            {options.map(option => (
                <button
                    key={option.type}
                    onClick={() => onSelect(option.type)}
                    className={`w-full text-left px-4 py-2 hover:bg-line/30 transition-colors flex items-center gap-2 ${currentType === option.type ? 'bg-line/20 font-semibold' : ''
                        }`}
                >
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-sm text-ink">{option.label}</span>
                </button>
            ))}

            <hr className="my-2 border-line" />

            {/* Reminder Option - only enabled if line has content */}
            <button
                onClick={hasContent ? onSetReminder : undefined}
                disabled={!hasContent}
                className={`w-full text-left px-4 py-2 transition-colors flex items-center gap-2 ${hasContent
                        ? 'hover:bg-line/30 cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                title={hasContent ? 'Set a reminder for this line' : 'Write something first to set a reminder'}
            >
                <span className="text-lg">🔔</span>
                <span className="text-sm text-ink">Set Reminder</span>
            </button>
        </div>
    )
}

export default LineTypeMenu
