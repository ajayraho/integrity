import { useState } from 'react'
import TemplateMenu from './TemplateMenu'
import TemplateBrowser from './TemplateBrowser'
import ConfirmDialog from './ConfirmDialog'
import { getBadgesForDate, getXPForDate } from '../utils/storage'
import { badgeColor } from '../utils/badgeColor'

function DateHeader({ date, dayId, isToday, lines, onApplyTemplate }) {
    const [showMenu, setShowMenu] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)

    // Parent re-renders on store changes, so these are always current
    const badges = getBadgesForDate(dayId)
    const dayXP = getXPForDate(dayId)

    return (
        <div className="date-header sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b-2 border-line px-4 md:px-8 lg:px-16 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-journal font-semibold text-ink truncate">
                    {date}
                    {isToday && <span className="ml-2 text-xs align-middle bg-ink text-white px-2 py-0.5 rounded">TODAY</span>}
                </h2>
                {dayXP > 0 && <div className="text-xs text-green-700 font-semibold">{dayXP} XP</div>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {badges.length > 0 && (
                    <div className="flex items-center gap-1 mr-2">
                        {badges.slice(0, 5).map((badge) => (
                            <div
                                key={badge.id}
                                className="w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                style={{ backgroundColor: badgeColor(badge.name) }}
                                title={`${badge.name} (+${badge.xpBoost} XP)`}
                            >
                                <span className="text-lg">{badge.icon}</span>
                            </div>
                        ))}
                        {badges.length > 5 && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-400 text-white text-xs font-bold shadow-md">
                                +{badges.length - 5}
                            </div>
                        )}
                    </div>
                )}

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-line/30 rounded-lg transition-colors"
                        aria-label="More options"
                    >
                        <svg className="w-6 h-6 text-ink" fill="currentColor" viewBox="0 0 16 16">
                            <circle cx="2" cy="8" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="14" cy="8" r="1.5" />
                        </svg>
                    </button>

                    {showMenu && (
                        <TemplateMenu
                            lines={lines}
                            onClose={() => setShowMenu(false)}
                            onBrowse={() => { setShowMenu(false); setShowBrowser(true) }}
                            onClear={() => { setShowMenu(false); setConfirmClear(true) }}
                        />
                    )}
                </div>
            </div>

            {showBrowser && (
                <TemplateBrowser
                    onClose={() => setShowBrowser(false)}
                    onApply={onApplyTemplate}
                />
            )}

            <ConfirmDialog
                isOpen={confirmClear}
                title="Clear this page"
                message="Reset all lines on this day to a single empty line? Completed tasks on this day will lose their XP."
                confirmText="Clear"
                onConfirm={() => {
                    onApplyTemplate({ lines: [{ type: 'text', content: '' }] })
                    setConfirmClear(false)
                }}
                onCancel={() => setConfirmClear(false)}
            />
        </div>
    )
}

export default DateHeader
