import { useState, useEffect, useMemo, useCallback } from 'react'
import JournalView from './components/JournalView'
import HabitTrackerView from './components/HabitTrackerView'
import CalendarView from './components/CalendarView'
import TimelineView from './components/TimelineView'
import GridView from './components/GridView'
import XPStatsView from './components/XPStatsView'
import HabitManagement from './components/HabitManagement'
import NavigationButton from './components/NavigationButton'
import Login from './components/Login'
import { ToastStack } from './components/Toast'
import SaveStatus from './components/SaveStatus'
import BackupModal from './components/BackupModal'
import BadgeUnlockNotification from './components/BadgeUnlockNotification'
import MedalUnlockNotification from './components/MedalUnlockNotification'
import { useToast } from './hooks/useToast'
import { useBadgesAndMedals } from './hooks/useBadgesAndMedals'
import { FeedbackContext } from './hooks/useFeedback'
import { startReminderScheduler } from './utils/notifications'
import { watchAuth, logout } from './utils/auth'
import { initStore, teardownStore, flush, gameSnapshot, getMateriaStats, getLedger, getPenaltiesSince } from './utils/storage'
import { materiaName } from './game/engine.js'
import { todayId, addDays } from './utils/date'
import { firebaseConfigured } from './utils/firebase'
import './App.css'

function App() {
    const [currentView, setCurrentView] = useState('continuous')
    const [focusDayId, setFocusDayId] = useState(null)
    const [showHabitManagement, setShowHabitManagement] = useState(false)
    const [showBackup, setShowBackup] = useState(false)
    const [user, setUser] = useState(undefined) // undefined = still checking
    const [readyUid, setReadyUid] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [retryKey, setRetryKey] = useState(0)
    const { toasts, showXPGain, showXPLoss, showToast, removeToast } = useToast()
    const { badgeNotification, showBadge, hideBadge, medalNotification, showMedal, hideMedal } = useBadgesAndMedals()

    useEffect(() => watchAuth(u => setUser(u || null)), [])

    const ready = Boolean(user && readyUid === user.uid)

    useEffect(() => {
        if (!user) {
            teardownStore()
            return
        }
        let cancelled = false
        initStore(user.uid)
            .then(() => {
                if (!cancelled) {
                    setLoadError('')
                    setReadyUid(user.uid)
                }
            })
            .catch(err => {
                if (!cancelled) setLoadError('Could not load your data: ' + (err.code || err.message))
            })
        return () => { cancelled = true }
    }, [user, retryKey])

    useEffect(() => {
        if (!ready) return
        return startReminderScheduler()
    }, [ready])

    const handleLogout = async () => {
        await flush()
        teardownStore()
        await logout()
        setReadyUid(null)
        setFocusDayId(null)
        setCurrentView('continuous')
    }

    /**
     * Run a change and give game feedback: XP gained/lost (including materia
     * boosts and badges), new badges and medals, level ups and materia level ups.
     * Everything is derived, so we just compare before and after.
     */
    const act = useCallback((dayId, fn) => {
        const before = gameSnapshot()
        fn()
        const after = gameSnapshot()
        const L = getLedger()
        const newBadges = L.badges.filter(b => !before.badgeIds.has(b.id))
        const badgeXP = newBadges.reduce((s, b) => s + (Number(b.xpBoost) || 0), 0)
        const delta = after.totalXP - before.totalXP - badgeXP
        if (delta > 0) showXPGain(delta)
        else if (delta < 0) showXPLoss(delta)
        newBadges.forEach(showBadge)
        L.medals.filter(m => !before.medalIds.has(m.id)).forEach(showMedal)
        if (after.level > before.level) showToast(`LEVEL UP! You reached Lv ${after.level}`, 'level', 4000)
        if (after.slots > before.slots) showToast('New materia slot unlocked!', 'materia', 4000)
        getMateriaStats().forEach(m => {
            const was = before.materia[m.id]
            if (was && after.materia[m.id] > was) {
                const head = m.name !== materiaName(m, was) ? `${m.name} learned!` : `${m.name} reached Lv ${m.level}!`
                showToast(`${head} ${m.category || 'Its'} quests ×${m.multiplier} from tomorrow`, 'materia', 5000)
            }
        })
    }, [showXPGain, showXPLoss, showBadge, showMedal, showToast])

    // Once per day on open: report missed quests and decaying materia
    useEffect(() => {
        if (!ready || !user) return
        const key = `integrity_last_seen_${user.uid}`
        let lastSeen = null
        try { lastSeen = localStorage.getItem(key) } catch { /* ignore */ }
        const today = todayId()
        if (lastSeen === today) return
        const yesterday = addDays(today, -1)
        const penalties = getPenaltiesSince(lastSeen).filter(p => p.date <= yesterday)
        if (penalties.length) {
            const xp = penalties.reduce((s, p) => s + p.penalty, 0)
            const missed = penalties.reduce((s, p) => s + p.missed, 0)
            showToast(`${missed} unfinished quest${missed === 1 ? '' : 's'}: −${xp} XP`, 'error', 6000)
        }
        getMateriaStats().filter(m => m.decaying).forEach(m => {
            showToast(`${m.name}${m.category ? ` (${m.category})` : ''} is losing AP: unused for ${m.idleDays} days`, 'materia', 6000)
        })
        try { localStorage.setItem(key, today) } catch { /* ignore */ }
    }, [ready, user, showToast])

    const feedback = useMemo(() => ({
        showToast, showXPGain, showXPLoss, showBadge, showMedal, act,
    }), [showToast, showXPGain, showXPLoss, showBadge, showMedal, act])

    const openDay = useCallback((dayId) => {
        setFocusDayId(dayId)
        setCurrentView('continuous')
    }, [])

    const goToView = useCallback((view) => {
        if (view === 'continuous') setFocusDayId(null)
        setCurrentView(view)
    }, [])

    if (!firebaseConfigured) {
        return (
            <div className="fixed inset-0 bg-paper flex items-center justify-center p-6 text-center text-ink">
                <div>
                    <div className="text-4xl mb-4">⚙️</div>
                    <p className="font-medium">Firebase isn't configured.</p>
                    <p className="text-sm text-ink/60 mt-2">Copy <code>.env.example</code> to <code>.env</code> and fill in your Firebase web app config.</p>
                </div>
            </div>
        )
    }

    if (user === undefined || (user && !ready && !loadError)) {
        return (
            <div className="fixed inset-0 bg-paper flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">📔</div>
                    <div className="text-ink font-medium">Loading your data...</div>
                </div>
            </div>
        )
    }

    if (!user) return <Login />

    if (loadError) {
        return (
            <div className="fixed inset-0 bg-paper flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-ink font-medium mb-4">{loadError}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => { setLoadError(''); setRetryKey(k => k + 1) }} className="px-4 py-2 bg-ink text-white rounded-lg">Retry</button>
                        <button onClick={handleLogout} className="px-4 py-2 border-2 border-line rounded-lg">Logout</button>
                    </div>
                </div>
            </div>
        )
    }

    const renderView = () => {
        switch (currentView) {
            case 'habit-tracker':
                return <HabitTrackerView />
            case 'xp-stats':
                return <XPStatsView />
            case 'calendar':
                return <CalendarView onOpenDay={openDay} />
            case 'timeline':
                return <TimelineView onOpenDay={openDay} />
            case 'grid':
                return <GridView onOpenDay={openDay} />
            case 'continuous':
            default:
                // Remount when asked to open a specific day
                return <JournalView key={focusDayId || 'today'} initialDayId={focusDayId} />
        }
    }

    return (
        <FeedbackContext.Provider value={feedback}>
            <div className="app min-h-screen bg-paper">
                {renderView()}

                <SaveStatus />

                <NavigationButton
                    currentView={currentView}
                    onViewChange={goToView}
                    onManageHabits={() => setShowHabitManagement(true)}
                    onBackup={() => setShowBackup(true)}
                    onLogout={handleLogout}
                    userEmail={user.email}
                />

                {showHabitManagement && (
                    <HabitManagement onClose={() => setShowHabitManagement(false)} />
                )}

                {showBackup && (
                    <BackupModal onClose={() => setShowBackup(false)} />
                )}

                <ToastStack toasts={toasts} removeToast={removeToast} />

                {badgeNotification && (
                    <BadgeUnlockNotification
                        key={badgeNotification.id}
                        badge={badgeNotification}
                        onClose={hideBadge}
                    />
                )}

                {medalNotification && (
                    <MedalUnlockNotification
                        key={medalNotification.medal.id}
                        medal={medalNotification.medal}
                        monthName={medalNotification.monthName}
                        onClose={hideMedal}
                    />
                )}
            </div>
        </FeedbackContext.Provider>
    )
}

export default App
