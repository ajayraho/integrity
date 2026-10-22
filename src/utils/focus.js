export function focusLine(lineId, atEnd = true) {
    // Wait for React to render the new/changed line
    setTimeout(() => {
        const el = document.querySelector(`[data-line-id="${lineId}"]`)
        if (!el) return
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(!atEnd)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
    }, 0)
}
