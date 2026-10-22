import { uid } from './date'

export const newLine = (type = 'text') => ({ id: uid(), type, content: '' })

export function insertAfter(lines, index, line = newLine()) {
    return [...lines.slice(0, index + 1), line, ...lines.slice(index + 1)]
}

export function patchLine(lines, lineId, patch) {
    return lines.map(l => (l.id === lineId ? { ...l, ...patch } : l))
}

export function removeLine(lines, lineId) {
    return lines.filter(l => l.id !== lineId)
}

/** Radio lines next to each other form one group: selecting one clears the others. */
export function selectRadio(lines, lineId) {
    const idx = lines.findIndex(l => l.id === lineId)
    if (idx === -1) return lines
    let start = idx
    let end = idx
    while (start > 0 && lines[start - 1].type === 'radio') start--
    while (end < lines.length - 1 && lines[end + 1].type === 'radio') end++
    const wasSelected = Boolean(lines[idx].selected)
    return lines.map((l, i) => {
        if (i < start || i > end) return l
        return { ...l, selected: i === idx ? !wasSelected : false }
    })
}

/** Template lines -> fresh day lines with new ids. */
export function linesFromTemplate(template) {
    const src = template?.lines?.length ? template.lines : [{ type: 'text', content: '' }]
    return src.map(l => ({ id: uid(), type: l.type || 'text', content: l.content || '' }))
}
