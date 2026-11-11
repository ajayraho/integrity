let pendingFocus = null

export function placeCaret(el, atEnd = true) {
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(!atEnd)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
}

/** Called by a line when it mounts: focus it if it was just requested. */
export function consumePendingFocus(lineId, el) {
    if (!pendingFocus || pendingFocus.lineId !== lineId || !el) return
    const { atEnd } = pendingFocus
    pendingFocus = null
    placeCaret(el, atEnd)
}

export function focusLine(lineId, atEnd = true) {
    // A brand-new line focuses itself as soon as it mounts (see consumePendingFocus),
    // so fast typing right after Enter lands in the new line.
    pendingFocus = { lineId, atEnd }
    // Fallback for lines that already exist (e.g. moving to the previous line)
    setTimeout(() => {
        if (pendingFocus?.lineId === lineId) pendingFocus = null
        const el = document.querySelector(`[data-line-id="${lineId}"]`)
        if (el && document.activeElement !== el) placeCaret(el, atEnd)
    }, 0)
}
