import { useState } from 'react'
import TemplateMenu from './TemplateMenu'
import TemplateBrowser from './TemplateBrowser'
import ConfirmDialog from './ConfirmDialog'
import RankBadge from './RankBadge'
import { getBadgesForDate, getDayLedger, getPlayer, getStreak, toggleStreakDay, setStreakReset } from '../utils/storage'
import { nextStreakRank } from '../game/engine.js'
import { todayId } from '../utils/date'
import { useFeedback } from '../hooks/useFeedback'
import { badgeColor } from '../utils/badgeColor'

function DateHeader({ date, dayId, isToday, lines, onApplyTemplate }) {
    const [showMenu, setShowMenu] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [confirmClear, setConfirmClear] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)
    const { showToast } = useFeedback()

    // Parent re-renders on store changes, so these are always current
    const badges = getBadgesForDate(dayId)
    const rec = getDayLedger(dayId)
    const player = isToday ? getPlayer() : null
    const streak = getStreak(dayId)
    const canTick = dayId <= todayId()

    const tapStreak = () => {
        if (!canTick) return
        const before = streak.rank
        toggleStreakDay(dayId)
        const after = getStreak(dayId)
        if (after.count > streak.count && after.rank && after.rank.name !== before?.name) {
            showToast(`${after.rank.name}! Day ${after.count}`, 'level', 3500)
        }
    }

    const next = nextStreakRank(streak.count)
    const streakTitle = streak.rank
        ? `${streak.rank.name} · day ${streak.count}${next ? ` · ${next.name} at day ${next.day}` : ''}`
        : `Unranked${next ? ` · ${next.name} at day ${next.day}` : ''}`

    return (
        <div className="date-header sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b-2 border-line px-4 md:px-8 lg:px-16 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-journal font-semibold text-ink truncate">
                    {date}
                    {isToday && <span className="ml-2 text-xs align-middle bg-ink text-white px-2 py-0.5 rounded">TODAY</span>}
                </h2>
                {(rec || player) && (
                    <div className="text-xs font-semibold flex flex-wrap gap-x-2">
                        {rec && rec.net !== 0 && <span className={rec.net > 0 ? 'text-green-700' : 'text-red-600'}>{rec.net > 0 ? '+' : ''}{rec.net} XP</span>}
                        {rec?.bonus > 0 && <span className="text-amber-600">({rec.bonus} materia bonus)</span>}
                        {rec?.penalty > 0 && <span className="text-red-600">−{rec.penalty} for {rec.missed} unfinished</span>}
                        {player && <span className="text-ink/60">Lv {player.level}</span>}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Streak rank: starts at yesterday's rank; tap = count today (+1), tap again = undo */}
                <button
                    onClick={tapStreak}
                    disabled={!canTick}
                    className={`flex flex-col items-center leading-none rounded-lg px-1 py-0.5 transition-transform ${canTick ? 'hover:scale-105 active:scale-95' : 'cursor-default'} ${streak.ticked ? '' : 'opacity-60'}`}
                    title={`${streakTitle}${canTick ? (streak.ticked ? ' · tap to undo' : ' · tap to count this day') : ''}`}
                    aria-pressed={streak.ticked}
                    aria-label={`Streak: ${streakTitle}`}
                >
                    <RankBadge rank={streak.rank} size={26} />
                    <span className="text-[10px] font-semibold text-ink/70 mt-0.5 whitespace-nowrap">
                        {streak.reset && !streak.ticked ? 'Reset' : streak.rank ? streak.rank.name : '—'}
                    </span>
                </button>

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
                            streakResetLabel={canTick ? (streak.reset ? 'Undo streak reset' : 'Reset streak from this day') : null}
                            onStreakReset={() => {
                                setShowMenu(false)
                                if (streak.reset) setStreakReset(dayId, false)
                                else setConfirmReset(true)
                            }}
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
                isOpen={confirmReset}
                title="Reset streak"
                message={`Start the streak over from this day? It's currently ${streak.rank ? `${streak.rank.name}, day ${streak.count}` : 'unranked'}. You can undo it from this menu.`}
                confirmText="Reset"
                onConfirm={() => {
                    setStreakReset(dayId, true)
                    setConfirmReset(false)
                }}
                onCancel={() => setConfirmReset(false)}
            />

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
