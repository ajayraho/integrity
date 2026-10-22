# Integrity: Bug Audit & Fix Status

Audit: 22 Oct 2026 (48 items). Fixed on branch `firestore-bugfix`.
Legend: ✅ fixed · 📝 documented limitation / design choice

## P0: Data loss
| # | Issue | Status |
|---|---|---|
| 1 | Opening the journal replaced all saved entries with the loaded days | ✅ JournalView only holds day ids; each day is its own Firestore doc, saved individually |
| 2 | Whole-blob last-write-wins across devices | ✅ One doc per day/habit/template/…; live `onSnapshot` sync between devices |
| 3 | Debounced save lost on close / silent failure | ✅ localStorage write-ahead log, flush on `pagehide`/hidden, retry, "Saving / Offline / Not saved" pill, Firestore offline cache |

## P1: Security
| # | Issue | Status |
|---|---|---|
| 4 | Plain-text password in localStorage | ✅ Firebase Auth (no password stored by the app) |
| 5 | `.env` committed (public repo) | ✅ untracked + gitignored, `.env.example` added. ⚠️ Old values are still in git history: delete the Supabase project |
| 6 | Client-side-only auth, anon key could read/overwrite any user | ✅ Firebase Auth + `firestore.rules` (users can only touch `users/{their uid}`) |
| 7 | Weak crypto-js key derivation | ✅ removed. E2E encryption is a later step (📝) |

## P2: Journal lines
| # | Issue | Status |
|---|---|---|
| 8 | Typing in a checked task unchecked it / double XP | ✅ line edits are partial patches; XP derived from line state |
| 9 | Checkbox+Time times not saved | ✅ `timeStart`/`timeEnd` stored |
| 10 | Radio state not saved | ✅ `selected` stored; adjacent radio lines form a group |
| 11 | Deleting/replacing completed lines left orphan XP | ✅ XP is derived, so it can't orphan; loss toast shown |
| 12 | Duplicate line ids from `Date.now()` | ✅ `crypto.randomUUID()` |
| 13 | Type change remounted line / lost focus | ✅ key = id, refocus after change |
| 14 | Arrow up/down wrong on wrapped text | ✅ caret offset measured by range |
| 15 | Placeholder didn't render | ✅ CSS `:empty:focus::before` |

## P2: Templates
| # | Issue | Status |
|---|---|---|
| 16 | Template editor: typing changed all lines | ✅ every template line gets an id |
| 17 | Checking a box in the template editor added real XP | ✅ checkboxes disabled in template mode |
| 18 | "Clear Today's Template" confirm never fired | ✅ dialog state lifted out of the auto-closing menu ("Clear this page") |
| 19 | Hidden `__EMPTY_DEFAULT__` templates piled up | ✅ "Clear default" just unsets `isDefault`; legacy hidden ones skipped on import |
| 20 | Template id collisions | ✅ UUIDs |

## P2: Habits
| # | Issue | Status |
|---|---|---|
| 21 | New/edited/reordered habits not shown until reload | ✅ live store (`useSyncExternalStore`) |
| 22 | Reset All kept XP | ✅ habit XP stored per day and cleared on reset |
| 23 | New habits had no `order` | ✅ appended at the end |
| 24 | Reorder drag doesn't work on touch | ✅ ▲▼ buttons added (drag still works on desktop) |
| 25 | Deleted habit's XP still counted | 📝 history kept on purpose: past days keep their recorded value/XP |
| 26 | "View Statistics" did nothing | ✅ removed (Habit Tracker is in the menu) |

## P2: Views & dates
| # | Issue | Status |
|---|---|---|
| 27 | Views hard-coded today = 8 Feb 2026 | ✅ real date (and midnight rollover in the journal) |
| 28 | UTC day ids → off by one in IST | ✅ `utils/date.js` local-date helpers everywhere |
| 29 | Calendar habits without names | ✅ icon + name shown; days clickable → open in journal (calendar/grid/timeline) |

## P2: XP / badges / medals
| # | Issue | Status |
|---|---|---|
| 30 | Deleted medal re-awarded immediately | ✅ auto medals are marked `revoked` instead |
| 31 | Medals only awarded when opening XP view; no animation | ✅ checked after every XP gain, with unlock animation |
| 32 | Month navigation skipped months on 29–31 | ✅ clamped `addMonths` |
| 33 | Garbled toasts ("You gained +Badge deleted…") | ✅ proper info/error toasts |
| 34 | Only 2 badges auto-awarded | 📝 unchanged (others are manual). Candidate for the jikanto-style rework |
| 35 | Custom badges never shown | ✅ "Badges on <day>" row in XP view |
| 36 | Day header badges stale | ✅ live; header also shows the day's XP |
| 37 | Blurry canvas graph | ✅ devicePixelRatio scaling |
| — | (found while fixing) edit-dot on badge/medal cards picked a badge from any date | ✅ uses selected day / month |
| — | (found while fixing) medal popup showed the year twice | ✅ |

## P2: Reminders
| # | Issue | Status |
|---|---|---|
| 38 | Reminders never fired after reload | ✅ scheduler reads reminders from the store |
| 39 | Time shifted +5:30 | ✅ local `datetime-local` handling |
| 40 | No real background notifications | 📝 fires while app is open (+12 h catch-up). Push needs FCM + Cloud Function |
| 41 | `setInterval` leak per login | ✅ scheduler returns a stop function |
| 42 | `cancelReminder` no-op | ✅ no timers to cancel any more; deleted reminders simply aren't checked |

## App shell
| # | Issue | Status |
|---|---|---|
| 43 | Toasts overlapped / timers reset | ✅ `ToastStack` |
| 44 | `localStorage.clear()` on load failure | ✅ error screen with Retry / Logout |
| 45 | No offline data | ✅ Firestore persistent cache + WAL |
| 46 | index.html title/meta | ✅ |
| 47 | README outdated | ✅ rewritten |
| 48 | Dead code, generated files, CRLF churn | ✅ removed `storageOld`/`dev-dist`/`.firebase`; `.gitattributes` (LF) |

## New
- Firestore data layer with batched writes (≤500 ops per batch), debounced 1.5 s (max 10 s).
- Backup & Import (JSON).
- Login with email/password + "Forgot password".

## Testing done
Lint + production build clean. Browser tests (Chromium, timezone Asia/Kolkata, desktop and phone sizes) against an in-memory Firestore/Auth stand-in. The real Firebase emulator couldn't be downloaded in the sandbox. Covered:
- History survives reload; typing a whole session = 1 batched write.
- Checked task stays checked while editing.
- Habit XP and reset; time/radio persistence.
- Template editor; clear page; default template on new days.
- Remote edits; offline WAL replay; reminder local time.
- Calendar date; legacy import; medal revoke; open day from timeline; logout/login.
