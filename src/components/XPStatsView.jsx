import { useState, useEffect, useRef, useCallback } from 'react'
import {
    getTotalXP, getXPForMonth, getMedalForMonth, getAllMedals, getBadgesForDate, checkMonthlyMedals,
    BADGE_TYPES, MEDAL_TIERS, awardBadge, awardMedal, deleteBadge, updateBadge,
    deleteMedal, updateMedal, createCustomBadge, createCustomMedal,
} from '../utils/storage'
import { useStoreVersion } from '../hooks/useStore'
import { useFeedback } from '../hooks/useFeedback'
import { toDateId, addMonths, daysInMonth } from '../utils/date'
import { badgeColor as getColorForBadge } from '../utils/badgeColor'
import ConfirmDialog from './ConfirmDialog'

const GRAPH_W = 1000
const GRAPH_H = 400

function XPStatsView() {
    const version = useStoreVersion()
    const { showToast, showBadge, showMedal } = useFeedback()
    const canvasRef = useRef(null)
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [selectedBadge, setSelectedBadge] = useState(null)
    const [selectedMedal, setSelectedMedal] = useState(null)
    const [editingBadge, setEditingBadge] = useState({ icon: '', name: '', xp: 0, description: '' })
    const [editingMedal, setEditingMedal] = useState({ icon: '', name: '', threshold: 0, description: '', year: 0, month: 0 })
    const [showCreateBadge, setShowCreateBadge] = useState(false)
    const [showCreateMedal, setShowCreateMedal] = useState(false)
    const [newBadge, setNewBadge] = useState({ icon: '', name: '', xp: 0, description: '' })
    const [newMedal, setNewMedal] = useState({ icon: '', name: '', threshold: 0, description: '' })
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })

    // Kept for the JSX below
    const currentDate = selectedDate
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth() + 1
    const selectedDateId = toDateId(selectedDate)

    // ---- derived data (recomputed on every store change) ----
    const totalXP = getTotalXP()
    const monthTotals = getXPForMonth(year, month)
    const monthlyData = []
    for (let day = 1; day <= daysInMonth(year, month - 1); day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        monthlyData.push({ date: dateStr, day, total: monthTotals.find(d => d.date === dateStr)?.total || 0 })
    }
    const activeDays = monthlyData.filter(d => d.total > 0)
    const stats = {
        max: Math.max(0, ...monthlyData.map(d => d.total)),
        avg: activeDays.length ? Math.round(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length) : 0,
        daysActive: activeDays.length,
    }
    const currentMedal = getMedalForMonth(year, month)
    const allMedals = getAllMedals()
    const todayBadges = getBadgesForDate(selectedDateId)

    // Catch up on medals for XP earned before medals existed (respects revoked medals)
    useEffect(() => {
        const medal = checkMonthlyMedals(year, month)
        if (medal) showMedal(medal)
    }, [year, month, version, showMedal])

    const closeConfirm = () => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })

    const handleBadgeDoubleClick = (badgeTypeKey) => {
        const existingBadge = todayBadges.find(b => b.type === badgeTypeKey)
        if (existingBadge) {
            const result = deleteBadge(existingBadge.id)
            if (result.success) showToast(`Badge removed (−${existingBadge.xpBoost} XP)`, 'info')
            else showToast('Could not remove badge: ' + result.error, 'error')
        } else {
            const badge = awardBadge(badgeTypeKey, selectedDateId)
            if (badge) showBadge(badge)
            else showToast('Could not award badge', 'error')
        }
    }

    const handleMedalDoubleClick = (tierKey) => {
        const existingMedal = allMedals.find(m => m.tier === tierKey && m.year === year && m.month === month)
        if (existingMedal) {
            const result = deleteMedal(existingMedal.id)
            if (result.success) showToast('Medal removed', 'info')
            else showToast('Could not remove medal: ' + result.error, 'error')
        } else {
            const medal = awardMedal(tierKey, year, month)
            if (medal) showMedal(medal)
            else showToast('Could not award medal', 'error')
        }
    }

    const isBadgeEarned = (badgeTypeKey) => todayBadges.some(b => b.type === badgeTypeKey)

    const isMedalEarned = (tierKey) => allMedals.some(m => m.tier === tierKey && m.year === year && m.month === month)

    const handleBadgeRightClick = (e, badge) => {
        e.preventDefault()
        setSelectedBadge(badge)
        setEditingBadge({ icon: badge.icon, name: badge.name, xp: badge.xpBoost, description: badge.description || '' })
    }

    const handleMedalRightClick = (e, medal) => {
        e.preventDefault()
        setSelectedMedal(medal)
        setEditingMedal({
            icon: medal.icon, name: medal.name, threshold: medal.threshold,
            description: medal.description || '', year: medal.year, month: medal.month,
        })
    }

    const handleDeleteBadge = (badgeId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Badge',
            message: 'Are you sure you want to delete this badge? This will also remove the associated XP.',
            action: () => {
                const result = deleteBadge(badgeId)
                if (result.success) {
                    setSelectedBadge(null)
                    showToast('Badge deleted', 'info')
                } else {
                    showToast('Could not delete badge: ' + result.error, 'error')
                }
                closeConfirm()
            }
        })
    }

    const handleDeleteMedal = (medalId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Medal',
            message: 'Are you sure you want to delete this medal?',
            action: () => {
                const result = deleteMedal(medalId)
                if (result.success) {
                    setSelectedMedal(null)
                    showToast('Medal deleted', 'info')
                } else {
                    showToast('Could not delete medal: ' + result.error, 'error')
                }
                closeConfirm()
            }
        })
    }

    const handleUpdateBadge = () => {
        if (!editingBadge.icon || !editingBadge.name || editingBadge.xp <= 0) {
            showToast('Please fill all fields (XP must be above 0)', 'error')
            return
        }
        const result = updateBadge(selectedBadge.id, {
            icon: editingBadge.icon, name: editingBadge.name,
            xpBoost: editingBadge.xp, description: editingBadge.description,
        })
        if (result.success) {
            setSelectedBadge(null)
            setEditingBadge({ icon: '', name: '', xp: 0, description: '' })
            showToast('Badge updated')
        } else {
            showToast('Could not update badge: ' + result.error, 'error')
        }
    }

    const handleUpdateMedal = () => {
        if (!editingMedal.icon || !editingMedal.name || editingMedal.threshold <= 0) {
            showToast('Please fill all fields (threshold must be above 0)', 'error')
            return
        }
        const result = updateMedal(selectedMedal.id, {
            icon: editingMedal.icon, name: editingMedal.name,
            threshold: editingMedal.threshold, description: editingMedal.description,
        })
        if (result.success) {
            setSelectedMedal(null)
            setEditingMedal({ icon: '', name: '', threshold: 0, description: '', year: 0, month: 0 })
            showToast('Medal updated')
        } else {
            showToast('Could not update medal: ' + result.error, 'error')
        }
    }

    const handleCreateBadge = () => {
        if (!newBadge.icon || !newBadge.name || newBadge.xp <= 0) {
            showToast('Please fill all fields (XP must be above 0)', 'error')
            return
        }
        const badge = createCustomBadge({
            name: newBadge.name, icon: newBadge.icon, xpBoost: newBadge.xp, description: newBadge.description,
        }, selectedDateId)
        setShowCreateBadge(false)
        setNewBadge({ icon: '', name: '', xp: 0, description: '' })
        showBadge(badge)
    }

    const handleCreateMedal = () => {
        if (!newMedal.icon || !newMedal.name || newMedal.threshold <= 0) {
            showToast('Please fill all fields (threshold must be above 0)', 'error')
            return
        }
        const medal = createCustomMedal({
            name: newMedal.name, icon: newMedal.icon, threshold: newMedal.threshold, description: newMedal.description,
        }, year, month)
        setShowCreateMedal(false)
        setNewMedal({ icon: '', name: '', threshold: 0, description: '' })
        showMedal(medal)
    }

    const drawGraph = useCallback((data) => {
        const canvas = canvasRef.current
        if (!canvas || !data.length) return

        // Sharp on high-DPI screens
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
        const yScale = graphHeight / maxValue
        const xAt = (index) => padding + (graphWidth / Math.max(data.length - 1, 1)) * index

        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1
        const gridLines = 5
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (graphHeight / gridLines) * i
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(width - padding, y)
            ctx.stroke()
            const value = Math.round(maxValue - (maxValue / gridLines) * i)
            ctx.fillStyle = '#666'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillText(value.toString(), padding - 10, y + 4)
        }

        ctx.strokeStyle = '#2C3E50'
        ctx.lineWidth = 3
        ctx.beginPath()
        data.forEach((point, index) => {
            const x = xAt(index)
            const y = height - padding - point.total * yScale
            if (index === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        })
        ctx.stroke()

        data.forEach((point, index) => {
            const x = xAt(index)
            const y = height - padding - point.total * yScale
            ctx.fillStyle = point.total > 0 ? '#4CAF50' : '#ccc'
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fill()
            if (point.day % 5 === 0 || point.day === 1) {
                ctx.fillStyle = '#666'
                ctx.font = '11px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(point.day.toString(), x, height - padding + 20)
            }
        })

        const todayStr = toDateId(new Date())
        const todayIndex = data.findIndex(d => d.date === todayStr)
        if (todayIndex !== -1) {
            const x = xAt(todayIndex)
            ctx.strokeStyle = '#FF5722'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            ctx.beginPath()
            ctx.moveTo(x, padding)
            ctx.lineTo(x, height - padding)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.fillStyle = '#FF5722'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('TODAY', x, padding - 10)
        }

        ctx.fillStyle = '#333'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Day of Month', width / 2, height - 10)
        ctx.save()
        ctx.translate(20, height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText('XP Points', 0, 0)
        ctx.restore()
    }, [])

    const graphKey = monthlyData.map(d => d.total).join(',') + '|' + year + '-' + month
    useEffect(() => {
        drawGraph(monthlyData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphKey, drawGraph])

    const changeMonth = (delta) => {
        // Clamp the day (31 Oct -> 30 Nov, not 1 Dec)
        setSelectedDate(prev => addMonths(prev, delta))
    }

    const changeDay = (delta) => {
        setSelectedDate(prev => {
            const d = new Date(prev)
            d.setDate(d.getDate() + delta)
            return d
        })
    }

    const formatMonthYear = () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const formatCurrentDate = () => currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div className="xp-stats-view min-h-screen bg-paper py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-ink mb-2">🏆 XP Statistics</h1>
                    <p className="text-lg text-ink/60">Track your progress and earn rewards</p>
                </div>

                {/* Total XP Card */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg shadow-lg p-8 mb-8 text-white text-center">
                    <div className="text-6xl font-bold mb-2">{totalXP.toLocaleString()}</div>
                    <div className="text-xl font-semibold">Total XP</div>
                </div>

                {/* Month selector */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="px-4 py-2 bg-white border-2 border-line rounded-lg hover:bg-line/20 transition-colors font-medium"
                    >
                        ← Previous
                    </button>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-ink">{formatMonthYear()}</h2>
                        {currentMedal && (
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="text-2xl">{currentMedal.icon}</span>
                                <span className="text-sm font-semibold text-ink/70">{currentMedal.name}</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => changeMonth(1)}
                        className="px-4 py-2 bg-white border-2 border-line rounded-lg hover:bg-line/20 transition-colors font-medium"
                    >
                        Next →
                    </button>
                </div>

                {/* Day selector */}
                <div className="flex items-center justify-between mb-8 bg-white border-2 border-line rounded-lg p-4">
                    <button
                        onClick={() => changeDay(-1)}
                        className="px-3 py-1 bg-gray-100 border border-line rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                        ← Prev Day
                    </button>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-ink">{formatCurrentDate()}</div>
                    </div>
                    <button
                        onClick={() => changeDay(1)}
                        className="px-3 py-1 bg-gray-100 border border-line rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                        Next Day →
                    </button>
                </div>

                {/* Badges earned on the selected day (includes custom badges) */}
                <div className="bg-white border-2 border-line rounded-lg p-4 mb-8">
                    <h3 className="text-lg font-bold text-ink mb-3">Badges on {formatCurrentDate()}</h3>
                    {todayBadges.length === 0 ? (
                        <p className="text-sm text-ink/60">None yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {todayBadges.map(b => (
                                <button
                                    key={b.id}
                                    onClick={(e) => handleBadgeRightClick(e, b)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full text-white shadow"
                                    style={{ backgroundColor: getColorForBadge(b.name) }}
                                    title="Edit or delete"
                                >
                                    <span className="text-lg">{b.icon}</span>
                                    <span className="text-sm font-semibold">{b.name}</span>
                                    <span className="text-xs opacity-90">+{b.xpBoost}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* All Badges Gallery */}
                <div className="bg-white border-2 border-line rounded-lg shadow-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-ink">🏆 All Badges</h3>
                        <button
                            onClick={() => setShowCreateBadge(true)}
                            className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center text-xl font-bold shadow-md"
                            title="Create custom badge"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-sm text-ink/60 mb-4">Double-click to award/remove for the selected day • Click dot to edit</p>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4 min-w-min">
                            {Object.entries(BADGE_TYPES).map(([key, badge]) => {
                                const isEarned = isBadgeEarned(key)
                                const bgColor = getColorForBadge(badge.name)
                                const earnedBadge = todayBadges.find(b => b.type === key)

                                return (
                                    <div
                                        key={key}
                                        onDoubleClick={() => handleBadgeDoubleClick(key)}
                                        className={`relative flex-shrink-0 w-32 p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${isEarned
                                            ? 'border-line hover:shadow-lg hover:scale-105 bg-gradient-to-b from-white to-gray-50'
                                            : 'border-gray-300 opacity-40 grayscale hover:opacity-60'
                                            }`}
                                        title={badge.description}
                                    >
                                        {/* Edit/Delete Icon */}
                                        {earnedBadge && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleBadgeRightClick(e, earnedBadge)
                                                }}
                                                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-700 hover:bg-gray-900 transition-colors z-10"
                                                title="Edit or delete"
                                            />
                                        )}
                                        <div className="text-4xl mb-2">{badge.icon}</div>
                                        <div className="text-xs font-bold text-ink mb-1">{badge.name}</div>
                                        <div
                                            className="text-xs font-semibold mb-1"
                                            style={{ color: isEarned ? bgColor : '#9CA3AF' }}
                                        >
                                            +{badge.xpBoost} XP
                                        </div>
                                        {isEarned ? (
                                            <div className="text-xs text-green-600 font-semibold">✓ Earned</div>
                                        ) : (
                                            <div className="text-xs text-gray-400">Locked</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* All Medals Gallery */}
                <div className="bg-white border-2 border-line rounded-lg shadow-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-ink">🏅 All Medals</h3>
                        <button
                            onClick={() => setShowCreateMedal(true)}
                            className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center text-xl font-bold shadow-md"
                            title="Create custom medal"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-sm text-ink/60 mb-4">Double-click to award/remove for this month • Click dot to edit</p>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4 min-w-min">
                            {Object.entries(MEDAL_TIERS).map(([key, medal]) => {
                                const isEarned = isMedalEarned(key)
                                const earnedMedal = allMedals.find(m => m.tier === key && m.year === year && m.month === month)

                                return (
                                    <div
                                        key={key}
                                        onDoubleClick={() => handleMedalDoubleClick(key)}
                                        className={`relative flex-shrink-0 w-32 p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${isEarned
                                            ? 'border-line hover:shadow-lg hover:scale-105'
                                            : 'border-gray-300 opacity-40 grayscale hover:opacity-60'
                                            }`}
                                        style={{
                                            background: isEarned
                                                ? `linear-gradient(to bottom, ${medal.color}20, ${medal.color}10)`
                                                : 'linear-gradient(to bottom, #f9fafb, #f3f4f6)'
                                        }}
                                    >
                                        {/* Edit/Delete Icon */}
                                        {earnedMedal && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleMedalRightClick(e, earnedMedal)
                                                }}
                                                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-700 hover:bg-gray-900 transition-colors z-10"
                                                title="Edit or delete"
                                            />
                                        )}
                                        <div className="text-5xl mb-2">{medal.icon}</div>
                                        <div className="text-xs font-bold text-ink mb-1">{medal.name}</div>
                                        <div
                                            className="text-xs font-semibold mb-1"
                                            style={{ color: isEarned ? medal.color : '#9CA3AF' }}
                                        >
                                            {medal.threshold}+ XP
                                        </div>
                                        {isEarned ? (
                                            <div className="text-xs text-green-600 font-semibold">✓ Earned</div>
                                        ) : (
                                            <div className="text-xs text-gray-400">Locked</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border-2 border-line rounded-lg p-6 text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{stats.max}</div>
                        <div className="text-sm font-semibold text-ink/60">Peak Day XP</div>
                    </div>
                    <div className="bg-white border-2 border-line rounded-lg p-6 text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">{stats.avg}</div>
                        <div className="text-sm font-semibold text-ink/60">Average XP/Day</div>
                    </div>
                    <div className="bg-white border-2 border-line rounded-lg p-6 text-center">
                        <div className="text-4xl font-bold text-purple-600 mb-2">{stats.daysActive}</div>
                        <div className="text-sm font-semibold text-ink/60">Active Days</div>
                    </div>
                </div>

                {/* Graph */}
                <div className="bg-white border-2 border-line rounded-lg p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-ink mb-4">Daily XP Progress</h3>
                    <div className="overflow-x-auto">
                        <canvas
                            ref={canvasRef}
                            width={GRAPH_W}
                            height={GRAPH_H}
                            className="w-full min-w-[600px]"
                        />
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-ink/60">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span>Active Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                        <span>Inactive Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-red-500"></div>
                        <span>Today</span>
                    </div>
                </div>
            </div>

            {/* Badge Edit Modal */}
            {selectedBadge && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedBadge(null)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-4">Edit Badge</h3>
                        <div className="mb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Emoji</label>
                                <input
                                    type="text"
                                    value={editingBadge.icon}
                                    onChange={(e) => setEditingBadge({ ...editingBadge, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                                    placeholder="🏆"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingBadge.name}
                                    onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Badge Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">XP Boost</label>
                                <input
                                    type="number"
                                    value={editingBadge.xp}
                                    onChange={(e) => setEditingBadge({ ...editingBadge, xp: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="50"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                                <textarea
                                    value={editingBadge.description}
                                    onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="What does this badge represent?"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdateBadge}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                Update
                            </button>
                            <button
                                onClick={() => handleDeleteBadge(selectedBadge.id)}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedBadge(null)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-ink rounded-lg hover:bg-gray-400 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Medal Edit Modal */}
            {selectedMedal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMedal(null)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-4">Edit Medal</h3>
                        <div className="mb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Emoji</label>
                                <input
                                    type="text"
                                    value={editingMedal.icon}
                                    onChange={(e) => setEditingMedal({ ...editingMedal, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                                    placeholder="🥇"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingMedal.name}
                                    onChange={(e) => setEditingMedal({ ...editingMedal, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Medal Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">XP Threshold</label>
                                <input
                                    type="number"
                                    value={editingMedal.threshold}
                                    onChange={(e) => setEditingMedal({ ...editingMedal, threshold: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="100"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                                <textarea
                                    value={editingMedal.description}
                                    onChange={(e) => setEditingMedal({ ...editingMedal, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="What does this medal represent?"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdateMedal}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                Update
                            </button>
                            <button
                                onClick={() => handleDeleteMedal(selectedMedal.id)}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedMedal(null)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-ink rounded-lg hover:bg-gray-400 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Badge Modal */}
            {showCreateBadge && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateBadge(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-4">Create Custom Badge</h3>
                        <div className="mb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Emoji</label>
                                <input
                                    type="text"
                                    value={newBadge.icon}
                                    onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                                    placeholder="🏆"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newBadge.name}
                                    onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Badge Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">XP Boost</label>
                                <input
                                    type="number"
                                    value={newBadge.xp}
                                    onChange={(e) => setNewBadge({ ...newBadge, xp: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="50"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                                <textarea
                                    value={newBadge.description}
                                    onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="What does this badge represent?"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateBadge}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateBadge(false)
                                    setNewBadge({ icon: '', name: '', xp: 0, description: '' })
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-ink rounded-lg hover:bg-gray-400 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Medal Modal */}
            {showCreateMedal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateMedal(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-4">Create Custom Medal</h3>
                        <div className="mb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Emoji</label>
                                <input
                                    type="text"
                                    value={newMedal.icon}
                                    onChange={(e) => setNewMedal({ ...newMedal, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                                    placeholder="🥇"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newMedal.name}
                                    onChange={(e) => setNewMedal({ ...newMedal, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Medal Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">XP Threshold</label>
                                <input
                                    type="number"
                                    value={newMedal.threshold}
                                    onChange={(e) => setNewMedal({ ...newMedal, threshold: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="100"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                                <textarea
                                    value={newMedal.description}
                                    onChange={(e) => setNewMedal({ ...newMedal, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="What does this medal represent?"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateMedal}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateMedal(false)
                                    setNewMedal({ icon: '', name: '', threshold: 0, description: '' })
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-ink rounded-lg hover:bg-gray-400 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={closeConfirm}
                confirmStyle="danger"
            />
        </div>
    )
}

export default XPStatsView
