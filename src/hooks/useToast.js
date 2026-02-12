import { useState, useCallback } from 'react'

export function useToast() {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        const toast = { id, message, type, duration }
        
        setToasts(prev => [...prev, toast])

        // Auto-remove after duration + animation time
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration + 500)

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showXPGain = useCallback((amount) => {
        showToast(`You gained +${amount} XP`, 'success', 2500)
    }, [showToast])

    const showXPLoss = useCallback((amount) => {
        showToast(`You lost -${amount} XP`, 'error', 2500)
    }, [showToast])

    return {
        toasts,
        showToast,
        removeToast,
        showXPGain,
        showXPLoss
    }
}
