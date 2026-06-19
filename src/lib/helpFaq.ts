export interface FaqItem {
    question: string;
    answer: string;
}

export const HELP_FAQ: FaqItem[] = [
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
        answer: 'Scroll past the booking section or use the menu: Events (03) shows socials and mixers; News (04) shows up to four headline articles. The Club Wire ticker above booking carries live sports updates.',
    },
    {
        question: 'How do I share feedback or report a problem?',
        answer: 'Use Feedback in the menu (06) or footer to send a message to the club. For booking issues, include the sport, session date, and what you expected to happen.',
    },
    {
        question: 'I am an admin — where do I manage sessions?',
        answer: 'Use Admin in the top bar (approved accounts only). New officers: create your account at Sign In with your firstname.lastname@duke.edu — admin access is granted automatically for approved emails after you verify your inbox. The Operations Deck has tabs for Ticker & Settings, Quarts & Sessions, Events, and Feedback.',
    },
    {
        question: 'I am an admin — how do co-officers get access?',
        answer: 'Ask an existing admin to add your firstname.lastname@duke.edu to the admin allowlist, then sign up on the login page with that same address and verify your email. Choose your own password during signup; use Forgot Password if you need to reset it later.',
    },
];
