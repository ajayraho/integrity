import { useState, useEffect, useRef } from 'react'
import { getTotalXP, getXPForMonth } from '../utils/storage'

function XPStatsView() {
    const canvasRef = useRef(null)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [totalXP, setTotalXP] = useState(0)
    const [monthlyData, setMonthlyData] = useState([])
    const [stats, setStats] = useState({ max: 0, avg: 0, daysActive: 0 })

    useEffect(() => {
        loadData()
    }, [currentDate])

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
    }

    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
                    <h2 className="text-2xl font-bold text-ink">{formatMonthYear()}</h2>
                    <button
                        onClick={() => changeMonth(1)}
                        className="px-4 py-2 bg-white border-2 border-line rounded-lg hover:bg-line/20 transition-colors font-medium"
                    >
                        Next →
                    </button>
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
        </div>
    )
}

export default XPStatsView
