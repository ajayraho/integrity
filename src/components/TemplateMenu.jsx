import { useState, useRef, useEffect } from 'react'
import { saveTemplate } from '../utils/storage'
import TemplateBrowser from './TemplateBrowser'
import ConfirmDialog from './ConfirmDialog'

function TemplateMenu({ dayId, dayDate, lines, onClose, onApplyTemplate }) {
    const menuRef = useRef(null)
    const [showNameInput, setShowNameInput] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [setAsDefault, setSetAsDefault] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })

    // Check if this day is today or in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentDayDate = new Date(dayDate)
    currentDayDate.setHours(0, 0, 0, 0)
    const isTodayOrFuture = currentDayDate >= today

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
            // Save template with actual line structure (without IDs and content)
            const templateLines = lines.map(line => ({
                type: line.type,
                content: line.content || '' // Keep content as placeholder/example
            }))

            saveTemplate({
                name: templateName,
                isDefault: setAsDefault,
                lines: templateLines,
                createdAt: new Date().toISOString()
            })

            setShowNameInput(false)
            setTemplateName('')
            setSetAsDefault(false)
            onClose()
        }
    }

    if (showBrowser) {
        return (
            <TemplateBrowser
                onClose={() => {
                    setShowBrowser(false)
                    onClose()
                }}
                onApply={onApplyTemplate}
            />
        )
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
                onClick={() => setShowBrowser(true)}
                className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink"
            >
                📋 Browse Templates
            </button>
            {isTodayOrFuture && (
                <button
                    onClick={() => {
                        console.log('Clear today button clicked')
                        setConfirmDialog({
                            isOpen: true,
                            action: () => {
                                console.log('Applying empty template')
                                // Apply empty template (single empty line)
                                onApplyTemplate({ lines: [{ type: 'text', content: '' }] })
                                onClose()
                                setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
                            },
                            title: 'Clear Today\'s Template',
                            message: 'Clear today\'s template? This will reset all lines to a single empty line.'
                        })
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-line/30 transition-colors text-sm text-ink border-t border-line"
                >
                    🗑️ Clear Today's Template
                </button>
            )}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
            />
        </div>
    )
}

export default TemplateMenu
