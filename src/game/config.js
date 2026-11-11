// All the numbers that control the game, in one place so they're easy to tune.

// ---------- Materia ----------
// The 12 magic materia from Final Fantasy VII Remake. Each level teaches the
// next spell (Fire → Fira → Firaga). In the game every magic materia is GREEN,
// so all orbs are green; the level is shown with jikanto's level colours.
//
// Mapping to life areas is by what the materia *does* in battle, not its name:
//   offence that hits the right weakness, defence, recovery and control.
// Categories are suggestions and can be renamed.
//
// `ap` = total AP needed for each level, modelled on the game (★2 at 300 AP).
const AP_2 = [0, 300]
const AP_3 = [0, 300, 900]
const AP_4 = [0, 300, 750, 1200] // Healing: Cura 300, then +450, +450

export const MAGIC_MATERIA_COLOR = '#2ecc71' // FF7 magic materia green

export const MATERIA_TYPES = {
    fire: {
        label: 'Fire', names: ['Fire', 'Fira', 'Firaga'], ap: AP_3,
        category: 'Fitness & Training',
        why: 'The raw-damage spell you lean on all game. Training is how you raise your own raw power.',
    },
    lightning: {
        label: 'Lightning', names: ['Thunder', 'Thundara', 'Thundaga'], ap: AP_3,
        category: 'Career & Work',
        why: "The answer to Shinra's machines and robots. Your work, your job, the corporate grind.",
    },
    ice: {
        label: 'Ice', names: ['Blizzard', 'Blizzara', 'Blizzaga'], ap: AP_3,
        category: 'Mind & Mental Health',
        why: 'Puts out fire-type enemies. Cooling anger, stress and overthinking: meditation, therapy, journaling.',
    },
    wind: {
        label: 'Wind', names: ['Aero', 'Aerora', 'Aeroga'], ap: AP_3,
        category: 'Social & Relationships',
        why: 'Reaches enemies out of range in the air. Reaching out: calls, messages, time with people.',
    },
    poison: {
        label: 'Poison', names: ['Bio', 'Biora', 'Bioga'], ap: AP_3,
        category: 'Learning & Skills',
        why: 'Damage that keeps ticking every second. Daily practice that compounds: languages, reading, courses.',
    },
    subversion: {
        label: 'Subversion', names: ['Breach', 'Dispel'], ap: AP_2,
        category: 'Admin & Dreaded Tasks',
        why: "Breaks barriers and strips buffs. The walls you've been avoiding: paperwork, taxes, calls, errands.",
    },
    healing: {
        label: 'Healing', names: ['Cure', 'Cura', 'Regen', 'Curaga'], ap: AP_4,
        category: 'Health, Sleep & Nutrition',
        why: 'Restores HP; Regen keeps healing over time. Sleep, water, food, medicine, check-ups.',
    },
    revival: {
        label: 'Revival', names: ['Raise', 'Arise'], ap: AP_2,
        category: 'Spirituality & Inner Life',
        why: 'Raises the fallen; Arise restores them completely. Prayer, gratitude, faith, purpose: renewing the spirit.',
    },
    barrier: {
        label: 'Barrier', names: ['Barrier', 'Manaward', 'Manawall'], ap: AP_3,
        category: 'Money & Savings',
        why: "Cuts the damage you take from every hit. Savings, budget and insurance soften life's blows.",
    },
    cleansing: {
        label: 'Cleansing', names: ['Poisona', 'Esuna', 'Resist'], ap: AP_3,
        category: 'Breaking Bad Habits',
        why: 'Cures status ailments; Resist makes you immune. Clearing junk food, doomscrolling, smoking.',
    },
    binding: {
        label: 'Binding', names: ['Sleep', 'Silence', 'Berserk'], ap: AP_3,
        category: 'Focus & Distraction Control',
        why: 'Puts enemies to sleep and silences their spells. Phone away, notifications off, single-tasking.',
    },
    time: {
        label: 'Time', names: ['Haste', 'Slow', 'Stop'], ap: AP_3,
        category: 'Planning & Routine',
        why: 'Controls the ATB gauge, who acts and when. Scheduling, weekly reviews, morning and night routines.',
    },
}

// Materia from older versions whose type no longer exists still need a fallback
const FALLBACK_TYPE = { label: 'Materia', names: null, ap: AP_3, category: '', why: '' }

export const materiaType = (key) => MATERIA_TYPES[key] || FALLBACK_TYPE
export const materiaMaxLevel = (key) => materiaType(key).ap.length

// XP multiplier by materia level (★1..★4)
export const MATERIA_MULTIPLIER = [1.1, 1.25, 1.5, 1.75]
export const MATERIA_MAX_LEVEL = 4 // the most levels any materia has (Healing)

// Jikanto's level colours: cyan → yellow → red → gold
export const MATERIA_LEVEL_COLORS = ['#00effb', '#ffd600', '#ff3d3d', '#ffb300']

// Decay: after GRACE idle days a materia loses AP each day, but never drops
// below the start of its current level (you never lose a level you earned).
export const MATERIA_DECAY_GRACE_DAYS = 3
export const MATERIA_DECAY_RATE = 0.02 // of the current level's AP span, per idle day
export const MATERIA_DECAY_MIN = 5 // AP per idle day, at least

// How many materia you can hold: starts at 3, +1 every LEVELS_PER_SLOT player levels.
export const BASE_MATERIA_SLOTS = 3
export const LEVELS_PER_SLOT = 3

// ---------- Quests (checkbox tasks) ----------
export const DEFAULT_QUEST_XP = 10
// A quest left unchecked when its day ends costs this share of its XP...
export const MISSED_QUEST_PENALTY = 0.5
// ...but never more than this per day, so one bad day can't wipe out a week.
export const MISSED_PENALTY_DAILY_CAP = 100

// ---------- Player level ----------
// XP needed to go from level L to L+1
export const xpForNextLevel = (level) => 100 + 50 * (level - 1)

// ---------- Streak ranks (Free Fire style) ----------
// A personal daily streak. Each day starts at yesterday's rank; tap the badge to
// count the day (+1), tap again to undo. `day` = streak length that reaches the rank.
// Bronze/Silver: 1 day per tier, Gold: 2 days, Platinum & Diamond: 3 days.
export const STREAK_RANKS = [
    { name: 'Bronze I', tier: 'bronze', level: 1, day: 1 },
    { name: 'Bronze II', tier: 'bronze', level: 2, day: 2 },
    { name: 'Bronze III', tier: 'bronze', level: 3, day: 3 },
    { name: 'Silver I', tier: 'silver', level: 1, day: 4 },
    { name: 'Silver II', tier: 'silver', level: 2, day: 5 },
    { name: 'Silver III', tier: 'silver', level: 3, day: 6 },
    { name: 'Gold I', tier: 'gold', level: 1, day: 7 },
    { name: 'Gold II', tier: 'gold', level: 2, day: 9 },
    { name: 'Gold III', tier: 'gold', level: 3, day: 11 },
    { name: 'Gold IV', tier: 'gold', level: 4, day: 13 },
    { name: 'Platinum I', tier: 'platinum', level: 1, day: 15 },
    { name: 'Platinum II', tier: 'platinum', level: 2, day: 18 },
    { name: 'Platinum III', tier: 'platinum', level: 3, day: 21 },
    { name: 'Platinum IV', tier: 'platinum', level: 4, day: 24 },
    { name: 'Diamond I', tier: 'diamond', level: 1, day: 27 },
    { name: 'Diamond II', tier: 'diamond', level: 2, day: 30 },
    { name: 'Diamond III', tier: 'diamond', level: 3, day: 33 },
    { name: 'Diamond IV', tier: 'diamond', level: 4, day: 36 },
    { name: 'Heroic', tier: 'heroic', level: 0, day: 39 },
]

export const STREAK_TIER_COLORS = {
    unranked: ['#9e9e9e', '#616161'],
    bronze: ['#e8a76c', '#8d5524'],
    silver: ['#f5f7fa', '#8e9aa6'],
    gold: ['#ffe680', '#c99700'],
    platinum: ['#b2fff6', '#2aa198'],
    diamond: ['#d6c8ff', '#6a4cff'],
    heroic: ['#ffb199', '#c2185b'],
}

// ---------- Badges (earned automatically from your data) ----------
export const BADGE_TYPES = {
    DEEP_WORK_2HR: { name: 'Deep Focus 2H', icon: '🎯', xpBoost: 50, description: '2+ hours of completed timed quests in a day' },
    DEEP_WORK_5HR: { name: 'Deep Focus 5H', icon: '🔥', xpBoost: 150, description: '5+ hours of completed timed quests in a day' },
    EARLY_BIRD: { name: 'Early Bird', icon: '🌅', xpBoost: 25, description: 'Complete a quest before 8 AM' },
    NIGHT_OWL: { name: 'Night Owl', icon: '🦉', xpBoost: 25, description: 'Complete a quest after 10 PM' },
    TASK_MASTER: { name: 'Task Master', icon: '✅', xpBoost: 60, description: 'Complete 10 quests in a day' },
    PERFECT_DAY: { name: 'Perfect Day', icon: '⭐', xpBoost: 200, description: 'Every habit done and all of the day\'s quests (3+) completed' },
    HABIT_STREAK_7: { name: '7-Day Streak', icon: '🔄', xpBoost: 100, description: 'Keep a habit going 7 days in a row' },
    PRODUCTIVITY_BEAST: { name: 'Productivity Beast', icon: '🚀', xpBoost: 150, description: 'Earn 200+ XP in a day (before badges)' },
    MATERIA_MASTER: { name: 'Materia Master', icon: '💠', xpBoost: 100, description: 'Master a materia (learn its last spell)' },
    EXERCISE_PRO: { name: 'Exercise Pro', icon: '💪', xpBoost: 40, description: '100+ base XP of Fire materia quests and habits in a day' },
    SCHOLAR: { name: 'Scholar', icon: '📚', xpBoost: 35, description: '1+ hour of completed timed quests with Poison materia' },
}

// ---------- Monthly medals: celestial objects, small to huge ----------
// Keys kept from older versions so saved data still lines up.
export const MEDAL_TIERS = {
    BRONZE: { name: 'Asteroid', icon: '🪨', threshold: 100, color: '#8d8d8d', description: '100+ XP in a month' },
    SILVER: { name: 'Moon', icon: '🌕', threshold: 500, color: '#cfd8dc', description: '500+ XP in a month' },
    GOLD: { name: 'Planet', icon: '🪐', threshold: 1000, color: '#f4a261', description: '1,000+ XP in a month' },
    PLATINUM: { name: 'Star', icon: '⭐', threshold: 2500, color: '#ffd54f', description: '2,500+ XP in a month' },
    DIAMOND: { name: 'Nebula', icon: '🌫️', threshold: 5000, color: '#ce93d8', description: '5,000+ XP in a month' },
    LEGEND: { name: 'Galaxy', icon: '🌌', threshold: 10000, color: '#7c4dff', description: '10,000+ XP in a month' },
}
export const MEDAL_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND']
