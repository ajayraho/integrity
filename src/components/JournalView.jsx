import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import DaySection from './DaySection'
import JumpToTodayButton from './JumpToTodayButton'
import { todayId as getTodayId, addDays } from '../utils/date'

const PAGE = 7 // days loaded per scroll step

function rangeAround(centerId, before, after) {
    const ids = []
    for (let i = -before; i <= after; i++) ids.push(addDays(centerId, i))
    return ids
}

/**
 * Continuous scroll journal. Holds only the list of visible day ids; each
 * DaySection reads/writes its own day in the store, so loading more days never
 * touches (or overwrites) saved data.
 */
function JournalView({ initialDayId }) {
    const [todayId, setTodayId] = useState(getTodayId)
    const [dayIds, setDayIds] = useState(() => rangeAround(initialDayId || todayId, 0, 1))
    const anchorRef = useRef(initialDayId || todayId) // day to scroll to after render
    const [todayOffscreen, setTodayOffscreen] = useState(false)
    const containerRef = useRef(null)
    const topSentinelRef = useRef(null)
    const bottomSentinelRef = useRef(null)
    const prependRef = useRef(null) // { id, top } of the day on screen before prepending

    // Midnight rollover: keep "today" correct if the app stays open
    useEffect(() => {
        const t = setInterval(() => {
            const id = getTodayId()
            setTodayId(prev => (prev === id ? prev : id))
        }, 60 * 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
        return () => {
            if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
        }
    }, [])

    // Scroll the anchor day to the top after it renders
    useLayoutEffect(() => {
        const id = anchorRef.current
        if (!id || !containerRef.current) return
        const el = containerRef.current.querySelector(`[data-day-id="${id}"]`)
        if (el) {
            containerRef.current.scrollTop = el.parentElement.offsetTop
            anchorRef.current = null
        }
    }, [dayIds])

    // Keep the visible day in place when days are added above it
    useLayoutEffect(() => {
        const c = containerRef.current
        const saved = prependRef.current
        if (!c || !saved) return
        prependRef.current = null
        const el = c.querySelector(`[data-day-id="${saved.id}"]`)
        if (el) c.scrollTop += el.getBoundingClientRect().top - saved.top
    }, [dayIds])

    const loadPastDays = useCallback(() => {
        if (anchorRef.current) return // wait until positioning is done
        const c = containerRef.current
        if (c && !prependRef.current) {
            const cTop = c.getBoundingClientRect().top
            const visible = [...c.querySelectorAll('[data-day-id]')].find(el => el.getBoundingClientRect().bottom > cTop + 1)
            if (visible) prependRef.current = { id: visible.dataset.dayId, top: visible.getBoundingClientRect().top }
        }
        setDayIds(prev => {
            const oldest = prev[0]
            const more = []
            for (let i = PAGE; i >= 1; i--) more.push(addDays(oldest, -i))
            return [...more, ...prev]
        })
    }, [])

    const loadFutureDays = useCallback(() => {
        setDayIds(prev => {
            const newest = prev[prev.length - 1]
            const more = []
            for (let i = 1; i <= PAGE; i++) more.push(addDays(newest, i))
            return [...prev, ...more]
        })
    }, [])

    // Observers are re-created whenever the list changes; observe() reports the
    // current state immediately, so if a sentinel is still visible we keep loading.
    useEffect(() => {
        const root = containerRef.current
        if (!root) return
        const opts = { root, rootMargin: '300px 0px' }
        const top = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadPastDays() }, opts)
        const bottom = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadFutureDays() }, opts)
        if (topSentinelRef.current) top.observe(topSentinelRef.current)
        if (bottomSentinelRef.current) bottom.observe(bottomSentinelRef.current)
        return () => {
            top.disconnect()
            bottom.disconnect()
        }
    }, [dayIds, loadPastDays, loadFutureDays])

    // Show "Today" button when today isn't on screen
    useEffect(() => {
        const root = containerRef.current
        const el = root?.querySelector(`[data-day-id="${todayId}"]`)
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => setTodayOffscreen(!entry.isIntersecting),
            { threshold: 0.1, root }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [dayIds, todayId])

    const jumpToToday = () => {
        const el = containerRef.current?.querySelector(`[data-day-id="${todayId}"]`)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
            anchorRef.current = todayId
            setDayIds(rangeAround(todayId, 0, 1))
        }
    }

    return (
        <>
            <div
                ref={containerRef}
                className="journal-view snap-y snap-mandatory h-screen overflow-y-scroll overflow-x-hidden"
                style={{ overflowAnchor: 'none' }}
            >
                <div ref={topSentinelRef} className="h-px" />

                {dayIds.map((id) => (
                    <div key={id}>
                        <DaySection
                            dayId={id}
                            isToday={id === todayId}
                            autoFocus={false}
                        />
                    </div>
                ))}

                <div ref={bottomSentinelRef} className="h-px" />
            </div>

            <JumpToTodayButton onJumpToToday={jumpToToday} isVisible={!dayIds.includes(todayId) || todayOffscreen} />
        </>
    )
}

export default JournalView
