# Integrity

A continuous-scroll journal PWA with habits, XP, badges and medals.

- **Journal**: one ruled page per day, infinite scroll in both directions. Lines can be text, checkbox tasks, timed tasks or radio options.
- **Templates**: save a day's layout, set a default for new days.
- **Habits**: checkbox, number (with daily goal) or text, shown on every day.
- **XP**: earned from completed tasks, habits and badges. Monthly medals unlock at XP milestones.
- **Views**: calendar, timeline, grid, habit tracker and XP statistics.
- **Reminders** on any line (fire while the app is open).
- **Offline-first**: works without a connection and syncs when back online. Edits from other devices appear live.

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

Security rules (`firestore.rules`) only allow a signed-in user to read and write their own `users/{uid}` tree.

XP is **derived** from the data (checked task lines + stored habit XP + badges) instead of being kept in a separate ledger, so it can't drift out of sync.

Writes are debounced (1.5 s, max 10 s) and committed together with `writeBatch` (≤ 500 operations per batch). Pending edits are also kept in `localStorage` until Firestore confirms them, so closing the tab mid-save doesn't lose anything. A small pill at the bottom right shows *Saving… / Offline / Not saved*.

## Backup & import

Menu → **Backup & Import**:
- **Download backup**: everything as one JSON file.
- **Import from file**: a backup from this app. Uses batched writes.

## Known limitations

- Reminders only fire while the app is open, or when you open it within 12 h of the due time. Background push needs Firebase Cloud Messaging and a scheduled Cloud Function.
- Journal text is not end-to-end encrypted. It's protected by Firebase Auth and security rules.
