import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadTemplates, deleteTemplate, updateTemplate, clearDefaultTemplate, getDefaultTemplate } from '../utils/storage'
import { useStoreVersion } from '../hooks/useStore'
import TemplateEditor from './TemplateEditor'
import ConfirmDialog from './ConfirmDialog'

function TemplateBrowser({ onClose, onApply }) {
    useStoreVersion() // live list
    const templates = loadTemplates().filter(t => !t.isHidden)
    const [selectedId, setSelectedId] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })
    const selectedTemplate = templates.find(t => t.id === selectedId) || null
    const closeConfirm = () => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })

    useEffect(() => {
        // Prevent background scroll when modal is open
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const handleDelete = (templateId) => {
        setConfirmDialog({
            isOpen: true,
            action: () => {
                deleteTemplate(templateId)
                if (selectedId === templateId) setSelectedId(null)
                closeConfirm()
            },
            title: 'Delete Template',
            message: 'Are you sure you want to delete this template? This action cannot be undone.'
        })
    }

    const handleSetDefault = (templateId) => {
        updateTemplate(templateId, { isDefault: true })
    }

    const handleRename = (templateId) => {
        if (editName.trim()) {
            updateTemplate(templateId, { name: editName.trim() })
            setEditingId(null)
            setEditName('')
        }
    }

    const handleApply = (template) => {
        setConfirmDialog({
            isOpen: true,
            action: () => {
                onApply(template)
                closeConfirm()
                onClose()
            },
            title: 'Apply Template',
            message: `Replace this day's lines with "${template.name}"? Completed tasks on this day will lose their XP.`,
            confirmText: 'Apply',
            confirmStyle: 'primary',
        })
    }

    const handleEdit = (template) => {
        setEditingTemplate(template)
    }

    const handleClearDefault = () => {
        if (getDefaultTemplate()) {
            setConfirmDialog({
                isOpen: true,
                action: () => {
                    clearDefaultTemplate()
                    closeConfirm()
                },
                title: 'Clear Default Template',
                message: 'Clear default template? New days will start with a single empty line instead of the default template.'
            })
        } else {
            setConfirmDialog({
                isOpen: true,
                action: closeConfirm,
                title: 'No Default Template',
                message: 'No default template is currently set.',
                confirmText: 'OK',
                confirmStyle: 'primary',
                showCancel: false
            })
        }
    }

    const getLineTypeIcon = (type) => {
        switch (type) {
            case 'checkbox': return '☐'
            case 'radio': return '◯'
            case 'checkbox-time': return '☐🕐'
            default: return '—'
        }
    }

    // If editing a template, show the editor
    if (editingTemplate) {
        return (
            <TemplateEditor
                template={editingTemplate}
                onClose={() => setEditingTemplate(null)}
                onSave={(t) => setSelectedId(t.id)}
            />
        )
    }

    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-paper border-4 border-line rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b-2 border-line p-6 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-2xl font-bold text-ink">📋 Templates</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearDefault}
                                className="px-3 py-1.5 text-sm border border-line rounded-lg hover:bg-line/30 transition-colors text-ink"
                            >
                                🗑️ Clear Default
                            </button>
                            <button
                                onClick={onClose}
                                className="text-ink/60 hover:text-ink text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    {templates.length === 0 && (
                        <p className="text-sm text-ink/60">No templates saved yet. Save your first template from a day's menu!</p>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
                    {/* Template List */}
                    <div className="sm:w-1/3 max-h-40 sm:max-h-none border-b-2 sm:border-b-0 sm:border-r-2 border-line overflow-y-auto bg-white">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className={`p-4 border-b border-line cursor-pointer transition-colors ${selectedId === template.id ? 'bg-line/30' : 'hover:bg-line/10'
                                    }`}
                                onClick={() => setSelectedId(template.id)}
                            >
                                {editingId === template.id ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(template.id)
                                                if (e.key === 'Escape') setEditingId(null)
                                            }}
                                            className="w-full px-2 py-1 border border-line rounded text-sm"
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-ink">{template.name}</span>
                                            {template.isDefault && (
                                                <span className="text-xs bg-ink text-white px-2 py-0.5 rounded">
                                                    DEFAULT
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-ink/60 mt-1">
                                            {template.lines?.length || 0} lines
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Template Preview/Actions */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedTemplate ? (
                            <div>
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-ink mb-2">{selectedTemplate.name}</h3>
                                    <p className="text-sm text-ink/60">
                                        Created {new Date(selectedTemplate.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Line Preview */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-ink mb-3">Template Structure:</h4>
                                    <div className="space-y-2">
                                        {selectedTemplate.lines?.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-3 p-3 bg-white border border-line rounded-lg"
                                            >
                                                <span className="text-lg">{getLineTypeIcon(line.type)}</span>
                                                <div className="flex-1">
                                                    <div className="text-xs text-ink/60 mb-1 uppercase">{line.type}</div>
                                                    {line.content && (
                                                        <div className="text-sm text-ink">{line.content}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )) || <p className="text-sm text-ink/60 italic">Empty template</p>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleApply(selectedTemplate)}
                                        className="px-4 py-2 bg-ink text-white rounded-lg font-medium hover:bg-ink/90 transition-colors"
                                    >
                                        ✓ Apply to Current Day
                                    </button>

                                    <button
                                        onClick={() => handleEdit(selectedTemplate)}
                                        className="px-4 py-2 border-2 border-ink text-ink rounded-lg font-medium hover:bg-ink/10 transition-colors"
                                    >
                                        📝 Edit Template
                                    </button>

                                    {!selectedTemplate.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(selectedTemplate.id)}
                                            className="px-4 py-2 border-2 border-line text-ink rounded-lg hover:bg-line/30 transition-colors"
                                        >
                                            ⭐ Set as Default
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setEditingId(selectedTemplate.id)
                                            setEditName(selectedTemplate.name)
                                        }}
                                        className="px-4 py-2 border border-line text-ink rounded-lg hover:bg-line/30 transition-colors"
                                    >
                                        ✏️ Rename
                                    </button>

                                    <button
                                        onClick={() => handleDelete(selectedTemplate.id)}
                                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-ink/60">
                                {templates.length > 0 ? 'Select a template to view details' : 'No templates yet'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

    // Render using portal to document.body
    return (
        <>
            {createPortal(modalContent, document.body)}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                confirmStyle={confirmDialog.confirmStyle}
                showCancel={confirmDialog.showCancel}
            />
        </>
    )
}

export default TemplateBrowser
