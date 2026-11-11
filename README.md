# Integrity

A continuous-scroll journal PWA with habits, XP, badges and medals.

- **Journal**: one ruled page per day, infinite scroll in both directions. Lines can be text, checkbox tasks, timed tasks or radio options.
- **Templates**: save a day's layout, set a default for new days.
- **Habits**: checkbox, number (with daily goal) or text, shown on every day.
- **XP**: earned from completed tasks, habits and badges. Monthly medals unlock at XP milestones.
- **Views**: calendar, timeline, grid, habit tracker and XP statistics.
- **Reminders** on any line (fire while the app is open).
- **Offline-first**: works without a connection and syncs when back online. Edits from other devices appear live.

## The game (inspired by FF7 Remake / jikanto)

- **Quests**: checkbox lines. Each has XP (default 10; tap the chip to change it) and an optional **catalyser materia**.
- **Materia**: the 12 magic materia from FF7 Remake. They're green like in the game, with the level shown as a coloured ring (cyan ★1, yellow ★2, red ★3, gold ★4, as in jikanto). Each is matched to an area of life by what it *does* in battle (categories can be renamed):

  | Materia | Spells by level | Area | Why |
  |---|---|---|---|
  | Fire | Fire → Fira → Firaga | Fitness & Training | the raw-damage workhorse; training builds your raw power |
  | Lightning | Thunder → Thundara → Thundaga | Career & Work | the answer to Shinra's machines |
  | Ice | Blizzard → Blizzara → Blizzaga | Mind & Mental Health | puts out fire-type enemies; cooling stress and anger |
  | Wind | Aero → Aerora → Aeroga | Social & Relationships | reaches enemies out of range; reaching out to people |
  | Poison | Bio → Biora → Bioga | Learning & Skills | damage that keeps ticking; daily practice that compounds |
  | Subversion | Breach → Dispel | Admin & Dreaded Tasks | breaks barriers; the walls you've been avoiding |
  | Healing | Cure → Cura → Regen → Curaga | Health, Sleep & Nutrition | restores HP, Regen keeps healing over time |
  | Revival | Raise → Arise | Spirituality & Inner Life | raises the fallen, Arise restores them fully |
  | Barrier | Barrier → Manaward → Manawall | Money & Savings | reduces damage from every hit |
  | Cleansing | Poisona → Esuna → Resist | Breaking Bad Habits | cures ailments, Resist = immunity |
  | Binding | Sleep → Silence → Berserk | Focus & Distraction Control | sleeps and silences enemies |
  | Time | Haste → Slow → Stop | Planning & Routine | controls the ATB gauge, who acts and when |

  - Quests and habits tagged with a materia earn **XP × its multiplier** and give it **AP** (= base XP).
  - Levels follow the game: ★2 at 300 AP, ★3 at 900 AP (Healing: 300 / 750 / 1200). The last spell = mastered. Boost: ★1 ×1.1, ★2 ×1.25, ★3 ×1.5, ★4 ×1.75. A new level's boost starts the next day.
  - **Decay**: after 3 idle days a materia loses a little AP per day, but never drops below its current level.
- **Missed quests**: a quest still unchecked when its day ends costs 50% of its XP (max 100 XP/day). Ticking it later gives the XP back.
- **Level**: total XP gives your level. Every 3 levels unlock another materia slot (3 to start).
- **Streak ranks** (Free Fire style): a personal daily streak shown as a badge on each day. A day starts at yesterday's rank; tap the badge to count the day (+1), tap again to undo. Reset from the day's ⋯ menu (undoable).
  Bronze I–III (days 1–3) → Silver I–III (4–6) → Gold I–IV (7, 9, 11, 13) → Platinum I–IV (15, 18, 21, 24) → Diamond I–IV (27, 30, 33, 36) → Heroic (39). Thresholds are in `STREAK_RANKS` in `src/game/config.js`.
- **Badges** are earned automatically from your data (and taken back if you undo what earned them): Deep Focus 2H/5H (timed quests), Early Bird, Night Owl, Task Master (10 quests), Perfect Day (all habits and 3+ quests), 7-Day habit streak, Productivity Beast (200+ XP), Materia Master, Exercise Pro (Fire materia), Scholar (Poison materia, 1h+). You can also add custom badges.
- **Monthly medals**: celestial objects, small to huge, by XP that month: 🪨 Asteroid 100 → 🌕 Moon 500 → 🪐 Planet 1,000 → ⭐ Star 2,500 → 🌫️ Nebula 5,000 → 🌌 Galaxy 10,000.
- Everything (level, streak, materia, medals, badges, graph) is on the **XP & Statistics** screen.

All of this is computed from your data (`src/game/engine.js`), and every number is in `src/game/config.js`. Penalties and decay only count from the day the game started (`users/{uid}/meta/game`).

## Stack

React 19 · Vite · Tailwind · vite-plugin-pwa · Firebase Auth · Cloud Firestore · Firebase Hosting

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Firebase web app config
npm run dev
```

In the [Firebase console](https://console.firebase.google.com/) for project `integrity-jx`:

1. **Build → Authentication → Sign-in method**: enable **Email/Password**.
2. **Build → Firestore Database**: create a database (production mode, a region near you, e.g. `asia-south1`).
3. **Project settings → Your apps**: add a Web app (if there isn't one) and copy its config into `.env`.
4. Deploy the security rules: `npx firebase deploy --only firestore:rules`.

### Local emulators (optional)

```bash
npm run emulators            # needs Java; Auth on :9099, Firestore on :8080
VITE_USE_EMULATORS=true npm run dev
```

## Deploy

```bash
npx firebase login
npm run deploy               # builds, deploys hosting + Firestore rules
```

## Data model

Every user's data lives under `users/{uid}/…`, one small document per item:

| Collection | Doc id | Contents |
|---|---|---|
| `days` | `YYYY-MM-DD` (local date) | `lines[]`, `habits{habitId: value}`, `habitXP{habitId: xp}` |
| `habits` | id | name, type, icon, colour, goal, xp, order, visible |
| `templates` | id | name, isDefault, `lines[]` |
| `badges` | id | type, name, icon, xpBoost, date |
| `medals` | id | tier, name, icon, threshold, year, month, revoked |
| `reminders` | id | lineId, dayId, datetime (ISO), recurring, enabled |
| `materia` | id | type, customName, category, createdAt |
| `meta` | `game` | startedAt |

Security rules (`firestore.rules`) only allow a signed-in user to read and write their own `users/{uid}` tree.

XP, materia AP/levels and penalties are **derived** from the data (quest lines, stored habit XP, badges) instead of being kept in a separate ledger, so it can't drift out of sync.

Writes are debounced (1.5 s, max 10 s) and committed together with `writeBatch` (≤ 500 operations per batch). Pending edits are also kept in `localStorage` until Firestore confirms them, so closing the tab mid-save doesn't lose anything. A small pill at the bottom right shows *Saving… / Offline / Not saved*.

## Backup & import

Menu → **Backup & Import**:
- **Download backup**: everything as one JSON file.
- **Import from file**: a backup from this app. Uses batched writes.

## Known limitations

- Reminders only fire while the app is open, or when you open it within 12 h of the due time. Background push needs Firebase Cloud Messaging and a scheduled Cloud Function.
- Journal text is not end-to-end encrypted. It's protected by Firebase Auth and security rules.
