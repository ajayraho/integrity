import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [isExiting, setIsExiting] = useState(false)
    const onCloseRef = useRef(onClose)
    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    useEffect(() => {
        let inner
        const timer = setTimeout(() => {
            setIsExiting(true)
            inner = setTimeout(() => onCloseRef.current?.(), 300)
        }, duration)
        return () => {
            clearTimeout(timer)
            clearTimeout(inner)
        }
    }, [duration])

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    const icon = type === 'success' ? '✨' : type === 'error' ? '❌' : 'ℹ️'

    return (
        <div className={`transition-all duration-300 ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[200px] max-w-md`}>
                <span className="text-xl">{icon}</span>
                <span className="font-semibold text-lg">{message}</span>
            </div>
        </div>
    )
}

/** Stacks toasts vertically at the top of the screen. */
export function ToastStack({ toasts, removeToast }) {
    return createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 pointer-events-none px-4">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>,
        document.body
    )
}

export default Toast
