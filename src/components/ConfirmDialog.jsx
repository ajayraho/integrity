import { createPortal } from 'react-dom'

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmStyle = 'danger', showCancel = true }) {
    if (!isOpen) return null

    const confirmButtonClass = confirmStyle === 'danger'
        ? 'px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors'
        : 'px-4 py-2 bg-ink text-white rounded-lg font-medium hover:bg-ink/90 transition-colors'

    const content = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onCancel}>
            <div
                className="bg-white border-2 border-line rounded-lg shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <h3 className="text-xl font-bold text-ink mb-3">{title}</h3>
                )}
                <p className="text-ink mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-line rounded-lg hover:bg-line/30 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={confirmButtonClass}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}

export default ConfirmDialog
