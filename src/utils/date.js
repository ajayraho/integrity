// All day ids are local-calendar dates in YYYY-MM-DD form.
// Never use toISOString() for day ids: it converts to UTC and shifts the day
// in timezones ahead of UTC (e.g. IST).

const pad = (n) => String(n).padStart(2, '0')

export function toDateId(date) {
    const d = date instanceof Date ? date : new Date(date)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateId(id) {
    const [y, m, d] = id.split('-').map(Number)
    return new Date(y, m - 1, d)
}

export function todayId() {
    return toDateId(new Date())
}

export function addDays(id, delta) {
    const d = fromDateId(id)
    d.setDate(d.getDate() + delta)
    return toDateId(d)
}

// Move by whole months, clamping the day so 31 Oct + 1 month = 30 Nov (not 1 Dec).
export function addMonths(date, delta) {
    const d = new Date(date)
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + delta)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, last))
    return d
}

export function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate()
}

// Value for <input type="datetime-local"> in local time.
export function toLocalInputValue(date) {
    const d = new Date(date)
    return `${toDateId(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatLongDate(id) {
    const d = fromDateId(id)
    const day = d.getDate()
    const suffix = ['th', 'st', 'nd', 'rd']
    const v = day % 100
    const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0]
    const month = d.toLocaleDateString('en-US', { month: 'long' })
    return `${month} ${day}${ordinal}, ${d.getFullYear()}`
}

export function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
