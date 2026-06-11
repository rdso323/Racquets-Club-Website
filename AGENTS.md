# AGENTS.md

## Cursor Cloud specific instructions

This is a single-service frontend app: **Fuqua Racquets Club**, built with React 19 + TypeScript + Vite, styled with Tailwind, backed by Firebase (Auth + Firestore). Package manager is **npm** (`package-lock.json`). There is no backend service in this repo and no automated test suite.

Standard commands live in `package.json` scripts; use them directly:
- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173`).
- Lint: `npm run lint` (`eslint .`). Note: the repo currently has pre-existing lint errors; a non-zero exit from lint does not mean your environment is broken.
- Build: `npm run build` (`tsc -b && vite build`). Output goes to `dist/`.
- Preview production build: `npm run preview`.

Non-obvious notes:
- **Firebase env vars are required for the app to initialize.** Create a local `.env` (gitignored) with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and optional `VITE_FIREBASE_MEASUREMENT_ID` (see `src/lib/firebase.ts` and the README). Without a `.env`, Vite injects `undefined` for these values. Placeholder values are enough for the public home page to render in dev — only live Auth/Firestore calls need a real Firebase project.
- **The home page (`/`) is public** and renders without authentication, so it is the simplest thing to smoke-test. Only `/admin` is gated behind login.
- **Auth is restricted to `@duke.edu` accounts with email verification** (see `src/contexts/AuthContext.tsx`); admin access is limited to a hardcoded allowlist of emails. Sign-in / Firestore reads/writes require a real Firebase project and a verified Duke account, so end-to-end auth/booking flows are not testable without real credentials.
- Firestore-backed sections (e.g. the Booking Engine session lists) will show empty / "No upcoming sessions" states when pointed at a project without data or with placeholder config; this is expected, not a crash.
