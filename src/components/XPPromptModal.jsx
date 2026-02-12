import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function XPPromptModal({ isOpen, onConfirm, onCancel, defaultValue = 10 }) {
    const [xpValue, setXpValue] = useState(defaultValue)

    useEffect(() => {
        setXpValue(defaultValue)
    }, [defaultValue, isOpen])

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onConfirm(parseInt(xpValue) || 0)
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-paper rounded-lg shadow-2xl w-full max-w-md border-2 border-line">
                <div className="bg-ink text-white px-6 py-4">
                    <h2 className="text-xl font-bold">🎯 Set Task XP</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-ink mb-4">
                        How much XP should you earn for completing this task?
                    </p>

                    <input
                        type="number"
                        value={xpValue}
                        onChange={(e) => setXpValue(e.target.value)}
                        min="0"
                        max="1000"
                        autoFocus
                        className="w-full px-4 py-3 border-2 border-line rounded-lg outline-none focus:border-ink text-center text-2xl font-bold"
                        placeholder="10"
                    />

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2 border-2 border-line rounded-lg hover:bg-line/20 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink/90 transition-colors"
                        >
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default XPPromptModal
