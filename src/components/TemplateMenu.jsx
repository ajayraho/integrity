import { useState, useRef, useEffect } from 'react'
import { saveTemplate } from '../utils/storage'
import { templateLine } from '../utils/lineOps'

function TemplateMenu({ lines, onClose, onBrowse, onClear, streakResetLabel, onStreakReset }) {
    const menuRef = useRef(null)
    const [showNameInput, setShowNameInput] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [setAsDefault, setSetAsDefault] = useState(false)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [onClose])

    const handleSaveTemplate = () => {
        if (!templateName.trim()) return
        saveTemplate({
            name: templateName.trim(),
            isDefault: setAsDefault,
            // Keep structure + text as placeholders; drop per-day state (checks, XP, times)
            lines: lines.map(line => templateLine(line)),
        })
        onClose()
    }

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 bg-white border-2 border-line shadow-lg rounded-lg z-20 min-w-[220px]"
        >
            {showNameInput ? (
                <div className="p-4 min-w-[250px]">
                    <h3 className="text-sm font-semibold text-ink mb-3">Save Template</h3>
                    <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTemplate()
                            if (e.key === 'Escape') setShowNameInput(false)
                        }}
                        placeholder="Template name..."
                        className="w-full px-3 py-2 border border-line rounded-lg mb-3 text-sm outline-none focus:border-ink"
                        autoFocus
                    />
                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={setAsDefault}
                            onChange={(e) => setSetAsDefault(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-ink">Set as default for new days</span>
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveTemplate}
                            disabled={!templateName.trim()}
                            className="flex-1 px-3 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setShowNameInput(false)}
                            className="px-3 py-2 border border-line rounded-lg text-sm hover:bg-line/30 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="py-2">
                    <button
                        onClick={() => setShowNameInput(true)}
                        className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                    >
                        💾 Save as Template
                    </button>
                    <button
                        onClick={onBrowse}
                        className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                    >
                        📋 Browse Templates
                    </button>
                    <button
                        onClick={onClear}
                        className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink border-t border-line"
                    >
                        🗑️ Clear this page
                    </button>
                    {streakResetLabel && (
                        <button
                            onClick={onStreakReset}
                            className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
                        >
                            🔁 {streakResetLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default TemplateMenu
