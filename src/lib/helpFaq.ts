export interface FaqItem {
    question: string;
    answer: string;
}

/** Member-facing FAQ — always shown on /help */
export const MEMBER_HELP_FAQ: FaqItem[] = [
    {
        question: 'Who can sign up and book courts?',
        answer: 'Booking is for verified Duke members. Sign up with your firstname.lastname@duke.edu address (not your NetID alias), verify your inbox, then sign in. The home page shows availability, but you must be signed in to join a session or court.',
    },
    {
        question: 'Which email should I use to sign in?',
        answer: 'Sign in with whichever @duke.edu address you used when you registered (including older accounts). For new sign-ups, use firstname.lastname@duke.edu — not NetID-only aliases like rjd51@duke.edu, which create a duplicate account.',
    },
    {
        question: 'Which sports can I book?',
        answer: 'The club supports Tennis, Badminton, Squash, Pickleball, and Table Tennis. Use the sport tabs in the booking section (02 — Matchmaker) to switch between them. Hide or reorder tabs from Menu → Your sports.',
    },
    {
        question: 'How do I reserve a spot on a court?',
        answer: 'Open Book a Court from the menu (or scroll to the booking section), choose your sport tab, and pick an open play or clinic session. On court sessions, tap + on an open spot in the court diagram, or use Join to take the first available spot on that court. You can only hold one court per session at a time.',
    },
    {
        question: 'What is weekly open play vs a one-time session?',
        answer: 'Weekly open play runs on a fixed day every week (for example Tennis Open Play Tuesday and Thursday). One-time sessions are custom events admins create for a specific date. Recurring cards show the day under the title (e.g. “Every Tuesday”). After a session ends, its roster and waitlist reset for the next week.',
    },
    {
        question: 'When can I book next week’s sessions?',
        answer: "Next week opens for booking Sunday at 5:00 PM Eastern. Until then, next week's cards show a locked overlay on the courts so you can see the schedule but cannot join yet.",
    },
    {
        question: 'How does the waitlist work?',
        answer: 'When every court in a session is full, you can join a single shared waitlist for that session (not per court). If someone drops out, the next person on the waitlist is automatically added to the freed spot. You cannot be on the waitlist and on a court at the same time.',
    },
    {
        question: 'What happens when I am promoted from the waitlist?',
        answer: 'When a spot opens and you are next on the waitlist, you are automatically moved onto the court. The next time you visit the booking section, a banner confirms your promotion — refresh the page if needed to see your court assignment. Email notifications may be added later.',
    },
    {
        question: 'Can I switch courts after joining?',
        answer: 'Yes. If you are already on a court, tap Join on another court with an open spot to switch. Use Drop on your current court to leave entirely; that may promote someone from the waitlist.',
    },
    {
        question: 'Why do I only see some sports in the booking tabs?',
        answer: 'Open Menu → Your sports to show, hide, or drag to reorder sport tabs. At least one sport must stay visible. Your preferences are saved to your account and sync across devices.',
    },
    {
        question: 'What are clinics / coaching sessions?',
        answer: 'Clinics are coaching-style sessions with a flat capacity (no court diagram). Join with the session button. They appear below open play when both are scheduled for the same sport. Coach slots may be claimed separately by admins on the public booking card.',
    },
    {
        question: 'Where are club events and news?',
        answer: 'Scroll past the booking section or use the menu: Events (03) shows upcoming socials and mixers only — past events disappear after their date. News (04) shows up to four headline articles. The Club Wire ticker above booking carries live sports updates.',
    },
    {
        question: 'How do I share feedback or report a problem?',
        answer: 'Use Feedback in the menu (06) or footer to send a message to the club. For booking issues, include the sport, session date, and what you expected to happen.',
    },
    {
        question: 'I am a club officer — where is the admin guide?',
        answer: 'Sign in with an approved @duke.edu account and scroll to the Operations guide at the bottom of this page (visible to admins only). You can also open Admin in the top bar to reach the Operations Deck.',
    },
];

/** Admin-only operations guide — shown on /help when isAdmin is true */
export const ADMIN_HELP_FAQ: FaqItem[] = [
    {
        question: 'What is the Operations Deck?',
        answer: 'The admin dashboard at /admin has tabs for Ticker & Settings, Courts & Sessions, Events Manager, Archive, and Feedback Inbox. Only allowlisted @duke.edu emails see the Admin link and can access this area.',
    },
    {
        question: 'How do I create events and sessions?',
        answer: 'Use calendar date pickers and 12-hour AM/PM time pickers in the admin forms — no free-text dates or times. Events need a date, start time, and optional end time. One-time sessions store the date as weekStartDate; recurring open play uses a weekday template instead.',
    },
    {
        question: 'What happens to past events?',
        answer: 'Past events leave the home carousel and main Events tab immediately. They appear in the Archive tab for 7 days, then are auto-deleted from Firestore when an admin visits the site.',
    },
    {
        question: 'What happens to past one-time sessions?',
        answer: 'One-time clinics and custom court bookings follow the same 7-day archive rule. Weekly recurring open play rolls forward each week and is never archived.',
    },
    {
        question: 'What is the Archive tab for?',
        answer: 'Archive shows recently ended events and archivable sessions before auto-deletion. You can delete items early if needed. Badge counts on the sidebar reflect total archived items.',
    },
    {
        question: 'How do co-officers get admin access?',
        answer: 'Add their firstname.lastname@duke.edu to the admin allowlist in code (or VITE_ADMIN_EMAILS), then have them sign up at /login with that address and verify their inbox. The Admin link appears automatically.',
    },
    {
        question: 'How are waitlist promotions handled?',
        answer: 'When someone drops a court or an admin removes them, the next waitlisted member is promoted automatically. The promoted member sees an in-app banner on their next visit to the booking section. Admins also see a confirmation alert when removing someone triggers a promotion.',
    },
];

/** @deprecated Use MEMBER_HELP_FAQ — kept for any legacy imports */
export const HELP_FAQ = MEMBER_HELP_FAQ;
