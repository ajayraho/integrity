import { useState, useEffect, useRef } from 'react'
import { getTotalXP, getXPForMonth, getMedalForMonth, getAllMedals, getBadgesForDate, checkMonthlyMedals, BADGE_TYPES, MEDAL_TIERS, awardBadge, awardMedal, getAllBadges, deleteBadge, updateBadge, deleteMedal, updateMedal } from '../utils/storage'
import ConfirmDialog from './ConfirmDialog'

// Hash-based color generation (same as DateHeader)
const getColorForBadge = (badgeName) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#FF8FA3', '#C9ADA7', '#6C757D', '#A8DADC', '#E63946'
    ]

    let hash = 0
    for (let i = 0; i < badgeName.length; i++) {
        hash = badgeName.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
}

function XPStatsView({ showXPGain, showXPLoss, showToast, showBadge, showMedal }) {
    const canvasRef = useRef(null)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [currentDay, setCurrentDay] = useState(new Date().getDate())
    const [totalXP, setTotalXP] = useState(0)
    const [monthlyData, setMonthlyData] = useState([])
    const [stats, setStats] = useState({ max: 0, avg: 0, daysActive: 0 })
    const [currentMedal, setCurrentMedal] = useState(null)
    const [allMedals, setAllMedals] = useState([])
    const [todayBadges, setTodayBadges] = useState([])
    const [earnedBadges, setEarnedBadges] = useState([])
    const [selectedBadge, setSelectedBadge] = useState(null)
    const [selectedMedal, setSelectedMedal] = useState(null)
    const [editingBadge, setEditingBadge] = useState({ icon: '', name: '', xp: 0, date: '' })
    const [editingMedal, setEditingMedal] = useState({ icon: '', name: '', threshold: 0, year: 0, month: 0 })
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' })

    useEffect(() => {
        loadData()
    }, [currentDate, currentDay])

    useEffect(() => {
        if (monthlyData.length > 0 && canvasRef.current) {
            drawGraph()
        }
    }, [monthlyData])

    const loadData = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1

        // Get total XP
        const total = getTotalXP()
        setTotalXP(total)

        // Get monthly XP data
        const data = getXPForMonth(year, month)

        // Fill in missing days with 0 XP
        const daysInMonth = new Date(year, month, 0).getDate()
        const filledData = []

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
            const existing = data.find(d => d.date === dateStr)
            filledData.push({
                date: dateStr,
                day,
                total: existing ? existing.total : 0
            })
        }

        setMonthlyData(filledData)

        // Calculate stats
        const activeDays = filledData.filter(d => d.total > 0)
        const maxXP = Math.max(...filledData.map(d => d.total), 0)
        const avgXP = activeDays.length > 0
            ? Math.round(activeDays.reduce((sum, d) => sum + d.total, 0) / activeDays.length)
            : 0

        setStats({
            max: maxXP,
            avg: avgXP,
            daysActive: activeDays.length
        })

        // Get current month's medal
        checkMonthlyMedals(year, month)
        const medal = getMedalForMonth(year, month)
        setCurrentMedal(medal)

        // Get all medals
        setAllMedals(getAllMedals())

        // Get badges for the current selected day
        const selectedDate = `${year}-${month.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`
        setTodayBadges(getBadgesForDate(selectedDate))

        // Get all earned badges
        setEarnedBadges(getAllBadges())
    }

    const handleBadgeDoubleClick = (badgeTypeKey) => {
        const selectedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

        // Check if badge is already earned on this date
        const existingBadge = earnedBadges.find(b => b.type === badgeTypeKey && b.date === selectedDate)

        if (existingBadge) {
            // Unachieve the badge - delete it
            const result = deleteBadge(existingBadge.id)
            if (result.success) {
                loadData()
                if (showXPLoss) {
                    showXPLoss(`${existingBadge.xpBoost} (Badge unachieved)`)
                }
            } else {
                if (showXPLoss) {
                    showXPLoss('Error unachieving badge: ' + result.error)
                }
            }
        } else {
            // Award the badge
            const badge = awardBadge(badgeTypeKey, selectedDate)
            if (badge) {
                loadData() // Reload to show the new badge
                // Trigger badge animation
                if (showBadge) {
                    showBadge(badge)
                }
            } else {
                if (showXPLoss) {
                    showXPLoss('Error awarding badge!')
                }
            }
        }
    }

    const handleMedalDoubleClick = (tierKey) => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1

        // Check if medal is already earned for this month/year
        const existingMedal = allMedals.find(m => m.tier === tierKey && m.year === year && m.month === month)

        if (existingMedal) {
            // Unachieve the medal - delete it (no XP deduction)
            const result = deleteMedal(existingMedal.id)
            if (result.success) {
                loadData()
                if (showToast) {
                    showToast('Medal unachieved!', 'success', 2500)
                }
            } else {
                if (showXPLoss) {
                    showXPLoss('Error unachieving medal: ' + result.error)
                }
            }
        } else {
            // Award the medal
            const medal = awardMedal(tierKey, year, month)
            if (medal) {
                loadData() // Reload to show the new medal
                // Trigger medal animation
                if (showMedal) {
                    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    showMedal(medal, monthName)
                }
            } else {
                if (showXPLoss) {
                    showXPLoss('Error awarding medal!')
                }
            }
        }
    }

    const isBadgeEarned = (badgeTypeKey) => {
        const selectedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
        return earnedBadges.some(b => b.type === badgeTypeKey && b.date === selectedDate)
    }

    const isMedalEarned = (tierKey) => {
        const selectedYear = currentDate.getFullYear()
        const selectedMonth = currentDate.getMonth() + 1
        return allMedals.some(m => m.tier === tierKey && m.year === selectedYear && m.month === selectedMonth)
    }

    const handleBadgeRightClick = (e, badge) => {
        e.preventDefault()
        setSelectedBadge(badge)
        setEditingBadge({
            icon: badge.icon,
            name: badge.name,
            xp: badge.xpBoost,
            date: badge.date
        })
    }

    const handleMedalRightClick = (e, medal) => {
        e.preventDefault()
        setSelectedMedal(medal)
        setEditingMedal({
            icon: medal.icon,
            name: medal.name,
            threshold: medal.threshold,
            year: medal.year,
            month: medal.month
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
                    loadData()
                    setSelectedBadge(null)
                    if (showXPGain) {
                        showXPGain('Badge deleted successfully')
                    }
                } else {
                    if (showXPLoss) {
                        showXPLoss('Error deleting badge: ' + result.error)
                    }
                }
                setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
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
                    loadData()
                    setSelectedMedal(null)
                    if (showXPGain) {
                        showXPGain('Medal deleted successfully')
                    }
                } else {
                    if (showXPLoss) {
                        showXPLoss('Error deleting medal: ' + result.error)
                    }
                }
                setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })
            }
        })
    }

    const handleUpdateBadge = () => {
        if (!editingBadge.icon || !editingBadge.name || editingBadge.xp <= 0) {
            if (showXPLoss) {
                showXPLoss('Please fill all fields correctly')
            }
            return
        }

        const result = updateBadge(selectedBadge.id, {
            icon: editingBadge.icon,
            name: editingBadge.name,
            xpBoost: editingBadge.xp
        })

        if (result.success) {
            loadData()
            setSelectedBadge(null)
            setEditingBadge({ icon: '', name: '', xp: 0, date: '' })
            if (showXPGain) {
                showXPGain('Badge updated successfully')
            }
        } else {
            if (showXPLoss) {
                showXPLoss('Error updating badge: ' + result.error)
            }
        }
    }

    const handleUpdateMedal = () => {
        if (!editingMedal.icon || !editingMedal.name || editingMedal.threshold <= 0) {
            if (showXPLoss) {
                showXPLoss('Please fill all fields correctly')
            }
            return
        }

        const result = updateMedal(selectedMedal.id, {
            icon: editingMedal.icon,
            name: editingMedal.name,
            threshold: editingMedal.threshold
        })

        if (result.success) {
            loadData()
            setSelectedMedal(null)
            setEditingMedal({ icon: '', name: '', threshold: 0, year: 0, month: 0 })
            if (showXPGain) {
                showXPGain('Medal updated successfully')
            }
        } else {
            if (showXPLoss) {
                showXPLoss('Error updating medal: ' + result.error)
            }
        }
    }

    const drawGraph = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Styling
        const padding = 60
        const graphWidth = width - padding * 2
        const graphHeight = height - padding * 2

        // Get max value for scaling
        const maxValue = Math.max(...monthlyData.map(d => d.total), 10)
        const yScale = graphHeight / maxValue

        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 1
        const gridLines = 5
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (graphHeight / gridLines) * i
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(width - padding, y)
            ctx.stroke()

            // Y-axis labels
            const value = Math.round(maxValue - (maxValue / gridLines) * i)
            ctx.fillStyle = '#666'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillText(value.toString(), padding - 10, y + 4)
        }

        // Draw line graph
        ctx.strokeStyle = '#2C3E50'
        ctx.lineWidth = 3
        ctx.beginPath()

        monthlyData.forEach((point, index) => {
            const x = padding + (graphWidth / (monthlyData.length - 1)) * index
            const y = height - padding - point.total * yScale

            if (index === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        })

        ctx.stroke()

        // Draw data points
        monthlyData.forEach((point, index) => {
            const x = padding + (graphWidth / (monthlyData.length - 1)) * index
            const y = height - padding - point.total * yScale

            // Draw point
            ctx.fillStyle = point.total > 0 ? '#4CAF50' : '#ccc'
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.fill()

            // Draw X-axis labels (every 5 days)
            if (point.day % 5 === 0 || point.day === 1) {
                ctx.fillStyle = '#666'
                ctx.font = '11px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(point.day.toString(), x, height - padding + 20)
            }
        })

        // Draw today indicator
        const today = new Date()
        if (today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()) {
            const todayDay = today.getDate()
            const todayIndex = monthlyData.findIndex(d => d.day === todayDay)
            if (todayIndex !== -1) {
                const x = padding + (graphWidth / (monthlyData.length - 1)) * todayIndex
                ctx.strokeStyle = '#FF5722'
                ctx.lineWidth = 2
                ctx.setLineDash([5, 5])
                ctx.beginPath()
                ctx.moveTo(x, padding)
                ctx.lineTo(x, height - padding)
                ctx.stroke()
                ctx.setLineDash([])

                // Label
                ctx.fillStyle = '#FF5722'
                ctx.font = 'bold 12px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText('TODAY', x, padding - 10)
            }
        }

        // X-axis title
        ctx.fillStyle = '#333'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Day of Month', width / 2, height - 10)

        // Y-axis title
        ctx.save()
        ctx.translate(20, height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText('XP Points', 0, 0)
        ctx.restore()
    }

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + delta)
        setCurrentDate(newDate)
        setCurrentDay(1) // Reset to first day of new month
    }

    const changeDay = (delta) => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        let newDay = currentDay + delta
        let newDate = new Date(currentDate)

        // Handle going to previous month
        if (newDay < 1) {
            newDate.setMonth(month - 1)
            const prevMonthDays = new Date(year, month, 0).getDate()
            newDay = prevMonthDays
            setCurrentDate(newDate)
        }
        // Handle going to next month
        else if (newDay > daysInMonth) {
            newDate.setMonth(month + 1)
            newDay = 1
            setCurrentDate(newDate)
        }

        setCurrentDay(newDay)
    }

    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const formatCurrentDate = () => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDay)
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

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

                {/* All Badges Gallery */}
                <div className="bg-white border-2 border-line rounded-lg shadow-lg p-6 mb-8">
                    <h3 className="text-xl font-bold text-ink mb-4">🏆 All Badges</h3>
                    <p className="text-sm text-ink/60 mb-4">Double-click to award • Click dot to view/delete</p>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4 min-w-min">
                            {Object.entries(BADGE_TYPES).map(([key, badge]) => {
                                const isEarned = isBadgeEarned(key)
                                const bgColor = getColorForBadge(badge.name)
                                const earnedBadge = earnedBadges.find(b => b.type === key)

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
                    <h3 className="text-xl font-bold text-ink mb-4">🏅 All Medals</h3>
                    <p className="text-sm text-ink/60 mb-4">Double-click to award • Click dot to view/delete</p>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4 min-w-min">
                            {Object.entries(MEDAL_TIERS).map(([key, medal]) => {
                                const isEarned = isMedalEarned(key)
                                const earnedMedal = allMedals.find(m => m.tier === key)

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
                            width={1000}
                            height={400}
                            className="w-full"
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
                                <label className="block text-sm font-medium text-ink mb-1">Date</label>
                                <div className="px-3 py-2 bg-gray-100 rounded-lg text-ink/60">
                                    {editingBadge.date}
                                </div>
                                <p className="text-xs text-ink/60 mt-1">Use day navigation to change the date</p>
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
                                <label className="block text-sm font-medium text-ink mb-1">Month & Year</label>
                                <div className="px-3 py-2 bg-gray-100 rounded-lg text-ink/60">
                                    {new Date(editingMedal.year, editingMedal.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                                <p className="text-xs text-ink/60 mt-1">Medal month/year cannot be changed</p>
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

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.action}
                onCancel={() => setConfirmDialog({ isOpen: false, action: null, title: '', message: '' })}
                confirmStyle="danger"
            />
        </div>
    )
}

export default XPStatsView
