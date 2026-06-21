# Fuqua Racquets Club

Central hub for the Fuqua Racquets Club community — book courts, browse events, read club news, and manage operations as an admin.

**Production:** [fuquaracquetsclub.com](https://www.fuquaracquetsclub.com)

## Features

### Members (public home + booking)

- **Booking engine** — Open play and coaching clinics across **Tennis, Badminton, Squash, Pickleball, and Table Tennis**
- **Court diagrams** — Join specific spots when a session uses 2 or 4 players per court; switch courts within a session
- **Clinic layouts** — Coaching sessions use court diagrams when total capacity divides evenly into 2 or 4 per court; otherwise a roster list with Join Session
- **Session waitlist** — Shared queue per session with auto-promotion; **visible roster** (position, name, email) on each booking card when anyone is queued
- **Weekly recurring sessions** — Built-in open play and coaching clinic templates; cards show **Clinic/Open Play** and **Recurring/One-time** tags
- **Next-week lock** — Opens **Sunday 5:00 PM ET**; until then, next week's courts show a **center overlay** (schedule stays visible, booking disabled)
- **Club Wire ticker** — Live sports headlines from Firestore
- **Events & news** — Social events carousel and news feed (up to four articles)
- **Help** — Searchable FAQ at `/help` (jump to topics); signed-in admins also see an Operations guide section
- **Footer navigation** — Book a Court, Events, and News links work from any page (including Help)
- **Waitlist promotions** — Promoted members see a dismissible in-app banner when they return to booking
- **Account preferences** — Reorder or hide sport tabs via the menu; synced to Firestore
- **PWA** — Installable with offline shell support

### Admins (`/admin` and home page)

- **Operations Deck** — Ticker, live sessions (by sport), events, archive, feedback inbox
- **Home page session controls** — **Gear icon** (signed-in admins only) on each booking card: Edit details, Manage roster, Cancel this week / Restore this week (recurring), Remove schedule / Delete session
- **Sessions** — Create one-time or **weekly recurring** open play or **coaching clinics** (any weekday); calendar date + 12-hour AM/PM time pickers; edit type, courts, capacity, and time on live recurring schedules
- **Session limits** — Max **5 courts**, **20 roster spots**, and **10 waitlist spots** per session (enforced in admin forms and saves)
- **Roster tools** — Member search with manual name fallback; add/remove roster and waitlist; edits preserve existing rosters unless you lower capacity below enrollment (with a pick-who-to-remove prompt)
- **Events** — Create and edit club socials with calendar date and structured time pickers
- **Archive** — Past events and one-time sessions kept for **7 days**, then auto-deleted when an admin visits the site; weekly recurring sessions are not archived
- **Settings** — Edit ticker copy

### Auth

- **Duke-only** — `firstname.lastname@duke.edu` required (NetID-only aliases not supported); verified inbox required to book
- **Court display names** — Members show as **First L.** on court diagrams (parsed from email)
- **Admin access** — Email allowlist in [`AuthContext.tsx`](src/contexts/AuthContext.tsx) plus optional `VITE_ADMIN_EMAILS` env override

#### Adding a new admin (co-officers)

1. Add their `firstname.lastname@duke.edu` to `DEFAULT_ADMIN_EMAILS` in code (or `VITE_ADMIN_EMAILS` in Cloudflare).
2. They **sign up** at `/login` with that same address and choose a password.
3. They verify their Duke inbox — the **Admin** link appears automatically.

No pre-created Firebase accounts needed. **Forgot Password** on the login page handles resets.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS, Framer Motion, Lenis
- **Backend:** Firebase Auth + Firestore (client-only; no separate API server)
- **Deploy:** Cloudflare Workers + Assets via Wrangler (`dist/` SPA fallback)

## Getting started

### Prerequisites

- Node.js 18+
- npm
- A Firebase project with Auth (email/password) and Firestore

### Install & run

```bash
npm install
# Create .env with Firebase keys — see Environment variables below
npm run dev            # http://localhost:5173
```

### Environment variables

Create `.env` in the project root (see `src/lib/firebase.ts`):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=          # optional
VITE_ADMIN_EMAILS=officer@duke.edu     # optional, comma-separated
```

Placeholder Firebase values are enough to render the public home page in dev; live auth and Firestore need a real project.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Build + Wrangler local preview |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run lint` | ESLint (repo may have pre-existing warnings) |

## Project structure

```
src/
├── components/
│   ├── admin/          # Operations Deck modules, cards, modals, fields
│   ├── home/           # BookingEngine, WaitlistPanel, CourtDiagram, admin gear menu
│   └── system/         # TopBar, MenuOverlay, LiveWire ticker, Preloader
├── contexts/           # AuthContext, ThemeContext
├── hooks/              # useAdminData, useSessionAdminOps, useHomeSectionNavigation, useTickerText
├── lib/                # sessions, bookingActions, dates, archive, helpFaq, sports, recurringSchedules
└── pages/              # Home, Help (searchable FAQ), Login, AdminDashboard
```

Key Firestore collections: `sessions`, `events`, `news`, `feedback`, `users` (including `users/{uid}/notifications` for waitlist alerts), `settings` (ticker, recurringSchedules).

## Booking & admin behaviour (summary)

| Topic | Behaviour |
|-------|-------------|
| Clinic / open play capacity | Header uses **max attendees** set in admin (not courts × 4 alone) |
| Admin session limits | **5** courts max, **20** roster spots max, **10** waitlist spots max |
| Court diagrams | Shown when total capacity divides evenly across courts into **2 or 4** slots per court |
| Next-week lock | Overlay on the courts area only; opens **Sunday 5:00 PM ET** |
| Waitlist on cards | Listed with #, name, email whenever the queue is non-empty |
| Admin gear menu | Signed-in allowlisted admins only; same ops as Operations Deck session cards |
| Capacity edits | Apply instantly on the card after Save; rosters preserved unless cap is lowered |
| Help page | Search bar filters FAQ; clicking a result scrolls to and opens that answer |
| Recurring edit | Updates weekly schedule template + current Firestore instance |

Full member and admin FAQs live in **`src/lib/helpFaq.ts`** (rendered at `/help`).

## Keeping docs current

When shipping user-facing or admin behaviour changes, update:

- **`src/lib/helpFaq.ts`** — `MEMBER_HELP_FAQ` and `ADMIN_HELP_FAQ` (rendered at `/help`)
- **`README.md`** — features, env vars, deploy notes

## License

Built for the Fuqua Racquets Club. Internal use only.
