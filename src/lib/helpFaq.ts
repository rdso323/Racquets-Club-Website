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
        question: 'How do I reserve a spot on a court?',
        answer: 'Open the booking section, choose your sport tab, and pick an open play or clinic session. On court sessions, tap the + on a specific open spot on the court diagram, or use the Join button to take the first available spot on that court. You can only hold one court per session at a time.',
    },
    {
        question: 'What is weekly open play vs a one-time session?',
        answer: 'Weekly open play (for example Tennis Tuesday and Thursday) runs on a fixed schedule every week. One-time sessions are custom events admins create for a specific date. Open play cards show the recurring day (e.g. “Every Tuesday”) under the title.',
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
        answer: 'Open Menu → Your sports to show, hide, or drag to reorder sport tabs. At least one sport must stay visible. Your preferences are saved to your account.',
    },
    {
        question: 'What are clinics / coaching sessions?',
        answer: 'Clinics are coaching-style sessions with a flat capacity (no court diagram). Join with the session button. Coach slots may be claimed separately by admins on the public booking card.',
    },
    {
        question: 'How do I share feedback or report a problem?',
        answer: 'Use Feedback in the menu or footer to send a message to the club. For booking issues, include the sport, session date, and what you expected to happen.',
    },
    {
        question: 'I am an admin — where do I manage sessions?',
        answer: 'Use the Admin link in the top navigation bar (visible to approved admin accounts). The Operations Deck lets you manage the ticker, session visibility, rosters, events, and feedback.',
    },
];
