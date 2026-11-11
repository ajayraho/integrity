import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import MateriaOrb from './MateriaOrb'
import RankBadge from './RankBadge'
import ConfirmDialog from './ConfirmDialog'
import { useStoreVersion } from '../hooks/useStore'
import { useFeedback } from '../hooks/useFeedback'
import {
    getPlayer, getTotalXP, getXPForMonth, getDayLedger, getPenaltiesSince, getGameStart, getStreak,
    getMateriaStats, addMateria, updateMateria, deleteMateria,
    getBadgesForDate, getAllBadges, getMedalsForMonth, getMedalForMonth,
    createCustomBadge, updateBadge, deleteBadge, createCustomMedal, updateMedal, deleteMedal,
    BADGE_TYPES, MEDAL_TIERS, MEDAL_ORDER,
} from '../utils/storage'
import {
    MATERIA_TYPES, MATERIA_LEVEL_COLORS, MATERIA_MULTIPLIER, MATERIA_DECAY_GRACE_DAYS,
    MISSED_QUEST_PENALTY, MISSED_PENALTY_DAILY_CAP, LEVELS_PER_SLOT, STREAK_RANKS,
} from '../game/config.js'
import { nextStreakRank } from '../game/engine.js'
import { toDateId, todayId, addDays, addMonths, daysInMonth, formatLongDate } from '../utils/date'
import { badgeColor } from '../utils/badgeColor'

const GRAPH_W = 1000
const GRAPH_H = 400

// Jikanto's level colours are bright for dark backgrounds; these are the same
// hues, darkened so materia names stay readable on paper. Orbs keep the originals.
const LEVEL_TEXT = ['#0097a7', '#b58900', '#d32f2f', '#c77800']

const Card = ({ children, className = '' }) => (
    <section className={`min-w-0 bg-white border-2 border-line rounded-lg shadow-sm p-4 sm:p-6 ${className}`}>{children}</section>
)

const Bar = ({ ratio, color }) => (
    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, background: color }} />
    </div>
)

const Stars = ({ level, max }) => (
    <span aria-label={`Level ${level} of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
            <span key={i} style={{ color: i < level ? LEVEL_TEXT[level - 1] : '#d0d7de' }}>★</span>
        ))}
    </span>
)

function Modal({ title, onClose, children }) {
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-paper border-2 border-line rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="bg-ink text-white px-5 py-3 flex items-center justify-between rounded-t-md">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>,
        document.body
    )
}

const inputCls = 'w-full px-3 py-2 border border-line rounded-lg outline-none focus:border-ink bg-white'
const primaryBtn = 'flex-1 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink/90'
const secondaryBtn = 'flex-1 py-2 border-2 border-line rounded-lg hover:bg-line/20'

/** Spells of one materia: learned, current and still to learn (scrolls sideways). */
function SpellLadder({ m }) {
    const t = MATERIA_TYPES[m.type]
    if (!t?.names) return null
    return (
        <div className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto pb-1" role="list" aria-label={`${t.label} spells`}>
            {t.names.map((spell, i) => {
                const lvl = i + 1
                const learned = m.level >= lvl
                const current = m.level === lvl
                return (
                    <div
                        key={spell}
                        role="listitem"
                        className={`flex-shrink-0 w-20 px-2 py-1.5 text-center rounded-lg border ${current ? 'border-ink bg-line/20' : 'border-line'} ${learned ? '' : 'opacity-45'}`}
                        title={learned ? `${spell}: learned` : `${spell}: ${t.ap[i] - m.ap} AP to go`}
                    >
                        <MateriaOrb materia={m} level={lvl} size={14} className={learned ? '' : 'grayscale'} />
                        <div className="text-xs font-semibold mt-1 truncate" style={{ color: learned ? LEVEL_TEXT[i] : undefined }}>{spell}</div>
                        <div className="text-[10px] text-ink/50">{'★'.repeat(lvl)}</div>
                        <div className="text-[10px] text-ink/50">{t.ap[i]} AP · ×{MATERIA_MULTIPLIER[i]}</div>
                    </div>
                )
            })}
        </div>
    )
}

function MateriaForm({ initial, initialType, onSave, onClose, title }) {
    const editing = Boolean(initial)
    const startType = initial?.type || initialType || 'fire'
    const [type, setType] = useState(startType)
    const [category, setCategory] = useState(initial?.category || MATERIA_TYPES[startType].category)
    const [categoryTouched, setCategoryTouched] = useState(editing)
    const [error, setError] = useState('')

    const pickType = (key) => {
        setType(key)
        setError('')
        if (!categoryTouched) setCategory(MATERIA_TYPES[key].category)
    }

    const submit = (e) => {
        e.preventDefault()
        if (!category.trim()) return setError('Which kind of quests is it for?')
        const err = onSave({ type, category })
        if (err) setError(err)
        else onClose()
    }

    return (
        <Modal title={title} onClose={onClose}>
            <form onSubmit={submit}>
                {!editing && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {Object.entries(MATERIA_TYPES).map(([key, t]) => (
                            <button
                                type="button"
                                key={key}
                                onClick={() => pickType(key)}
                                className={`flex items-start gap-2 px-3 py-2 text-left text-sm rounded-lg border-2 ${type === key ? 'border-ink bg-line/20' : 'border-line hover:bg-line/10'}`}
                            >
                                <MateriaOrb materia={{ type: key }} level={1} size={14} className="mt-1" />
                                <span className="min-w-0">
                                    <span className="block font-semibold text-ink">{t.label} <span className="font-normal text-ink/60">· {t.category}</span></span>
                                    <span className="block text-[11px] text-ink/70">{t.names.join(' → ')}</span>
                                    <span className="block text-[11px] text-ink/50">{t.why}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <label className="block mb-3">
                    <span className="text-sm font-medium text-ink">Quest category</span>
                    <input
                        value={category}
                        onChange={e => { setCategory(e.target.value); setCategoryTouched(true); setError('') }}
                        placeholder="e.g. Fitness, Deep Work, Reading"
                        maxLength={32}
                        className={`mt-1 ${inputCls}`}
                        autoFocus={editing}
                    />
                </label>
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
                    <button type="submit" className={primaryBtn}>{editing ? 'Save' : 'Obtain'}</button>
                </div>
            </form>
        </Modal>
    )
}

/** Create or edit a custom badge / medal. */
function CustomRewardForm({ kind, initial, onSave, onDelete, onClose }) {
    const isBadge = kind === 'badge'
    const [icon, setIcon] = useState(initial?.icon || '')
    const [name, setName] = useState(initial?.name || '')
    const [amount, setAmount] = useState(String(initial ? (isBadge ? initial.xpBoost : initial.threshold) : ''))
    const [description, setDescription] = useState(initial?.description || '')
    const [error, setError] = useState('')

    const submit = (e) => {
        e.preventDefault()
        const n = parseInt(amount, 10) || 0
        if (!icon.trim() || !name.trim() || n <= 0) return setError(`Add an icon, a name and ${isBadge ? 'XP' : 'an XP threshold'} above 0`)
        onSave({ icon: icon.trim(), name: name.trim(), amount: n, description: description.trim() })
        onClose()
    }

    return (
        <Modal title={`${initial ? 'Edit' : 'New'} custom ${kind}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <div className="flex gap-3">
                    <label className="w-20">
                        <span className="text-sm font-medium text-ink">Icon</span>
                        <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏅" maxLength={4} className={`mt-1 text-center ${inputCls}`} />
                    </label>
                    <label className="flex-1">
                        <span className="text-sm font-medium text-ink">Name</span>
                        <input value={name} onChange={e => setName(e.target.value)} maxLength={32} className={`mt-1 ${inputCls}`} />
                    </label>
                </div>
                <label className="block">
                    <span className="text-sm font-medium text-ink">{isBadge ? 'XP boost' : 'XP threshold'}</span>
                    <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className={`mt-1 ${inputCls}`} />
                </label>
                <label className="block">
                    <span className="text-sm font-medium text-ink">Description</span>
                    <input value={description} onChange={e => setDescription(e.target.value)} maxLength={80} className={`mt-1 ${inputCls}`} />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2 pt-1">
                    {onDelete && <button type="button" onClick={onDelete} className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg">Delete</button>}
                    <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
                    <button type="submit" className={primaryBtn}>Save</button>
                </div>
            </form>
        </Modal>
    )
}

function XPStatsView() {
    const version = useStoreVersion()
    const { showToast } = useFeedback()
    const canvasRef = useRef(null)
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [obtaining, setObtaining] = useState(null) // true | materia type key
    const [editingMateria, setEditingMateria] = useState(null)
    const [releasing, setReleasing] = useState(null)
    const [rewardForm, setRewardForm] = useState(null) // { kind, initial? }
    const [confirm, setConfirm] = useState(null)
    const [showRules, setShowRules] = useState(false)

    const today = todayId()
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth() + 1
    const selectedDateId = toDateId(selectedDate)

    // ---- player, streak, materia ----
    const player = getPlayer()
    const totalXP = getTotalXP()
    const streak = getStreak(today)
    const nextRank = nextStreakRank(streak.count)
    const prevRankDay = streak.rank?.day || 0
    const materia = getMateriaStats()
    const freeSlots = player.materiaSlots - materia.length
    const nextSlotLevel = Math.ceil(player.level / LEVELS_PER_SLOT) * LEVELS_PER_SLOT + 1
    const ownedTypes = new Set(materia.map(m => m.type))
    const unobtained = Object.entries(MATERIA_TYPES).filter(([key]) => !ownedTypes.has(key))
    const todayRec = getDayLedger(today)
    const recentPenalties = getPenaltiesSince(addDays(today, -8)).filter(p => p.date < today)

    // ---- month ----
    const monthTotals = getXPForMonth(year, month)
    const monthlyData = []
    for (let day = 1; day <= daysInMonth(year, month - 1); day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        monthlyData.push({ date: dateStr, day, total: monthTotals.find(d => d.date === dateStr)?.total || 0 })
    }
    const monthXP = monthlyData.reduce((s, d) => s + d.total, 0)
    const activeDays = monthlyData.filter(d => d.total > 0)
    const stats = {
        max: Math.max(0, ...monthlyData.map(d => d.total)),
        avg: activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length) : 0,
        daysActive: activeDays.length,
    }
    const monthMedal = getMedalForMonth(year, month)
    const monthMedals = getMedalsForMonth(year, month)
    const customMonthMedals = monthMedals.filter(m => m.tier === 'CUSTOM')
    const nextMedalTier = MEDAL_ORDER.map(k => MEDAL_TIERS[k]).find(t => monthXP < t.threshold)

    // ---- day & badges ----
    const dayBadges = getBadgesForDate(selectedDateId)
    const allBadges = getAllBadges()
    const timesEarned = (type) => allBadges.filter(b => b.type === type).length
    const customBadges = allBadges.filter(b => b.type === 'CUSTOM')

    const drawGraph = useCallback((data) => {
        const canvas = canvasRef.current
        if (!canvas || !data.length) return
        const dpr = window.devicePixelRatio || 1
        canvas.width = GRAPH_W * dpr
        canvas.height = GRAPH_H * dpr
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const width = GRAPH_W
        const height = GRAPH_H
        ctx.clearRect(0, 0, width, height)
        const padding = 60
        const graphWidth = width - padding * 2
        const graphHeight = height - padding * 2
        const maxValue = Math.max(...data.map(d => d.total), 10)
        const minValue = Math.min(0, ...data.map(d => d.total))
        const range = maxValue - minValue
        const yOf = (v) => height - padding - ((v - minValue) / range) * graphHeight
        const xAt = (i) => padding + (graphWidth / Math.max(data.length - 1, 1)) * i

        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke()
            ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'
            ctx.fillText(String(Math.round(maxValue - (range / 5) * i)), padding - 10, y + 4)
        }
        ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 3; ctx.beginPath()
        data.forEach((p, i) => { const x = xAt(i), y = yOf(p.total); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
        ctx.stroke()
        data.forEach((p, i) => {
            const x = xAt(i)
            ctx.fillStyle = p.total > 0 ? '#4CAF50' : p.total < 0 ? '#e53935' : '#ccc'
            ctx.beginPath(); ctx.arc(x, yOf(p.total), 5, 0, 2 * Math.PI); ctx.fill()
            if (p.day % 5 === 0 || p.day === 1) {
                ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
                ctx.fillText(String(p.day), x, height - padding + 20)
            }
        })
        const ti = data.findIndex(d => d.date === toDateId(new Date()))
        if (ti !== -1) {
            const x = xAt(ti)
            ctx.strokeStyle = '#FF5722'; ctx.lineWidth = 2; ctx.setLineDash([5, 5])
            ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); ctx.stroke(); ctx.setLineDash([])
            ctx.fillStyle = '#FF5722'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
            ctx.fillText('TODAY', x, padding - 10)
        }
    }, [])

    const graphKey = monthlyData.map(d => d.total).join(',') + '|' + year + '-' + month
    useEffect(() => {
        drawGraph(monthlyData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphKey, drawGraph, version])

    const changeMonth = (delta) => setSelectedDate(prev => addMonths(prev, delta))
    const changeDay = (delta) => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d })
    const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const dayLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div className="xp-stats-view min-h-screen bg-paper py-6 px-4 pb-28 overflow-x-hidden">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-ink text-center">🏆 XP & Statistics</h1>

                {/* Level + streak */}
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <Card>
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-sm text-ink/60">Level</div>
                                <div className="text-5xl font-bold text-ink leading-none">{player.level}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-ink">{totalXP.toLocaleString()} XP</div>
                                <div className="text-sm text-ink/60">total</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-ink/60 mb-1">
                                <span>EXP</span>
                                <span>{player.xpIntoLevel} / {player.xpForNext} to Lv {player.level + 1}</span>
                            </div>
                            <Bar ratio={player.xpIntoLevel / player.xpForNext} color="linear-gradient(90deg,#26c6da,#1e88e5)" />
                        </div>
                        <div className="mt-3 text-xs text-ink/60 flex flex-wrap gap-x-4">
                            <span>Materia slots: {materia.length} / {player.materiaSlots}</span>
                            <span>Next slot at Lv {nextSlotLevel}</span>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-4">
                            <RankBadge rank={streak.rank} size={52} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-ink/60">Streak</div>
                                <div className="text-2xl font-bold text-ink">{streak.rank ? streak.rank.name : 'Unranked'}</div>
                                <div className="text-sm text-ink/60">Day {streak.count} · {streak.ticked ? 'today counted' : 'today not counted yet'}</div>
                            </div>
                        </div>
                        {nextRank && (
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-ink/60 mb-1">
                                    <span>Next: {nextRank.name}</span>
                                    <span>day {streak.count} / {nextRank.day}</span>
                                </div>
                                <Bar ratio={(streak.count - prevRankDay) / Math.max(1, nextRank.day - prevRankDay)} color="linear-gradient(90deg,#ffd54f,#ff7043)" />
                            </div>
                        )}
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Streak ranks">
                            {STREAK_RANKS.map(r => (
                                <div key={r.name} role="listitem" className="flex flex-col items-center flex-shrink-0 w-11" title={`${r.name}: day ${r.day}`}>
                                    <RankBadge rank={r} size={22} dim={streak.count < r.day} />
                                    <span className="text-[9px] text-ink/50 mt-0.5">d{r.day}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-[11px] text-ink/50">Tap the badge on a day in the journal to count it; tap again to undo. Reset from the day's ⋯ menu.</p>
                    </Card>
                </div>

                {/* Today */}
                <Card className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div className="text-xs text-ink/60">Today</div>
                        <div className="text-2xl font-bold text-ink">{todayRec?.net || 0}</div>
                        <div className="text-[11px] text-ink/50">XP</div>
                    </div>
                    <div>
                        <div className="text-xs text-ink/60">Materia bonus</div>
                        <div className="text-2xl font-bold text-amber-600">+{todayRec?.bonus || 0}</div>
                        <div className="text-[11px] text-ink/50">XP today</div>
                    </div>
                    <div>
                        <div className="text-xs text-ink/60">Lost, last 7 days</div>
                        <div className="text-2xl font-bold text-red-600">−{recentPenalties.reduce((s, p) => s + p.penalty, 0)}</div>
                        <div className="text-[11px] text-ink/50">{recentPenalties.reduce((s, p) => s + p.missed, 0)} unfinished quests</div>
                    </div>
                </Card>

                {/* Materia */}
                <Card>
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <h2 className="text-xl font-bold text-ink">💠 Materia</h2>
                        <button
                            onClick={() => (freeSlots > 0 ? setObtaining(true) : showToast(`All ${player.materiaSlots} slots used. Next one at Lv ${nextSlotLevel}.`, 'info'))}
                            className="px-3 py-1.5 text-sm border-2 border-ink rounded-lg hover:bg-ink/5"
                        >
                            + Obtain {freeSlots > 0 ? `(${freeSlots} free)` : '(no free slots)'}
                        </button>
                    </div>

                    {materia.length === 0 && (
                        <p className="text-sm text-ink/70 mb-3">
                            No materia yet. Obtain one for each area of life you want to level up, then pick it as the <b>catalyser</b> on quests and habits.
                        </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        {materia.map(m => {
                            const p = m.progress
                            const textColor = LEVEL_TEXT[m.level - 1]
                            return (
                                <div key={m.id} className="border-2 border-line rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                        <MateriaOrb materia={m} size={30} title={MATERIA_TYPES[m.type]?.why} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-lg font-bold truncate" style={{ color: textColor }}>{m.name}</span>
                                                <Stars level={m.level} max={m.maxLevel} />
                                            </div>
                                            <div className="text-sm text-ink/80 truncate">{m.category}</div>
                                            <div className="text-[11px] text-ink/50">{MATERIA_TYPES[m.type]?.label || ''} materia</div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs text-ink/60 mb-1">
                                            <span>AP {m.ap.toLocaleString()}</span>
                                            <span>{p.mastered ? 'MASTERED' : `${p.current} / ${p.span} to Lv ${m.level + 1}`}</span>
                                        </div>
                                        <Bar ratio={p.ratio} color={MATERIA_LEVEL_COLORS[m.level - 1]} />
                                    </div>
                                    <SpellLadder m={m} />
                                    <div className="mt-2 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-amber-600">XP ×{m.multiplier}</span>
                                        {m.decaying ? (
                                            <span className="text-red-600">Losing AP: idle {m.idleDays} days</span>
                                        ) : m.ap === 0 ? (
                                            <span className="text-ink/50">New: tag a quest with it</span>
                                        ) : m.idleDays > 0 ? (
                                            <span className="text-ink/50">Decay in {m.daysUntilDecay} day{m.daysUntilDecay === 1 ? '' : 's'}</span>
                                        ) : (
                                            <span className="text-green-700">Active today</span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex gap-3 text-xs">
                                        <button onClick={() => setEditingMateria(m)} className="text-blue-600 hover:underline">Edit</button>
                                        <button onClick={() => setReleasing(m)} className="text-red-600 hover:underline">Release</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {unobtained.length > 0 && (
                        <div className="mt-4">
                            <div className="flex items-baseline justify-between mb-2">
                                <h3 className="text-sm font-semibold text-ink">Still to obtain ({unobtained.length})</h3>
                                <span className="text-[11px] text-ink/50">{freeSlots > 0 ? `${freeSlots} free slot${freeSlots === 1 ? '' : 's'}` : `next slot at Lv ${nextSlotLevel}`}</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2" role="list">
                                {unobtained.map(([key, t]) => (
                                    <button
                                        key={key}
                                        role="listitem"
                                        onClick={() => (freeSlots > 0 ? setObtaining(key) : showToast(`No free slot. Next one at Lv ${nextSlotLevel}.`, 'info'))}
                                        className="flex-shrink-0 w-32 border-2 border-line rounded-lg p-3 text-left opacity-70 hover:opacity-100 transition-opacity"
                                        title={t.why}
                                    >
                                        <MateriaOrb materia={{ type: key }} level={1} size={18} className="grayscale" />
                                        <div className="text-sm font-semibold text-ink mt-1">{t.label}</div>
                                        <div className="text-[11px] text-ink/70 leading-tight">{t.category}</div>
                                        <div className="text-[10px] text-ink/50 mt-1 leading-tight">{t.names.join(' → ')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Month: medals + graph */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 border-2 border-line rounded-lg hover:bg-line/20" aria-label="Previous month">←</button>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-ink">{monthLabel}</h2>
                            <div className="text-sm text-ink/60">
                                {monthXP.toLocaleString()} XP{monthMedal && <> · {monthMedal.icon} {monthMedal.name}</>}
                            </div>
                        </div>
                        <button onClick={() => changeMonth(1)} className="px-3 py-1.5 border-2 border-line rounded-lg hover:bg-line/20" aria-label="Next month">→</button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-ink">Medals this month</h3>
                        <button onClick={() => setRewardForm({ kind: 'medal' })} className="text-xs text-blue-600 hover:underline">+ custom medal</button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Monthly medals">
                        {MEDAL_ORDER.map(key => {
                            const t = MEDAL_TIERS[key]
                            const reached = monthXP >= t.threshold
                            return (
                                <div
                                    key={key}
                                    role="listitem"
                                    className={`flex-shrink-0 w-24 rounded-lg border-2 p-2 text-center ${reached ? 'border-line' : 'border-dashed border-line opacity-45 grayscale'}`}
                                    style={reached ? { background: `linear-gradient(to bottom, ${t.color}33, ${t.color}10)` } : undefined}
                                    title={t.description}
                                >
                                    <div className="text-3xl">{t.icon}</div>
                                    <div className="text-xs font-bold text-ink mt-1">{t.name}</div>
                                    <div className="text-[10px] text-ink/60">{t.threshold.toLocaleString()}+ XP</div>
                                </div>
                            )
                        })}
                        {customMonthMedals.map(m => (
                            <button
                                key={m.id}
                                role="listitem"
                                onClick={() => setRewardForm({ kind: 'medal', initial: m })}
                                className="flex-shrink-0 w-24 rounded-lg border-2 border-line p-2 text-center bg-line/10"
                                title={`${m.description || ''} (custom, tap to edit)`}
                            >
                                <div className="text-3xl">{m.icon}</div>
                                <div className="text-xs font-bold text-ink mt-1 truncate">{m.name}</div>
                                <div className="text-[10px] text-ink/60">custom</div>
                            </button>
                        ))}
                    </div>
                    {nextMedalTier && (
                        <p className="text-xs text-ink/60 mb-3">{(nextMedalTier.threshold - monthXP).toLocaleString()} XP to {nextMedalTier.icon} {nextMedalTier.name}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center my-4">
                        <div><div className="text-2xl font-bold text-blue-600">{stats.max}</div><div className="text-xs text-ink/60">Peak day</div></div>
                        <div><div className="text-2xl font-bold text-green-600">{stats.avg}</div><div className="text-xs text-ink/60">Avg / active day</div></div>
                        <div><div className="text-2xl font-bold text-purple-600">{stats.daysActive}</div><div className="text-xs text-ink/60">Active days</div></div>
                    </div>
                    <div className="overflow-x-auto">
                        <canvas ref={canvasRef} width={GRAPH_W} height={GRAPH_H} className="w-full min-w-[560px]" />
                    </div>
                </Card>

                {/* Day: badges */}
                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => changeDay(-1)} className="px-3 py-1.5 border-2 border-line rounded-lg hover:bg-line/20" aria-label="Previous day">←</button>
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-ink">{dayLabel}</h2>
                            <div className="text-sm text-ink/60">{getDayLedger(selectedDateId)?.net || 0} XP</div>
                        </div>
                        <button onClick={() => changeDay(1)} className="px-3 py-1.5 border-2 border-line rounded-lg hover:bg-line/20" aria-label="Next day">→</button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-ink">Badges earned this day</h3>
                        <button onClick={() => setRewardForm({ kind: 'badge' })} className="text-xs text-blue-600 hover:underline">+ custom badge</button>
                    </div>
                    {dayBadges.length === 0 ? (
                        <p className="text-sm text-ink/50">None.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {dayBadges.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => b.type === 'CUSTOM' && setRewardForm({ kind: 'badge', initial: b })}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white shadow ${b.type === 'CUSTOM' ? '' : 'cursor-default'}`}
                                    style={{ backgroundColor: badgeColor(b.name) }}
                                    title={b.description}
                                >
                                    <span>{b.icon}</span>
                                    <span className="text-sm font-semibold">{b.name}</span>
                                    <span className="text-xs opacity-90">+{b.xpBoost}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <h3 className="text-sm font-semibold text-ink mt-5 mb-2">All badges</h3>
                    <p className="text-xs text-ink/50 mb-2">Earned automatically from your quests, habits and materia.</p>
                    <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Badges">
                        {Object.entries(BADGE_TYPES).map(([key, b]) => {
                            const count = timesEarned(key)
                            const today = dayBadges.some(x => x.type === key)
                            return (
                                <div
                                    key={key}
                                    role="listitem"
                                    className={`flex-shrink-0 w-32 p-3 rounded-lg border-2 text-center ${today ? 'border-ink' : 'border-line'} ${count ? '' : 'opacity-45 grayscale'}`}
                                    title={b.description}
                                >
                                    <div className="text-3xl">{b.icon}</div>
                                    <div className="text-xs font-bold text-ink mt-1">{b.name}</div>
                                    <div className="text-[11px] font-semibold" style={{ color: count ? badgeColor(b.name) : '#9CA3AF' }}>+{b.xpBoost} XP</div>
                                    <div className="text-[10px] text-ink/60 mt-1 leading-tight">{b.description}</div>
                                    <div className="text-[11px] mt-1 font-semibold text-green-700">{count ? `Earned ×${count}` : ''}</div>
                                </div>
                            )
                        })}
                    </div>
                    {customBadges.length > 0 && (
                        <p className="text-xs text-ink/50 mt-1">{customBadges.length} custom badge{customBadges.length === 1 ? '' : 's'} earned in total.</p>
                    )}
                </Card>

                {recentPenalties.length > 0 && (
                    <Card>
                        <h3 className="text-sm font-semibold text-ink mb-2">Unfinished quests</h3>
                        <ul className="text-sm space-y-1">
                            {recentPenalties.slice().reverse().map(p => (
                                <li key={p.date} className="flex justify-between">
                                    <span className="text-ink/80">{formatLongDate(p.date)}</span>
                                    <span className="text-red-600">{p.missed} missed · −{p.penalty} XP</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

                <Card className="text-sm">
                    <button onClick={() => setShowRules(!showRules)} className="font-semibold text-ink w-full text-left">
                        {showRules ? '▾' : '▸'} How it works
                    </button>
                    {showRules && (
                        <ul className="mt-3 space-y-2 text-ink/80 list-disc pl-5">
                            <li><b>Quests</b> are lines with a checkbox. Each has XP (tap its chip to change it) and can carry a <b>catalyser materia</b>.</li>
                            <li>Completing a quest or habit with a materia gives <b>XP × the materia's boost</b> and gives the materia <b>AP</b> equal to the base XP.</li>
                            <li>Each materia level teaches the next spell, like in FF7 Remake. Boost by level: {MATERIA_MULTIPLIER.map((x, i) => `★${i + 1} ×${x}`).join(' · ')}. A new level's boost starts the next day.</li>
                            <li><b>Decay:</b> a materia unused for more than {MATERIA_DECAY_GRACE_DAYS} days loses a little AP each day, but never drops below its current level.</li>
                            <li><b>Unfinished quests:</b> a quest still unchecked when its day ends costs {Math.round(MISSED_QUEST_PENALTY * 100)}% of its XP (max {MISSED_PENALTY_DAILY_CAP} XP per day). Finishing it later gives the XP back.</li>
                            <li><b>Badges</b> are earned automatically and add XP. Undoing what earned them takes them away again.</li>
                            <li><b>Medals</b> mark your monthly XP: {MEDAL_ORDER.map(k => `${MEDAL_TIERS[k].icon} ${MEDAL_TIERS[k].name} ${MEDAL_TIERS[k].threshold.toLocaleString()}`).join(' → ')}.</li>
                            <li>Your <b>level</b> comes from total XP. Every {LEVELS_PER_SLOT} levels unlock another materia slot.</li>
                            <li>Penalties and decay count from {formatLongDate(getGameStart())}, when the game started.</li>
                        </ul>
                    )}
                </Card>
            </div>

            {obtaining && (
                <MateriaForm
                    title="Obtain materia"
                    initialType={typeof obtaining === 'string' ? obtaining : undefined}
                    onClose={() => setObtaining(null)}
                    onSave={(data) => {
                        const res = addMateria(data)
                        if (!res.success) return res.error
                        showToast(`Obtained ${MATERIA_TYPES[data.type].label} materia: ${MATERIA_TYPES[data.type].names[0]}!`, 'materia', 3500)
                        return null
                    }}
                />
            )}

            {editingMateria && (
                <MateriaForm
                    title={`Edit ${editingMateria.name}`}
                    initial={editingMateria}
                    onClose={() => setEditingMateria(null)}
                    onSave={(data) => { updateMateria(editingMateria.id, { category: data.category.trim() }); return null }}
                />
            )}

            {rewardForm && (
                <CustomRewardForm
                    kind={rewardForm.kind}
                    initial={rewardForm.initial}
                    onClose={() => setRewardForm(null)}
                    onDelete={rewardForm.initial ? () => {
                        const { kind, initial } = rewardForm
                        setRewardForm(null)
                        setConfirm({
                            title: `Delete ${initial.name}?`,
                            message: kind === 'badge' ? 'Its XP is removed too.' : 'This custom medal will be removed.',
                            action: () => (kind === 'badge' ? deleteBadge(initial.id) : deleteMedal(initial.id)),
                        })
                    } : undefined}
                    onSave={({ icon, name, amount, description }) => {
                        const { kind, initial } = rewardForm
                        if (kind === 'badge') {
                            if (initial) updateBadge(initial.id, { icon, name, xpBoost: amount, description })
                            else createCustomBadge({ icon, name, xpBoost: amount, description }, selectedDateId)
                        } else if (initial) updateMedal(initial.id, { icon, name, threshold: amount, description })
                        else createCustomMedal({ icon, name, threshold: amount, description }, year, month)
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={Boolean(releasing)}
                title={`Release ${releasing?.name}?`}
                message="Its AP and level are lost and its slot is freed. Quests and habits that used it keep their base XP; the materia bonus is removed."
                confirmText="Release"
                onConfirm={() => { deleteMateria(releasing.id); setReleasing(null) }}
                onCancel={() => setReleasing(null)}
            />

            <ConfirmDialog
                isOpen={Boolean(confirm)}
                title={confirm?.title}
                message={confirm?.message}
                confirmText="Delete"
                onConfirm={() => { confirm.action(); setConfirm(null) }}
                onCancel={() => setConfirm(null)}
            />
        </div>
    )
}

export default XPStatsView
