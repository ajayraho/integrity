import { useId } from 'react'
import { STREAK_TIER_COLORS } from '../game/config.js'

const ROMAN = ['', 'I', 'II', 'III', 'IV']

/**
 * Original tiered rank emblem (shield + metal gradient), in the spirit of
 * battle-royale rank badges. `rank` comes from STREAK_RANKS; null = unranked.
 */
function RankBadge({ rank, size = 32, dim = false }) {
    const id = useId().replace(/:/g, '')
    const tier = rank?.tier || 'unranked'
    const [light, dark] = STREAK_TIER_COLORS[tier]
    const heroic = tier === 'heroic'
    const textColor = tier === 'silver' || tier === 'platinum' || tier === 'diamond' ? '#1b2a3a' : '#ffffff'

    return (
        <svg
            width={size}
            height={size * 1.1}
            viewBox="-2 0 44 44"
            aria-hidden="true"
            style={{ opacity: dim ? 0.45 : 1, filter: rank ? `drop-shadow(0 1px 2px ${dark}99)` : undefined }}
        >
            <defs>
                <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={light} />
                    <stop offset="100%" stopColor={dark} />
                </linearGradient>
                <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>

            {heroic && (
                <g fill={`url(#g${id})`} stroke={dark} strokeWidth="0.8">
                    <path d="M6 12 L0 8 L2 18 L-1 22 L5 24 L6 30 Z" />
                    <path d="M34 12 L40 8 L38 18 L41 22 L35 24 L34 30 Z" />
                </g>
            )}

            {/* shield */}
            <path
                d="M20 2 L35 8 V21 C35 31 28 38 20 42 C12 38 5 31 5 21 V8 Z"
                fill={rank ? `url(#g${id})` : 'none'}
                stroke={dark}
                strokeWidth="1.6"
                strokeDasharray={rank ? undefined : '3 2'}
            />
            {rank && <path d="M20 4 L33 9 V20 C33 23 32 26 30 28 L10 12 Z" fill={`url(#s${id})`} />}

            {heroic ? (
                // crown
                <path d="M12 26 L13 16 L17 21 L20 14 L23 21 L27 16 L28 26 Z" fill="#fff8e1" stroke={dark} strokeWidth="1" />
            ) : rank ? (
                <text x="20" y="27" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Georgia, serif" fill={textColor}>
                    {ROMAN[rank.level]}
                </text>
            ) : (
                <text x="20" y="26" textAnchor="middle" fontSize="11" fill={dark}>–</text>
            )}
        </svg>
    )
}

export default RankBadge
