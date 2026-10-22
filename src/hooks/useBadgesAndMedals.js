import { useState, useCallback } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

/** Queues unlock animations so several rewards at once are shown one after another. */
export function useBadgesAndMedals() {
    const [badgeQueue, setBadgeQueue] = useState([])
    const [medalQueue, setMedalQueue] = useState([])

    const showBadge = useCallback((badge) => {
        if (badge) setBadgeQueue(q => [...q, badge])
    }, [])

    const hideBadge = useCallback(() => {
        setBadgeQueue(q => q.slice(1))
    }, [])

    const showMedal = useCallback((medal) => {
        if (medal) setMedalQueue(q => [...q, { medal, monthName: MONTHS[(medal.month || 1) - 1] }])
    }, [])

    const hideMedal = useCallback(() => {
        setMedalQueue(q => q.slice(1))
    }, [])

    return {
        badgeNotification: badgeQueue[0] || null,
        showBadge,
        hideBadge,
        medalNotification: medalQueue[0] || null,
        showMedal,
        hideMedal,
    }
}
