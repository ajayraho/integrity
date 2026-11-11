// Pure game maths. Everything here is derived from the saved data, so it can
// always be recomputed and can never drift out of sync.

import {
    materiaType, MATERIA_MULTIPLIER, MATERIA_MAX_LEVEL,
    MATERIA_DECAY_GRACE_DAYS, MATERIA_DECAY_RATE, MATERIA_DECAY_MIN,
    BASE_MATERIA_SLOTS, DEFAULT_QUEST_XP, MISSED_QUEST_PENALTY, MISSED_PENALTY_DAILY_CAP,
    xpForNextLevel, LEVELS_PER_SLOT, STREAK_RANKS, BADGE_TYPES, MEDAL_TIERS, MEDAL_ORDER,
} from './config.js'

// ---------- dates (YYYY-MM-DD strings, local) ----------
const pad = (n) => String(n).padStart(2, '0')
const idOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (id) => { const [y, m, d] = id.split('-').map(Number); return new Date(y, m - 1, d) }
export const nextDay = (id) => { const d = parse(id); d.setDate(d.getDate() + 1); return idOf(d) }
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000)

// ---------- materia ----------
const apTable = (typeKey) => materiaType(typeKey).ap

export function materiaLevelFromAP(ap, typeKey) {
    const table = apTable(typeKey)
    let level = 1
    for (let i = 0; i < table.length; i++) if (ap >= table[i]) level = i + 1
    return level
}

export function materiaMultiplier(level) {
    return MATERIA_MULTIPLIER[Math.min(Math.max(level, 1), MATERIA_MAX_LEVEL) - 1]
}

/** Display name for a materia at a level: Fire → Fira → Firaga → Firaga (master). */
export function materiaName(materia, level = 1) {
    const type = materiaType(materia?.type)
    if (!type.names) return materia?.customName || type.label
    return type.names[Math.min(level, type.names.length) - 1]
}


export function materiaProgress(ap, level, typeKey) {
    const table = apTable(typeKey)
    if (level >= table.length) return { current: ap - table[level - 1], span: 0, ratio: 1, mastered: true }
    const start = table[level - 1]
    const span = table[level] - start
    return { current: ap - start, span, ratio: Math.min(1, (ap - start) / span), mastered: false }
}

function decayPerDay(level, typeKey) {
    const table = apTable(typeKey)
    const span = level >= table.length
        ? table[table.length - 1] - table[table.length - 2]
        : table[level] - table[level - 1]
    return Math.max(MATERIA_DECAY_MIN, Math.round(span * MATERIA_DECAY_RATE))
}

// ---------- player ----------
export function playerFromXP(totalXP) {
    let xp = Math.max(0, totalXP)
    let level = 1
    while (xp >= xpForNextLevel(level)) {
        xp -= xpForNextLevel(level)
        level++
    }
    return {
        level,
        xpIntoLevel: xp,
        xpForNext: xpForNextLevel(level),
        materiaSlots: BASE_MATERIA_SLOTS + Math.floor((level - 1) / LEVELS_PER_SLOT),
    }
}

// ---------- quests ----------
export const isQuest = (line) => line.type === 'checkbox' || line.type === 'checkbox-time'
export const questXP = (line) => {
    const n = Number(line.xp)
    return Number.isFinite(n) && line.xp !== undefined && line.xp !== null && line.xp !== '' ? n : DEFAULT_QUEST_XP
}
const hasText = (line) => (line.content || '').trim() !== ''

/** Is a habit "done" for this value? (checkbox ticked, number goal reached, text written) */
export function habitDone(habit, value) {
    if (!habit) return false
    if (habit.type === 'checkbox') return value === true || value === 'true'
    if (habit.type === 'number') return (parseFloat(value) || 0) >= (Number(habit.goal) || 1)
    return typeof value === 'string' && value.trim() !== ''
}

function minutesBetween(start, end) {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60 // crosses midnight
    return mins
}

const localDateOf = (iso) => { const t = new Date(iso); return isNaN(t) ? null : idOf(t) }
const localHourOf = (iso) => { const t = new Date(iso); return isNaN(t) ? null : t.getHours() + t.getMinutes() / 60 }

function makeBadge(type, date) {
    const info = BADGE_TYPES[type]
    return { id: `${type}:${date}`, type, auto: true, date, ...info }
}

/**
 * Walk every day from the first record to today, in order:
 *   - materia decay is applied at the start of each idle day
 *   - completed quests and habits earn XP × the materia's multiplier *on that day*
 *     and give that materia AP (base XP)
 *   - quests left unchecked on finished days (since gameStart) cost XP
 *
 * @returns {{ days: Map, materia: Map, totalXP: number, player: object }}
 */
export function computeLedger({ days = [], habits = [], badges = [], materia = [], gameStart, today }) {
    const dayMap = new Map(days.map(d => [d.id, d]))
    const habitMap = new Map(habits.map(h => [h.id, h]))
    // Only hand-made (custom) badges are stored; the rest are derived below
    const badgesByDate = new Map()
    badges.filter(b => b.type === 'CUSTOM').forEach(b => {
        if (!b.date) return
        if (!badgesByDate.has(b.date)) badgesByDate.set(b.date, [])
        badgesByDate.get(b.date).push(b)
    })

    const mState = new Map(materia.map(m => {
        const created = (m.createdAt || '').slice(0, 10) || today
        return [m.id, { id: m.id, type: m.type, ap: 0, level: 1, lastActive: null, created, earnedXP: 0 }]
    }))

    const dates = [...dayMap.keys(), ...badgesByDate.keys()].sort()
    const firstMateria = [...mState.values()].map(s => s.created).sort()[0]
    const start = [dates[0], firstMateria].filter(Boolean).sort()[0]
    const lastDate = [dates[dates.length - 1], today].filter(Boolean).sort().pop()

    const records = new Map()
    let totalXP = 0
    if (!start) {
        return { days: records, materia: finalizeMateria(mState, materia, today), totalXP, player: playerFromXP(0), medals: [], badges: [] }
    }
    const habitRuns = new Map() // habitId -> { last, count }
    const allBadges = []

    const penaltyFrom = gameStart || today
    let guard = 0
    for (let d = start; d <= lastDate && guard < 20000; d = nextDay(d), guard++) {
        // 1) decay idle materia (only for days up to today, and since the game started)
        if (d <= today && d >= penaltyFrom) {
            mState.forEach(s => {
                if (d <= s.created) return
                const since = s.lastActive && s.lastActive > s.created ? s.lastActive : s.created
                const idle = daysBetween(since, d)
                if (idle > MATERIA_DECAY_GRACE_DAYS) {
                    const floor = apTable(s.type)[s.level - 1]
                    s.ap = Math.max(floor, s.ap - decayPerDay(s.level, s.type))
                }
            })
        }

        const day = dayMap.get(d)
        const rec = { date: d, base: 0, bonus: 0, badgeXP: 0, penalty: 0, missed: 0, net: 0, items: [], badges: [] }

        // multipliers are fixed at the start of the day (no mid-day snowballing)
        const multOf = (materiaId) => {
            const s = materiaId && mState.get(materiaId)
            return s && d >= s.created ? materiaMultiplier(s.level) : 1
        }
        const gains = [] // [materiaId, baseXP]

        if (day) {
            (day.lines || []).forEach(line => {
                if (!isQuest(line)) return
                const xp = questXP(line)
                if (line.checked) {
                    const mult = multOf(line.materiaId)
                    const earned = Math.round(xp * mult)
                    rec.base += xp
                    rec.bonus += earned - xp
                    rec.items.push({ kind: 'quest', id: line.id, base: xp, earned, materiaId: line.materiaId || null })
                    if (mult !== 1) gains.push([line.materiaId, xp])
                } else if (hasText(line) && xp > 0 && d < today && d >= penaltyFrom) {
                    rec.missed++
                    rec.penalty += Math.round(xp * MISSED_QUEST_PENALTY)
                }
            })
            Object.entries(day.habitXP || {}).forEach(([hid, raw]) => {
                const xp = Number(raw) || 0
                if (!xp) return
                const habit = habitMap.get(hid)
                const materiaId = habit?.materiaId
                const mult = multOf(materiaId)
                const earned = Math.round(xp * mult)
                rec.base += xp
                rec.bonus += earned - xp
                rec.items.push({ kind: 'habit', id: hid, base: xp, earned, materiaId: materiaId || null })
                if (mult !== 1) gains.push([materiaId, xp])
            })
        }
        // 2) materia gain AP from today's work (levels apply from tomorrow)
        let mastered = false
        gains.forEach(([materiaId, xp]) => {
            const s = mState.get(materiaId)
            if (!s) return
            const maxLevel = apTable(s.type).length
            const wasMaster = s.level >= maxLevel
            s.ap += xp
            s.earnedXP += xp
            s.level = Math.max(s.level, materiaLevelFromAP(s.ap, s.type))
            if (!wasMaster && s.level >= maxLevel) mastered = true
            if (d <= today) s.lastActive = !s.lastActive || d > s.lastActive ? d : s.lastActive
        })

        // 3) badges, all derived from the day's data
        const earn = (type) => rec.badges.push(makeBadge(type, d))
        if (day) {
            const quests = (day.lines || []).filter(isQuest)
            const done = quests.filter(l => l.checked)
            const timed = done.filter(l => l.type === 'checkbox-time')
            const timedMin = timed.reduce((s, l) => s + minutesBetween(l.timeStart, l.timeEnd), 0)
            const typeOf = (materiaId) => mState.get(materiaId)?.type
            const scholarMin = timed.filter(l => typeOf(l.materiaId) === 'poison').reduce((s, l) => s + minutesBetween(l.timeStart, l.timeEnd), 0)
            const fireBase = rec.items.filter(i => typeOf(i.materiaId) === 'fire').reduce((s, i) => s + i.base, 0)
            const hours = done.filter(l => l.completedAt && localDateOf(l.completedAt) === d).map(l => localHourOf(l.completedAt))

            if (timedMin >= 120) earn('DEEP_WORK_2HR')
            if (timedMin >= 300) earn('DEEP_WORK_5HR')
            if (hours.some(h => h < 8)) earn('EARLY_BIRD')
            if (hours.some(h => h >= 22)) earn('NIGHT_OWL')
            if (done.length >= 10) earn('TASK_MASTER')
            if (rec.base + rec.bonus >= 200) earn('PRODUCTIVITY_BEAST')
            if (fireBase >= 100) earn('EXERCISE_PRO')
            if (scholarMin >= 60) earn('SCHOLAR')

            // habits that existed on this day and are shown
            const activeHabits = habits.filter(h => h.visible !== false && (!h.createdAt || h.createdAt.slice(0, 10) <= d))
            const values = day.habits || {}
            const questsWithText = quests.filter(hasText)
            if (activeHabits.length && activeHabits.every(h => habitDone(h, values[h.id])) &&
                questsWithText.length >= 3 && questsWithText.every(l => l.checked)) earn('PERFECT_DAY')

            let streak7 = false
            activeHabits.forEach(h => {
                if (!habitDone(h, values[h.id])) return
                const run = habitRuns.get(h.id)
                const count = run && nextDay(run.last) === d ? run.count + 1 : 1
                habitRuns.set(h.id, { last: d, count })
                if (count === 7) streak7 = true
            })
            if (streak7) earn('HABIT_STREAK_7')
        }
        if (mastered) earn('MATERIA_MASTER')
        rec.badges.push(...(badgesByDate.get(d) || []))
        rec.badges.forEach(b => { rec.badgeXP += Number(b.xpBoost) || 0 })
        allBadges.push(...rec.badges)

        rec.penalty = Math.min(rec.penalty, MISSED_PENALTY_DAILY_CAP)
        rec.net = rec.base + rec.bonus + rec.badgeXP - rec.penalty
        totalXP += rec.net
        if (day || rec.badgeXP) records.set(d, rec)
    }

    // 4) monthly medals from each month's XP (all tiers reached)
    const monthTotals = new Map()
    records.forEach((rec, d) => { const k = d.slice(0, 7); monthTotals.set(k, (monthTotals.get(k) || 0) + rec.net) })
    const medals = []
    monthTotals.forEach((total, k) => {
        const [year, month] = k.split('-').map(Number)
        MEDAL_ORDER.forEach(tier => {
            const info = MEDAL_TIERS[tier]
            if (total >= info.threshold) medals.push({ id: `${tier}:${k}`, tier, auto: true, year, month, ...info })
        })
    })

    return { days: records, materia: finalizeMateria(mState, materia, today), totalXP, player: playerFromXP(totalXP), medals, badges: allBadges, monthTotals }

}

function finalizeMateria(mState, materiaList, today) {
    const out = new Map()
    materiaList.forEach(m => {
        const s = mState.get(m.id)
        const since = s.lastActive && s.lastActive > s.created ? s.lastActive : s.created
        const idleDays = Math.max(0, daysBetween(since, today))
        out.set(m.id, {
            ...m,
            ap: s.ap,
            level: s.level,
            multiplier: materiaMultiplier(s.level),
            name: materiaName(m, s.level),
            maxLevel: apTable(m.type).length,
            progress: materiaProgress(s.ap, s.level, m.type),
            idleDays,
            decaying: idleDays > MATERIA_DECAY_GRACE_DAYS && s.ap > apTable(m.type)[s.level - 1],
            daysUntilDecay: Math.max(0, MATERIA_DECAY_GRACE_DAYS - idleDays + 1),
        })
    })
    return out
}

// ---------- streak ----------

/** Rank for a streak length (null below day 1). */
export function streakRank(count) {
    let rank = null
    for (const r of STREAK_RANKS) if (count >= r.day) rank = r
    return rank
}

export function nextStreakRank(count) {
    return STREAK_RANKS.find(r => r.day > count) || null
}

/**
 * Streak length at the end of each day. A day carries yesterday's count unless
 * it's ticked (+1) or marked as a reset (back to 0, then +1 if also ticked).
 * @returns {(date: string) => { before: number, after: number }}
 */
export function computeStreak(days) {
    const marked = days.filter(d => d.streak || d.streakReset).sort((a, b) => a.id.localeCompare(b.id))
    const timeline = [] // [date, before, after]
    let count = 0
    marked.forEach(d => {
        const before = d.streakReset ? 0 : count
        const after = before + (d.streak ? 1 : 0)
        timeline.push([d.id, count, after])
        count = after
    })
    return (date) => {
        // last marked day on or before `date`
        let lo = 0, hi = timeline.length - 1, idx = -1
        while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (timeline[mid][0] <= date) { idx = mid; lo = mid + 1 } else hi = mid - 1
        }
        if (idx === -1) return { before: 0, after: 0 }
        const [d, before, after] = timeline[idx]
        return d === date ? { before, after } : { before: after, after }
    }
}
