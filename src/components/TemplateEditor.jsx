import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import EditableLine from './EditableLine'
import { updateTemplate } from '../utils/storage'

function TemplateEditor({ template, onClose, onSave }) {
    const [lines, setLines] = useState([])
    const [templateName, setTemplateName] = useState('')
    const [isDefault, setIsDefault] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)

    useEffect(() => {
        if (template) {
            setLines(template.lines || [{ id: `temp-${Date.now()}`, content: '', type: 'text' }])
            setTemplateName(template.name || 'Untitled Template')
            setIsDefault(template.isDefault || false)
        }

        // Prevent background scroll
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = ''
        }
    }, [template])

    const addLine = useCallback((afterIndex) => {
        const newLine = {
            id: `temp-${Date.now()}`,
            content: '',
            type: 'text'
        }
        setLines(prev => {
            const newLines = [...prev]
            newLines.splice(afterIndex + 1, 0, newLine)
            return newLines
        })
        return newLine.id
    }, [])

    const updateLine = useCallback((lineId, content, type) => {
        setLines(prev => prev.map(line =>
            line.id === lineId ? { ...line, content, type } : line
        ))
    }, [])

    const deleteLine = useCallback((lineId) => {
        setLines(prev => {
            if (prev.length === 1) return prev // Keep at least one line

            const lineIndex = prev.findIndex(line => line.id === lineId)
            const newLines = prev.filter(line => line.id !== lineId)

            // Return the previous line's ID if it exists for focus handling
            if (lineIndex > 0) {
                setTimeout(() => {
                    const prevLine = document.querySelector(`[data-line-id="${prev[lineIndex - 1].id}"]`)
                    if (prevLine) {
                        prevLine.focus()
                        const range = document.createRange()
                        const selection = window.getSelection()
                        range.selectNodeContents(prevLine)
                        range.collapse(false)
                        selection.removeAllRanges()
                        selection.addRange(range)
                    }
                }, 0)
            }

            return newLines
        })
    }, [])

    const handleSave = () => {
        if (!templateName.trim()) {
            alert('Please enter a template name')
            return
        }

        const updatedTemplate = {
            ...template,
            name: templateName.trim(),
            isDefault: isDefault,
            lines: lines.map(line => ({
                type: line.type,
                content: line.content || ''
            })),
            updatedAt: new Date().toISOString()
        }

        updateTemplate(template.id, updatedTemplate)
        onSave(updatedTemplate)
        onClose()
    }

    const editorContent = (
        <div
            className="fixed inset-0 bg-paper z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b-2 border-line px-4 md:px-8 lg:px-16 py-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                        {isEditingName ? (
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingName(false)
                                    if (e.key === 'Escape') {
                                        setTemplateName(template.name)
                                        setIsEditingName(false)
                                    }
                                }}
                                className="text-xl md:text-2xl font-bold text-ink border-b-2 border-ink outline-none bg-transparent"
                                autoFocus
                            />
                        ) : (
                            <h2
                                className="text-xl md:text-2xl font-bold text-ink cursor-pointer hover:text-ink/70"
                                onClick={() => setIsEditingName(true)}
                            >
                                ✏️ {templateName}
                            </h2>
                        )}
                        {isDefault && (
                            <span className="text-xs bg-ink text-white px-2 py-1 rounded">
                                DEFAULT
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="text-ink/60 hover:text-ink text-3xl leading-none px-3"
                    >
                        ×
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-ink">Set as default template</span>
                    </label>

                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-line rounded-lg text-sm hover:bg-line/30 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
                        >
                            💾 Save Template
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Area - Same as day section */}
            <div
                className="flex-1 overflow-y-auto"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        transparent,
                        transparent 31px,
                        #D1E5F4 31px,
                        #D1E5F4 32px
                    )`,
                    backgroundPosition: '0 104px',
                    paddingTop: '16px'
                }}
            >
                <div className="lines-container px-4 md:px-8 lg:px-16 min-h-screen" style={{ paddingTop: '24px' }}>
                    {lines.map((line, index) => (
                        <EditableLine
                            key={`${line.id}-${line.type}`}
                            line={line}
                            dayId="template-editor"
                            onUpdate={updateLine}
                            onEnter={() => addLine(index)}
                            onDelete={() => deleteLine(line.id)}
                            autoFocus={index === 0}
                        />
                    ))}
                </div>
            </div>

            {/* Helper Text */}
            <div className="border-t-2 border-line bg-white px-4 md:px-8 lg:px-16 py-3">
                <p className="text-sm text-ink/60 text-center">
                    💡 Edit your template structure. Use the three-dot menu on each line to change its type. Content can be used as placeholders.
                </p>
            </div>
        </div>
    )

    // Render using portal to document.body
    return createPortal(editorContent, document.body)
}

export default TemplateEditor
