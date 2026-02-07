import { useRef, useEffect, useState } from 'react'
import LineTypeMenu from './LineTypeMenu'

function EditableLine({ line, onUpdate, onEnter, onDelete, autoFocus }) {
    const contentRef = useRef(null)
    const [showTypeMenu, setShowTypeMenu] = useState(false)

    useEffect(() => {
        if (autoFocus && contentRef.current) {
            contentRef.current.focus()
        }
    }, [autoFocus])

    useEffect(() => {
        if (contentRef.current && line.content !== contentRef.current.innerText) {
            contentRef.current.innerText = line.content
        }
    }, [line.content])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const newLineId = onEnter()
            // Focus the new line after a short delay
            setTimeout(() => {
                const newLine = document.querySelector(`[data-line-id="${newLineId}"]`)
                if (newLine) newLine.focus()
            }, 0)
        } else if (e.key === 'Backspace' && contentRef.current.innerText === '') {
            e.preventDefault()
            onDelete()
        }
    }

    const handleInput = (e) => {
        onUpdate(line.id, e.target.innerText, line.type)
    }

    const renderLineContent = () => {
        switch (line.type) {
            case 'checkbox':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                            onChange={(e) => {
                                onUpdate(line.id, contentRef.current.innerText, line.type, e.target.checked)
                            }}
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Write something..."
                        />
                    </div>
                )

            case 'checkbox-time':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                        />
                        <input
                            type="time"
                            className="mt-0.5 px-2 py-0.5 border border-line rounded text-sm bg-transparent"
                            defaultValue="00:00"
                        />
                        <span className="mt-1.5">-</span>
                        <input
                            type="time"
                            className="mt-0.5 px-2 py-0.5 border border-line rounded text-sm bg-transparent"
                            defaultValue="00:00"
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Task..."
                        />
                    </div>
                )

            case 'radio':
                return (
                    <div className="flex items-start gap-2">
                        <input
                            type="radio"
                            name={`radio-group-${line.id}`}
                            className="mt-1.5 w-4 h-4 cursor-pointer"
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            data-line-id={line.id}
                            className="flex-1 outline-none text-ink bg-transparent"
                            style={{
                                minHeight: '32px',
                                lineHeight: '32px',
                                fontSize: '18px',
                                paddingTop: '0px'
                            }}
                            placeholder="Option..."
                        />
                    </div>
                )

            default:
                return (
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        data-line-id={line.id}
                        className="outline-none text-ink bg-transparent w-full"
                        style={{
                            minHeight: '32px',
                            lineHeight: '32px',
                            fontSize: '18px',
                            paddingTop: '0px'
                        }}
                        placeholder="Write something..."
                    />
                )
        }
    }

    return (
        <div className="editable-line flex items-start gap-2 group relative">
            <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-line/30 rounded mt-1"
                aria-label="Line options"
            >
                <svg
                    className="w-4 h-4 text-ink/60"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                >
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                </svg>
            </button>

            <div className="flex-1">
                {renderLineContent()}
            </div>

            {showTypeMenu && (
                <LineTypeMenu
                    currentType={line.type}
                    onSelect={(type) => {
                        onUpdate(line.id, line.content, type)
                        setShowTypeMenu(false)
                    }}
                    onClose={() => setShowTypeMenu(false)}
                />
            )}
        </div>
    )
}

export default EditableLine
