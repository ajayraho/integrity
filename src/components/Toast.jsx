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

    const STYLES = {
        success: { cls: 'bg-green-500', icon: '✨' },
        error: { cls: 'bg-red-500', icon: '❌' },
        info: { cls: 'bg-blue-500', icon: 'ℹ️' },
        level: { cls: 'bg-gradient-to-r from-amber-500 to-yellow-400', icon: '⬆️' },
        materia: { cls: 'bg-emerald-600', icon: '💠' },
    }
    const { cls: bgColor, icon } = STYLES[type] || STYLES.info

    return (
        <div className={`transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className={`${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[min(28rem,calc(100vw-2rem))]`}>
                <span className="text-base flex-shrink-0">{icon}</span>
                <span className="font-semibold text-sm leading-snug">{message}</span>
            </div>
        </div>
    )
}

/** Stacks toasts vertically at the top of the screen. */
export function ToastStack({ toasts, removeToast }) {
    return createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col-reverse items-center gap-2 pointer-events-none w-full px-4">
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
