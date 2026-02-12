import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(true)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
                setIsVisible(false)
                onClose?.()
            }, 300)
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    if (!isVisible) return null

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    const icon = type === 'success' ? '✨' : type === 'error' ? '❌' : 'ℹ️'

    return createPortal(
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
            }`}>
            <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[200px] max-w-md`}>
                <span className="text-xl">{icon}</span>
                <span className="font-semibold text-lg">{message}</span>
            </div>
        </div>,
        document.body
    )
}

// Toast Manager Component
export function ToastManager({ toasts, removeToast }) {
    return (
        <>
            {toasts.map((toast, index) => (
                <div key={toast.id} style={{ top: `${24 + index * 80}px` }}>
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration || 3000}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </>
    )
}

export default Toast
