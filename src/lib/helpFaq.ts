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
        answer: 'Open Book a Court from the menu (or scroll to the booking section), choose your sport tab, and pick an open play or clinic session. When a session uses court diagrams, tap + on an open spot or use Join to take the first available spot on that court. You can only hold one court per session at a time. Some clinics use a simple roster list instead of diagrams when capacity does not split evenly into 2 or 4 players per court.',
    },
    {
        question: 'What is weekly open play vs a one-time session?',
        answer: 'Weekly sessions run on a fixed day every week (for example Tennis Open Play Tuesday and Thursday, or a Friday coaching clinic). One-time sessions are custom events admins create for a specific date. Cards show tags for type (Open Play or Clinic) and schedule (Recurring or One-time), plus the weekday when applicable (e.g. “Every Tuesday”). After a session ends, its roster and waitlist reset for the next week.',
    },
    {
        question: 'When can I book next week’s sessions?',
        answer: "Next week opens for booking Sunday at 5:00 PM Eastern. Until then, you can see next week's schedule on the card, but a lock overlay appears over the courts area and you cannot join yet. This applies to both open play and recurring coaching clinics.",
    },
    {
        question: 'How does the waitlist work?',
        answer: 'When a session is full, you can join a single shared waitlist for that session (not per court). If someone drops out, the next person on the waitlist is automatically added to the freed spot. You cannot be on the waitlist and on a court at the same time. When anyone is queued, the booking card shows a Session Waitlist section with each person’s position, name, and email.',
    },
    {
        question: 'What happens when I am promoted from the waitlist?',
        answer: 'When a spot opens and you are next on the waitlist, you are automatically moved onto the court (or session roster). The next time you visit the booking section, a banner confirms your promotion — refresh the page if needed to see your assignment. Email notifications may be added later.',
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
        answer: 'Clinics and open play sessions share the same booking cards. Admins set a total capacity (up to 20 roster spots). When that capacity divides evenly across courts into 2 or 4 players per court, you will see court diagrams. Otherwise the card shows a roster list with a Join Session button. Clinics appear below open play when both are scheduled for the same sport. Coach slots may be claimed separately by admins on the public booking card.',
    },
    {
        question: 'Where are club events and news?',
        answer: 'Scroll past the booking section or use the menu: Events (03) shows upcoming socials and mixers only — past events disappear after their date. News (04) shows up to four headline articles. The Club Wire ticker above booking carries live sports updates. From the Help page footer, Book a Court, Events, and News take you back to the home page and scroll to the right section.',
    },
    {
        question: 'How do I find answers on the Help page?',
        answer: 'Use the search bar at the top of /help. Type keywords such as waitlist, courts, sign in, or clinic — matching FAQ entries appear as you type. Tap a result to jump to that question and open it automatically.',
    },
    {
        question: 'How do I share feedback or report a problem?',
        answer: 'Use Feedback in the menu (06) or footer to send a message to the club. For booking issues, include the sport, session date, and what you expected to happen.',
    },
    {
        question: 'I am a club officer — where is the admin guide?',
        answer: 'Sign in with an approved @duke.edu account and scroll to the Operations guide at the bottom of this page (visible to admins only). You can also open Admin in the top bar for the full Operations Deck, or use the gear icon on any booking card on the home page for quick session edits.',
    },
];

/** Admin-only operations guide — shown on /help when isAdmin is true */
export const ADMIN_HELP_FAQ: FaqItem[] = [
    {
        question: 'What is the Operations Deck?',
        answer: 'The admin dashboard at /admin has tabs for Ticker & Settings, Courts & Sessions, Events Manager, Archive, and Feedback Inbox. Only allowlisted @duke.edu emails see the Admin link and can access this area. You can also manage many session tasks directly from the home page booking cards (see below).',
    },
    {
        question: 'How do I manage sessions from the home page?',
        answer: 'When signed in as an allowlisted admin, tap the gear icon in the top-right corner of any booking card. Choose Edit details (capacity, courts, time, coach, type), Manage roster (add or remove players, waitlist, assign coach), or Delete / remove weekly schedule. Regular members and guests do not see the gear icon. This mirrors the Operations Deck session controls without leaving the booking page.',
    },
    {
        question: 'How do I create events and sessions?',
        answer: 'In the Operations Deck → Courts & Sessions, use calendar date pickers and 12-hour AM/PM time pickers — no free-text dates or times. Choose one-time or weekly recurring, Open Play or Clinic, configure courts (up to 5), max capacity (up to 20 roster spots), and waitlist size (up to 10, or 0 to disable). Events are created under Events Manager with the same date/time pickers.',
    },
    {
        question: 'What are the maximum session size limits?',
        answer: 'Each session is capped at 5 courts, 20 total roster spots (max attendees), and 10 waitlist spots. Admin forms enforce these limits so oversized values cannot be saved. If you lower capacity below the number already enrolled, you must choose who to remove or cancel the save — existing rosters are otherwise preserved when you edit courts or capacity.',
    },
    {
        question: 'How does clinic capacity and court layout work?',
        answer: 'Set Max Capacity to the total roster size (e.g. 6 or 8; maximum 20). Court diagrams on the public site only appear when that total divides evenly across all configured courts (up to 5) into exactly 2 or 4 slots per court (e.g. 8 players on 2 courts = 4 each). Otherwise members see a roster list. The header always shows enrolled count vs your max capacity. Capacity and layout updates apply instantly on the booking card after you save — no page refresh needed. Editing courts or capacity does not remove existing players or waitlist entries unless the new cap is below current enrollment, in which case you choose who to remove or cancel the save.',
    },
    {
        question: 'Can I edit recurring sessions after they are live?',
        answer: 'Yes. Edit details on a recurring open play or coaching clinic updates the weekly schedule template (courts, time, capacity, coach, session type). Changes apply to future weeks. You can switch between Open Play and Clinic, adjust court count and labels, and edit time without disabling the schedule.',
    },
    {
        question: 'What happens to past events?',
        answer: 'Past events leave the home carousel and main Events tab immediately. They appear in the Archive tab for 7 days, then are auto-deleted from Firestore when an admin visits the site.',
    },
    {
        question: 'What happens to past one-time sessions?',
        answer: 'One-time clinics and custom court bookings follow the same 7-day archive rule. Weekly recurring open play and coaching clinics roll forward each week and are never archived.',
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
        question: 'How are waitlists managed?',
        answer: 'Add members to the waitlist from Manage roster on a booking card or in the Operations Deck. The booking card shows a visible waitlist roster (position, name, email) whenever anyone is queued — even if spots are still open on the courts. When someone drops or you remove them, the next waitlisted member is promoted automatically. Promoted members see an in-app banner on their next visit; admins see a confirmation when a removal triggers promotion.',
    },
];

/** @deprecated Use MEMBER_HELP_FAQ — kept for any legacy imports */
export const HELP_FAQ = MEMBER_HELP_FAQ;
