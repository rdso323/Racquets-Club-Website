# Fuqua Racquets Club

Central hub for the Fuqua Racquets Club community — book courts, browse events, read club news, and manage operations as an admin.

**Production:** [fuquaracquetsclub.com](https://www.fuquaracquetsclub.com)

## Features

### Members (public home + booking)

- **Booking engine** — Open play and coaching clinics across **Tennis, Badminton, Squash, Pickleball, and Table Tennis**
- **Court diagrams** — Join specific spots on a court; switch courts within a session; shared session waitlist with auto-promotion
- **Weekly open play** — Built-in recurring schedules (e.g. Tennis Tue/Thu); next week unlocks **Sunday 5:00 PM ET**
- **Club Wire ticker** — Live sports headlines from Firestore
- **Events & news** — Social events carousel and news feed (up to four articles)
- **Help** — Static FAQ at `/help` (booking, waitlists, sport tabs, admin pointers)
- **Account preferences** — Reorder or hide sport tabs via the menu; synced to Firestore
- **PWA** — Installable with offline shell support

### Admins (`/admin`)

- **Operations Deck** — Ticker, session visibility, live sessions, events, feedback inbox
- **Sessions** — Create one-time or **weekly recurring** court bookings (any weekday); manage rosters and waitlists with **member search** (manual names still allowed)
- **Events** — Create and edit club socials
- **Settings** — Edit ticker copy and per-sport session status (active / hidden / cancelled)

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
VITE_ADMIN_EMAILS=admin@duke.edu       # optional, comma-separated
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
│   ├── admin/          # Operations Deck modules, cards, modals
│   ├── home/           # BookingEngine, Transmissions, Footer, CourtDiagram
│   └── system/         # TopBar, MenuOverlay, LiveWire ticker, Preloader
├── contexts/           # AuthContext, ThemeContext
├── hooks/              # useAdminData, useMemberDirectory, useTickerText
├── lib/                # sessions, bookingActions, memberNames, sports, helpFaq
└── pages/              # Home, Help, Login, AdminDashboard
```

Key Firestore collections: `sessions`, `events`, `news`, `feedback`, `users`, `settings` (ticker, sessionStatus, recurringSchedules).

## Keeping docs current

When shipping user-facing or admin behaviour changes, update:

- **`src/lib/helpFaq.ts`** — member FAQ copy (rendered at `/help`)
- **`README.md`** — features, env vars, deploy notes

## License

Built for the Fuqua Racquets Club. Internal use only.
