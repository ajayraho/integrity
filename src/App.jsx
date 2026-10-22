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
import { initStore, teardownStore, flush, checkRewards } from './utils/storage'
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

    const celebrate = useCallback((xpDelta, dateId) => {
        if (xpDelta > 0) {
            showXPGain(xpDelta)
            if (dateId) {
                const { badges, medal } = checkRewards(dateId)
                badges.forEach(showBadge)
                if (medal) showMedal(medal)
            }
        } else if (xpDelta < 0) {
            showXPLoss(xpDelta)
        }
    }, [showXPGain, showXPLoss, showBadge, showMedal])

    const feedback = useMemo(() => ({
        showToast, showXPGain, showXPLoss, showBadge, showMedal, celebrate,
    }), [showToast, showXPGain, showXPLoss, showBadge, showMedal, celebrate])

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
