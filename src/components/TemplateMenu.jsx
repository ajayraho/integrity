import { useState, useRef, useEffect } from 'react'
import { saveTemplate, loadTemplates } from '../utils/storage'

function TemplateMenu({ dayId, onClose }) {
    const menuRef = useRef(null)
    const [showNameInput, setShowNameInput] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [setAsDefault, setSetAsDefault] = useState(false)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSaveTemplate = () => {
        if (templateName.trim()) {
            saveTemplate({
                name: templateName,
                isDefault: setAsDefault,
                dayId: dayId,
                createdAt: new Date().toISOString()
            })
            alert(`Template "${templateName}" saved!`)
            onClose()
        }
    }

    if (showNameInput) {
        return (
            <div
                ref={menuRef}
                className="absolute right-0 top-12 bg-white border-2 border-line shadow-lg rounded-lg p-4 z-20 min-w-[250px]"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-sm font-semibold text-ink mb-3">Save Template</h3>
                <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
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
                        className="flex-1 px-3 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
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
        )
    }

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 bg-white border-2 border-line shadow-lg rounded-lg py-2 z-20 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => setShowNameInput(true)}
                className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
            >
                💾 Save as Template
            </button>
            <button
                onClick={() => {
                    const templates = loadTemplates()
                    if (templates.length > 0) {
                        alert(`Saved templates:\n${templates.map(t => `- ${t.name}${t.isDefault ? ' (default)' : ''}`).join('\n')}`)
                    } else {
                        alert('No templates saved yet.')
                    }
                }}
                className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
            >
                📋 View Templates
            </button>
        </div>
    )
}

export default TemplateMenu
