import { useState, useCallback } from 'react'

export function useToast() {
    const [toasts, setToasts] = useState([])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
        setToasts(prev => [...prev.slice(-3), { id, message, type, duration }])
        return id
    }, [])

    const showXPGain = useCallback((amount) => {
        if (amount > 0) showToast(`You gained +${amount} XP`, 'success', 2500)
    }, [showToast])

    const showXPLoss = useCallback((amount) => {
        const n = Math.abs(amount)
        if (n > 0) showToast(`You lost -${n} XP`, 'error', 2500)
    }, [showToast])

    return { toasts, showToast, removeToast, showXPGain, showXPLoss }
}
