export interface FaqItem {
    question: string;
    answer: string;
}

export const HELP_FAQ: FaqItem[] = [
    {
        question: 'Who can sign up and book courts?',
        answer: 'Booking is for verified Duke members. You need a @duke.edu email address and must verify your inbox before signing in. The home page shows availability, but you must be signed in to join a session or court.',
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
        answer: "Next week's sessions open for booking on Sunday at 5:00 PM (Eastern). Until then, next week's cards appear locked in the booking section.",
    },
    {
        question: 'How does the waitlist work?',
        answer: 'When every court in a session is full, you can join a single shared waitlist for that session (not per court). If someone drops out, the next person on the waitlist is automatically added to the freed spot. You cannot be on the waitlist and on a court at the same time.',
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
        answer: 'Clinics are coaching-style sessions with a flat capacity (no court diagram). Join with the session button. On larger screens, clinics appear beside open play when both are scheduled for the same sport. Coach slots may be claimed separately by admins on the public booking card.',
    },
    {
        question: 'Where are club events and news?',
        answer: 'Scroll past the booking section or use the menu: Events (03) shows socials and mixers; News (04) shows up to four headline articles. The Club Wire ticker above booking carries live sports updates.',
    },
    {
        question: 'How do I share feedback or report a problem?',
        answer: 'Use Feedback in the menu (06) or footer to send a message to the club. For booking issues, include the sport, session date, and what you expected to happen.',
    },
    {
        question: 'I am an admin — where do I manage sessions?',
        answer: 'Use Admin in the top bar (approved accounts only). The Operations Deck has tabs for Ticker & Settings, Quarts & Sessions, Events, and Feedback. In Sessions you can create one-time or weekly recurring bookings (any weekday), search members when adding roster or waitlist entries, edit capacities, and remove a weekly schedule entirely with “Remove weekly schedule”.',
    },
];
