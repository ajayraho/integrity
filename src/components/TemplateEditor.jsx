import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import EditableLine from './EditableLine'
import { focusLine } from '../utils/focus'
import { updateTemplate } from '../utils/storage'
import { insertAfter, patchLine, removeLine, newLine, templateLine } from '../utils/lineOps'
import { uid } from '../utils/date'

function TemplateEditor({ template, onClose, onSave }) {
    // Old templates were saved without line ids; give every line one so edits
    // only touch the line being edited.
    const [lines, setLines] = useState(() => {
        const src = template?.lines?.length ? template.lines : [{ type: 'text', content: '' }]
        return src.map(l => templateLine(l, l.id || uid()))
    })
    const [templateName, setTemplateName] = useState(template?.name || 'Untitled Template')
    const [isDefault, setIsDefault] = useState(Boolean(template?.isDefault))
    const [isEditingName, setIsEditingName] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const addLine = (afterIndex) => {
        const line = newLine()
        setLines(prev => insertAfter(prev, afterIndex, line))
        focusLine(line.id)
    }

    const updateLine = (lineId, patch) => {
        setLines(prev => patchLine(prev, lineId, patch))
    }

    const deleteLine = (index) => {
        if (lines.length === 1) return
        const target = index > 0 ? lines[index - 1] : lines[1]
        setLines(prev => removeLine(prev, lines[index].id))
        focusLine(target.id, index > 0)
    }

    const handleSave = () => {
        if (!templateName.trim()) {
            setError('Please enter a template name')
            return
        }
        const updatedTemplate = {
            ...template,
            name: templateName.trim(),
            isDefault,
            lines: lines.map(line => templateLine(line, line.id)),
        }
        updateTemplate(template.id, updatedTemplate)
        onSave?.(updatedTemplate)
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

                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                <div className="flex items-center gap-4 flex-wrap">
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
                            key={line.id}
                            line={line}
                            mode="template"
                            onChange={(patch) => updateLine(line.id, patch)}
                            onTypeChange={(type) => updateLine(line.id, { type })}
                            onEnter={() => addLine(index)}
                            onDelete={() => deleteLine(index)}
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
