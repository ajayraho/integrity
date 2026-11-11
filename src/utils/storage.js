// Firestore-backed store.
//
// Data layout (one small document per thing, never one big blob):
//   users/{uid}/days/{YYYY-MM-DD}   { lines: [...], habits: {habitId: value}, habitXP: {habitId: xp} }
//   users/{uid}/habits/{id}         { name, type, icon, color, goal, xp, order, visible }
//   users/{uid}/templates/{id}      { name, isDefault, lines: [{id, type, content}] }
//   users/{uid}/badges/{id}         { type, name, icon, xpBoost, description, date }
//   users/{uid}/medals/{id}         { tier, name, icon, threshold, description, year, month, revoked? }
//   users/{uid}/reminders/{id}      { lineId, dayId, lineContent, datetime, recurring, customRecurring, enabled }
//   users/{uid}/materia/{id}        { type, customName, category, createdAt }
//   users/{uid}/meta/game           { startedAt: YYYY-MM-DD }  (penalties/decay only count from here)
//
// Components read synchronously from an in-memory cache that is kept live with
// onSnapshot listeners (so other devices' edits show up). Local edits update the
// cache immediately, are written to a localStorage write-ahead log (so nothing is
// lost if the tab closes), and are flushed to Firestore in debounced batches.
//
// XP is *derived* from the data (checked tasks, habit values, badges) rather than
// kept in a separate ledger, so it can never drift out of sync.

import {
    collection, doc, onSnapshot, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { toDateId, todayId, uid as makeId } from './date'
import { computeLedger, isQuest, questXP, computeStreak, streakRank } from '../game/engine.js'
import { templateLine } from './lineOps'

const COLLECTIONS = ['days', 'habits', 'templates', 'badges', 'medals', 'reminders', 'materia', 'meta']
const FLUSH_DELAY = 1500 // ms of quiet before writing
const FLUSH_MAX_WAIT = 10000 // never hold edits longer than this
const BATCH_LIMIT = 500 // Firestore max operations per batch

let userId = null
let state = emptyState()
let unsubscribers = []
let version = 0
const listeners = new Set()

// pending writes: key "col/id" -> { col, id, data (null = delete), seq }
const pending = new Map()
let seq = 0
let flushTimer = null
let firstPendingAt = null
let flushing = false

let status = 'saved' // 'saved' | 'saving' | 'offline' | 'error'
const statusListeners = new Set()

function emptyState() {
    return Object.fromEntries(COLLECTIONS.map(c => [c, new Map()]))
}

// ============= SUBSCRIPTIONS =============

export function subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
}

export function getVersion() {
    return version
}

function emit() {
    version++
    listeners.forEach(fn => fn())
}

export function subscribeStatus(fn) {
    statusListeners.add(fn)
    fn(status)
    return () => statusListeners.delete(fn)
}

function setStatus(s) {
    if (s === status) return
    status = s
    statusListeners.forEach(fn => fn(s))
}

// ============= LIFECYCLE =============

const walKey = () => `integrity_pending_${userId}`

export function initStore(uid) {
    teardownStore()
    userId = uid
    state = emptyState()

    // Replay edits that never reached Firestore (tab closed mid-save, etc.)
    try {
        const saved = JSON.parse(localStorage.getItem(walKey()) || '[]')
        saved.forEach(({ col, id, data }) => {
            if (!COLLECTIONS.includes(col)) return
            pending.set(`${col}/${id}`, { col, id, data, seq: ++seq })
            if (data) state[col].set(id, data)
        })
    } catch (e) {
        console.warn('Could not read pending edits', e)
    }

    return new Promise((resolve, reject) => {
        let remaining = COLLECTIONS.length
        let settled = false
        COLLECTIONS.forEach(col => {
            let first = true
            const unsub = onSnapshot(
                collection(db, 'users', uid, col),
                (snap) => {
                    snap.docChanges().forEach(change => {
                        const id = change.doc.id
                        // Local unsaved edit wins over the server copy
                        if (pending.has(`${col}/${id}`)) return
                        if (change.type === 'removed') state[col].delete(id)
                        else state[col].set(id, { ...change.doc.data(), id })
                    })
                    if (first) {
                        first = false
                        remaining--
                        if (remaining === 0 && !settled) {
                            settled = true
                            ensureGameMeta()
                            if (pending.size) scheduleFlush()
                            resolve({ success: true })
                        }
                    }
                    emit()
                },
                (error) => {
                    console.error(`Snapshot error (${col})`, error)
                    if (!settled) {
                        settled = true
                        reject(error)
                    } else {
                        setStatus('error')
                    }
                }
            )
            unsubscribers.push(unsub)
        })
    })
}

export function teardownStore() {
    unsubscribers.forEach(u => u())
    unsubscribers = []
    clearTimeout(flushTimer)
    flushTimer = null
    firstPendingAt = null
    pending.clear()
    userId = null
    state = emptyState()
    ephemeralDays.clear()
    emit()
}

// ============= WRITE PIPELINE =============

function persistWAL() {
    if (!userId) return
    try {
        const list = [...pending.values()].map(({ col, id, data }) => ({ col, id, data }))
        if (list.length) localStorage.setItem(walKey(), JSON.stringify(list))
        else localStorage.removeItem(walKey())
    } catch (e) {
        console.warn('Could not persist pending edits', e)
    }
}

function writeDoc(col, id, data) {
    const clean = data ? stripUndefined({ ...data, id }) : null
    if (clean) state[col].set(id, clean)
    else state[col].delete(id)
    pending.set(`${col}/${id}`, { col, id, data: clean, seq: ++seq })
    persistWAL()
    scheduleFlush()
    emit()
}

function stripUndefined(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function scheduleFlush() {
    if (!firstPendingAt) firstPendingAt = Date.now()
    clearTimeout(flushTimer)
    const wait = Math.max(0, Math.min(FLUSH_DELAY, FLUSH_MAX_WAIT - (Date.now() - firstPendingAt)))
    flushTimer = setTimeout(flush, wait)
    setStatus(navigator.onLine === false ? 'offline' : 'saving')
}

export async function flush() {
    clearTimeout(flushTimer)
    flushTimer = null
    if (!userId || pending.size === 0) {
        firstPendingAt = null
        if (pending.size === 0) setStatus('saved')
        return
    }
    if (flushing) {
        scheduleFlush()
        return
    }
    flushing = true
    firstPendingAt = null
    const uidAtStart = userId
    const items = [...pending.values()]
    try {
        for (let i = 0; i < items.length; i += BATCH_LIMIT) {
            const batch = writeBatch(db)
            items.slice(i, i + BATCH_LIMIT).forEach(({ col, id, data }) => {
                const ref = doc(db, 'users', uidAtStart, col, id)
                if (data) batch.set(ref, data)
                else batch.delete(ref)
            })
            await batch.commit()
        }
        if (userId === uidAtStart) {
            // Only clear entries that weren't edited again while we were saving
            items.forEach(item => {
                const key = `${item.col}/${item.id}`
                if (pending.get(key)?.seq === item.seq) pending.delete(key)
            })
            persistWAL()
            setStatus(pending.size ? 'saving' : 'saved')
        }
    } catch (error) {
        console.error('Save failed', error)
        setStatus('error')
        // keep pending; retry later
        setTimeout(() => { if (pending.size) scheduleFlush() }, 5000)
    } finally {
        flushing = false
        if (pending.size && !flushTimer && status !== 'error') scheduleFlush()
    }
}

if (typeof window !== 'undefined') {
    // Push edits out when the app is hidden/closed. The WAL covers the case
    // where the browser kills us before the batch is acknowledged.
    const flushNow = () => { if (pending.size) flush() }
    window.addEventListener('pagehide', flushNow)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushNow()
    })
    window.addEventListener('online', () => { if (pending.size) flush() })
    window.addEventListener('offline', () => { if (pending.size) setStatus('offline') })
}

export function hasPendingWrites() {
    return pending.size > 0
}

// ============= DAYS (journal entries) =============

const ephemeralDays = new Map()

function linesFromTemplate(template, dayId) {
    if (template?.lines?.length) {
        return template.lines.map(l => templateLine(l, makeId()))
    }
    return [{ id: `${dayId}-1`, type: 'text', content: '' }]
}

export function getDay(dayId) {
    return state.days.get(dayId) || null
}

/** Saved day, or a stable unsaved placeholder built from the default template. */
export function getDayOrDefault(dayId) {
    const saved = state.days.get(dayId)
    if (saved) return saved
    const tpl = getDefaultTemplate()
    const key = `${dayId}|${tpl?.id || ''}|${tpl?.updatedAt || ''}`
    let eph = ephemeralDays.get(dayId)
    if (!eph || eph.key !== key) {
        eph = { key, day: { id: dayId, lines: linesFromTemplate(tpl, dayId), habits: {}, habitXP: {}, unsaved: true } }
        ephemeralDays.set(dayId, eph)
    }
    return eph.day
}

export function getAllDays() {
    return [...state.days.values()]
}

export function saveDay(dayId, updates) {
    const current = getDayOrDefault(dayId)
    const next = { ...current, ...updates, id: dayId, updatedAt: new Date().toISOString() }
    delete next.unsaved
    ephemeralDays.delete(dayId)
    if (isDayEmpty(next) && !getDefaultTemplate()) {
        // Don't keep empty documents around (unless a default template exists,
        // in which case the empty doc records "this day was cleared")
        if (state.days.has(dayId)) writeDoc('days', dayId, null)
        else emit()
        return
    }
    writeDoc('days', dayId, next)
}

export function isDayEmpty(day) {
    if (!day) return true
    const hasLines = (day.lines || []).some(l => (l.content || '').trim() !== '' || l.checked || l.type !== 'text')
    const hasHabits = Object.values(day.habits || {}).some(v => v !== '' && v !== false && v != null)
    return !hasLines && !hasHabits && !day.streak && !day.streakReset
}

export function dayHasContent(day) {
    if (!day) return false
    return (day.lines || []).some(l => (l.content || '').trim() !== '') ||
        Object.values(day.habits || {}).some(v => v !== '' && v !== false && v != null)
}

// ============= TEMPLATES =============

export function loadTemplates() {
    return [...state.templates.values()].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export function saveTemplate(template) {
    const id = makeId()
    if (template.isDefault) clearDefaultTemplate()
    const lines = (template.lines || []).map(l => templateLine(l, l.id || makeId()))
    writeDoc('templates', id, { ...template, lines, id, createdAt: new Date().toISOString() })
    return id
}

export function updateTemplate(templateId, updates) {
    const t = state.templates.get(templateId)
    if (!t) return false
    if (updates.isDefault) clearDefaultTemplate(templateId)
    writeDoc('templates', templateId, { ...t, ...updates, updatedAt: new Date().toISOString() })
    return true
}

export function deleteTemplate(templateId) {
    if (!state.templates.has(templateId)) return false
    writeDoc('templates', templateId, null)
    return true
}

export function clearDefaultTemplate(exceptId = null) {
    state.templates.forEach(t => {
        if (t.isDefault && t.id !== exceptId) writeDoc('templates', t.id, { ...t, isDefault: false })
    })
}

export function getDefaultTemplate() {
    for (const t of state.templates.values()) {
        if (t.isDefault && !t.isHidden) return t
    }
    return null
}

// ============= HABITS =============

export function loadHabits() {
    return [...state.habits.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export function addHabit(habit) {
    const id = makeId()
    const maxOrder = Math.max(-1, ...loadHabits().map(h => h.order ?? 0))
    const h = { visible: true, ...habit, id, order: maxOrder + 1, createdAt: new Date().toISOString() }
    writeDoc('habits', id, h)
    return h
}

export function updateHabit(habitId, updates) {
    const h = state.habits.get(habitId)
    if (!h) return false
    writeDoc('habits', habitId, { ...h, ...updates })
    return true
}

export function saveHabitOrder(orderedHabits) {
    orderedHabits.forEach((h, index) => {
        const current = state.habits.get(h.id)
        if (current) writeDoc('habits', h.id, { ...current, order: index, visible: h.visible !== false })
    })
}

export function deleteHabit(habitId) {
    // Past days keep their values/XP so history stays intact.
    writeDoc('habits', habitId, null)
    return true
}

export function habitXPFor(habit, value) {
    if (!habit || !habit.xp) return 0
    if (habit.type === 'checkbox') return (value === true || value === 'true') ? habit.xp : 0
    if (habit.type === 'number') {
        const goal = Number(habit.goal) || 1
        const n = parseFloat(value) || 0
        return Math.round(Math.min(Math.max(n, 0) / goal, 1) * habit.xp)
    }
    return 0
}

/** Set one habit's value on a day. Returns the XP delta. */
export function setHabitValue(dayId, habitId, value) {
    const day = getDayOrDefault(dayId)
    const habit = state.habits.get(habitId)
    const oldXP = (day.habitXP || {})[habitId] || 0
    const newXP = habitXPFor(habit, value)
    saveDay(dayId, {
        habits: { ...(day.habits || {}), [habitId]: value },
        habitXP: { ...(day.habitXP || {}), [habitId]: newXP },
    })
    return newXP - oldXP
}

/** Clear all habit values on a day. Returns the XP delta (<= 0). */
export function resetHabits(dayId) {
    const day = getDayOrDefault(dayId)
    const removed = Object.values(day.habitXP || {}).reduce((s, x) => s + x, 0)
    saveDay(dayId, { habits: {}, habitXP: {} })
    return -removed
}

// ============= GAME: XP, materia, levels (derived) =============

function ensureGameMeta() {
    if (!state.meta.get('game')) writeDoc('meta', 'game', { startedAt: todayId() })
}

export function getGameStart() {
    return state.meta.get('game')?.startedAt || todayId()
}

let ledgerCache = { version: -1, today: null, ledger: null }

/** Full derived game state (cached per store version + date). */
export function getLedger() {
    const today = todayId()
    if (ledgerCache.version !== version || ledgerCache.today !== today) {
        ledgerCache = {
            version,
            today,
            ledger: computeLedger({
                days: [...state.days.values()],
                habits: [...state.habits.values()],
                badges: [...state.badges.values()],
                materia: loadMateria(),
                gameStart: getGameStart(),
                today,
            }),
        }
    }
    return ledgerCache.ledger
}

/** Base XP of a completed quest line (before materia boost). */
export function lineXP(line) {
    return isQuest(line) && line.checked ? questXP(line) : 0
}

export function getDayLedger(date) {
    return getLedger().days.get(date) || null
}

export function getXPForDate(date) {
    return getDayLedger(date)?.net || 0
}

export function getTotalXP() {
    return getLedger().totalXP
}

export function getPlayer() {
    return getLedger().player
}

/** @param month 1-based */
export function getXPForMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const out = []
    getLedger().days.forEach((rec, date) => {
        if (date.startsWith(prefix)) out.push({ date, total: rec.net })
    })
    return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ---- materia ----

export function loadMateria() {
    return [...state.materia.values()].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

/** Materia with live level/AP/multiplier. */
export function getMateriaStats() {
    const stats = getLedger().materia
    return loadMateria().map(m => stats.get(m.id) || m)
}

export function getMateriaStat(materiaId) {
    return materiaId ? getLedger().materia.get(materiaId) || null : null
}

export function addMateria({ type, category = '' }) {
    if (loadMateria().length >= getPlayer().materiaSlots) {
        return { success: false, error: 'No free materia slots. Level up to unlock more.' }
    }
    const id = makeId()
    const m = { id, type, category: category.trim(), createdAt: new Date().toISOString() }
    writeDoc('materia', id, m)
    return { success: true, materia: m }
}

export function updateMateria(materiaId, updates) {
    const m = state.materia.get(materiaId)
    if (!m) return false
    writeDoc('materia', materiaId, { ...m, ...updates })
    return true
}

/** Remove a materia. Quests/habits that used it simply become untagged. */
export function deleteMateria(materiaId) {
    if (!state.materia.has(materiaId)) return false
    writeDoc('materia', materiaId, null)
    state.habits.forEach(h => {
        if (h.materiaId === materiaId) writeDoc('habits', h.id, { ...h, materiaId: null })
    })
    return true
}

/** Small snapshot used to detect level-ups after an action. */
export function gameSnapshot() {
    const L = getLedger()
    const materia = {}
    L.materia.forEach((m, id) => { materia[id] = m.level })
    return {
        totalXP: L.totalXP,
        level: L.player.level,
        slots: L.player.materiaSlots,
        materia,
        badgeIds: new Set(L.badges.map(b => b.id)),
        medalIds: new Set(L.medals.map(m => m.id)),
    }
}

// ---- streak (Free Fire style ranks) ----

let streakCache = { version: -1, fn: null }

function streakFn() {
    if (streakCache.version !== version) {
        streakCache = { version, fn: computeStreak([...state.days.values()]) }
    }
    return streakCache.fn
}

/** Streak on a day: { count, rank, ticked, reset, carried } */
export function getStreak(dayId) {
    const day = state.days.get(dayId)
    const { before, after } = streakFn()(dayId)
    return {
        count: after,
        carried: before,
        rank: streakRank(after),
        ticked: Boolean(day?.streak),
        reset: Boolean(day?.streakReset),
    }
}

/** Tap on the badge: count this day (+1) or undo it (−1). */
export function toggleStreakDay(dayId) {
    const day = getDayOrDefault(dayId)
    saveDay(dayId, { streak: !day.streak })
}

/** Start over from this day (or undo a reset). */
export function setStreakReset(dayId, reset) {
    const day = getDayOrDefault(dayId)
    // Remember whether the day was counted so "undo reset" can restore it
    saveDay(dayId, reset
        ? { streakReset: true, streakWas: Boolean(day.streak), streak: false }
        : { streakReset: false, streak: Boolean(day.streakWas), streakWas: false })
}

/** Penalties on finished days after `sinceId` (exclusive) up to yesterday. */
export function getPenaltiesSince(sinceId) {
    const out = []
    getLedger().days.forEach((rec, date) => {
        if (rec.penalty > 0 && (!sinceId || date > sinceId)) out.push({ date, penalty: rec.penalty, missed: rec.missed })
    })
    return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ============= REMINDERS =============

export function loadReminders() {
    return [...state.reminders.values()]
}

export function getRemindersForLine(lineId) {
    return loadReminders().filter(r => r.lineId === lineId)
}

export function addReminder(reminder) {
    const id = makeId()
    const r = { enabled: true, ...reminder, id, datetime: new Date(reminder.datetime).toISOString() }
    writeDoc('reminders', id, r)
    return r
}

export function updateReminder(reminderId, updates) {
    const r = state.reminders.get(reminderId)
    if (!r) return false
    const next = { ...r, ...updates }
    if (updates.datetime) next.datetime = new Date(updates.datetime).toISOString()
    writeDoc('reminders', reminderId, next)
    return true
}

export function deleteReminder(reminderId) {
    writeDoc('reminders', reminderId, null)
    return true
}

export function deleteRemindersForLine(lineId) {
    getRemindersForLine(lineId).forEach(r => deleteReminder(r.id))
}

// ============= SETTINGS (device-local) =============

export function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem('integrity_settings') || '{}')
    } catch {
        return {}
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem('integrity_settings', JSON.stringify(settings))
        return true
    } catch {
        return false
    }
}

// ============= BADGES & MEDALS =============
// Regular badges and monthly medals are derived from your data by the game
// engine (see game/engine.js). Only hand-made "custom" ones are stored.

export { BADGE_TYPES, MEDAL_TIERS, MEDAL_ORDER } from '../game/config.js'

export function getBadgesForDate(date) {
    return getDayLedger(date)?.badges || []
}

export function getAllBadges() {
    return getLedger().badges
}

export function createCustomBadge(badgeData, date) {
    const id = makeId()
    const badge = {
        id, type: 'CUSTOM', name: badgeData.name, icon: badgeData.icon,
        xpBoost: Number(badgeData.xpBoost) || 0, description: badgeData.description || '',
        date, timestamp: new Date().toISOString(),
    }
    writeDoc('badges', id, badge)
    return badge
}

export function deleteBadge(badgeId) {
    const b = state.badges.get(badgeId)
    if (!b || b.type !== 'CUSTOM') return { success: false, error: 'Only custom badges can be deleted' }
    writeDoc('badges', badgeId, null)
    return { success: true }
}

export function updateBadge(badgeId, updates) {
    const badge = state.badges.get(badgeId)
    if (!badge || badge.type !== 'CUSTOM') return { success: false, error: 'Only custom badges can be edited' }
    const next = { ...badge }
    if (updates.xpBoost !== undefined) next.xpBoost = Number(updates.xpBoost) || 0
    if (updates.icon !== undefined) next.icon = updates.icon
    if (updates.name !== undefined) next.name = updates.name
    if (updates.description !== undefined) next.description = updates.description
    next.timestamp = new Date().toISOString()
    writeDoc('badges', badgeId, next)
    return { success: true, badge: next }
}

function customMedals() {
    return [...state.medals.values()].filter(m => m.tier === 'CUSTOM' && !m.revoked)
}

export function createCustomMedal(medalData, year, month) {
    const id = makeId()
    const medal = {
        id, tier: 'CUSTOM', name: medalData.name, icon: medalData.icon,
        threshold: Number(medalData.threshold) || 0, description: medalData.description || '',
        year, month, timestamp: new Date().toISOString(),
    }
    writeDoc('medals', id, medal)
    return medal
}

/** Medals for a month: celestial tiers reached (derived) + custom ones. */
export function getMedalsForMonth(year, month) {
    return [
        ...getLedger().medals.filter(m => m.year === year && m.month === month),
        ...customMedals().filter(m => m.year === year && m.month === month),
    ]
}

/** Highest celestial medal of a month, or null. */
export function getMedalForMonth(year, month) {
    const list = getLedger().medals.filter(m => m.year === year && m.month === month)
    return list.sort((a, b) => b.threshold - a.threshold)[0] || null
}

export function getAllMedals() {
    return [...getLedger().medals, ...customMedals()]
}

export function deleteMedal(medalId) {
    const m = state.medals.get(medalId)
    if (!m || m.tier !== 'CUSTOM') return { success: false, error: 'Only custom medals can be deleted' }
    writeDoc('medals', medalId, null)
    return { success: true }
}

export function updateMedal(medalId, updates) {
    const medal = state.medals.get(medalId)
    if (!medal || medal.tier !== 'CUSTOM') return { success: false, error: 'Only custom medals can be edited' }
    const next = { ...medal }
    if (updates.icon !== undefined) next.icon = updates.icon
    if (updates.name !== undefined) next.name = updates.name
    if (updates.threshold !== undefined) next.threshold = Number(updates.threshold) || 0
    if (updates.description !== undefined) next.description = updates.description
    next.timestamp = new Date().toISOString()
    writeDoc('medals', medalId, next)
    return { success: true, medal: next }
}

// ============= BACKUP: EXPORT / IMPORT =============

export function exportAll() {
    const out = { format: 'integrity-firestore-v1', exportedAt: new Date().toISOString() }
    COLLECTIONS.forEach(col => { out[col] = [...state[col].values()] })
    return out
}

/** Convert the old Supabase/localStorage blob ({entries, habits, xpHistory, ...}) */
function convertLegacy(data) {
    const habits = (data.habits || []).map((h, i) => ({ ...h, id: String(h.id || makeId()), order: h.order ?? i, visible: h.visible !== false }))
    const habitMap = new Map(habits.map(h => [h.id, h]))
    const days = (data.entries || []).map(e => {
        const id = e.id || toDateId(new Date(e.date))
        const values = e.habits || {}
        const habitXP = {}
        Object.entries(values).forEach(([hid, v]) => { habitXP[hid] = habitXPFor(habitMap.get(hid), v) })
        return {
            id,
            lines: (e.lines || []).map(l => ({ ...l, id: String(l.id || makeId()) })),
            habits: values,
            habitXP,
        }
    }).filter(d => !isDayEmpty(d))
    return {
        days,
        habits,
        templates: (data.templates || []).filter(t => !t.isHidden).map(t => ({
            ...t, id: String(t.id || makeId()),
            lines: (t.lines || []).map(l => ({ id: makeId(), type: l.type || 'text', content: l.content || '' })),
        })),
        badges: (data.badges || []).map(b => ({ ...b, id: String(b.id || makeId()) })),
        medals: (data.medals || []).map(m => ({ ...m, id: String(m.id || makeId()) })),
        reminders: (data.reminders || []).map(r => ({ enabled: true, ...r, id: String(r.id || makeId()), datetime: new Date(r.datetime).toISOString() })),
    }
}

/**
 * Bulk import using Firestore batched writes (max 500 ops per batch).
 * Accepts an export from this app or the old app's data blob.
 * Existing docs with the same id are overwritten; others are kept.
 */
export async function importAll(data, onProgress) {
    if (!userId) throw new Error('Not signed in')
    const normalized = data.format === 'integrity-firestore-v1' ? data : convertLegacy(data)
    const ops = []
    COLLECTIONS.forEach(col => {
        (normalized[col] || []).forEach(item => {
            if (!item?.id) return
            ops.push({ col, id: String(item.id), data: stripUndefined({ ...item, id: String(item.id) }) })
        })
    })
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        ops.slice(i, i + BATCH_LIMIT).forEach(({ col, id, data: d }) => {
            batch.set(doc(db, 'users', userId, col, id), d)
        })
        await batch.commit()
        onProgress?.(Math.min(i + BATCH_LIMIT, ops.length), ops.length)
    }
    return ops.length
}
