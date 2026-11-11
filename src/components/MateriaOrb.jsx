import { MAGIC_MATERIA_COLOR, MATERIA_LEVEL_COLORS } from '../game/config.js'

/**
 * A glowing FF7 magic materia (always green, like in the game).
 * The ring shows the materia's level in jikanto's colours: cyan ★1, yellow ★2, red ★3, gold ★4.
 */
function MateriaOrb({ materia, level, size = 14, title, className = '' }) {
    const lvl = level ?? materia?.level
    const ring = materia && lvl ? MATERIA_LEVEL_COLORS[Math.min(lvl, MATERIA_LEVEL_COLORS.length) - 1] : null
    const color = materia ? MAGIC_MATERIA_COLOR : '#cfd8dc'
    return (
        <span
            className={`materia-orb inline-block rounded-full flex-shrink-0 ${materia ? 'materia-orb--glow' : ''} ${className}`}
            title={title}
            style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 35%, ${color}cc 60%, #00000066 100%)`,
                outline: ring ? `${Math.max(1, Math.round(size / 10))}px solid ${ring}` : undefined,
                outlineOffset: 1,
                '--orb-color': color,
            }}
        />
    )
}

export default MateriaOrb
