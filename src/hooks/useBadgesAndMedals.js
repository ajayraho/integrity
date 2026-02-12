import { useState, useCallback } from 'react'

export function useBadgesAndMedals() {
    const [badgeNotification, setBadgeNotification] = useState(null)
    const [medalNotification, setMedalNotification] = useState(null)

    const showBadge = useCallback((badge) => {
        setBadgeNotification(badge)
    }, [])

    const hideBadge = useCallback(() => {
        setBadgeNotification(null)
    }, [])

    const showMedal = useCallback((medal, monthName) => {
        setMedalNotification({ medal, monthName })
    }, [])

    const hideMedal = useCallback(() => {
        setMedalNotification(null)
    }, [])

    return {
        badgeNotification,
        showBadge,
        hideBadge,
        medalNotification,
        showMedal,
        hideMedal
    }
}
