export const ADMINS_SETTINGS_COLLECTION = 'settings';
export const ADMINS_SETTINGS_DOC_ID = 'admins';

const CLUB_ADMIN_EMAIL = `${['fuqua', 'racquets'].join('-')}@duke.edu`;

/** Starting list, and the list used when the saved document is missing or empty. */
const CODE_ADMIN_EMAILS = [
    'altamash.memon@duke.edu',
    'armin.thomas@duke.edu',
    'hirsh.sinaihede@duke.edu',
    'joe.chantajunlasin@duke.edu',
    'kathryne.piazza@duke.edu',
    'laura.wang@duke.edu',
    'maddie.latimore@duke.edu',
    'naitik.reshamwala@duke.edu',
    'rohan.dsouza@duke.edu',
    'rohand97@gmail.com',
    CLUB_ADMIN_EMAIL,
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeAdminEmail = (value: string): string | null => {
    const email = value.trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
    return email;
};

const uniqueEmails = (emails: string[]): string[] => [...new Set(emails)];

/** Built-in officers plus any VITE_ADMIN_EMAILS extras. Used only as a seed and a safety net. */
export const builtinAdminEmails = (): string[] => {
    const fromEnv = import.meta.env?.VITE_ADMIN_EMAILS as string | undefined;
    const extras = fromEnv
        ? fromEnv
              .split(',')
              .map((email) => normalizeAdminEmail(email))
              .filter((email): email is string => !!email)
        : [];
    return uniqueEmails([...CODE_ADMIN_EMAILS.map((email) => email.toLowerCase()), ...extras]);
};

/** Emails actually stored on the document. Null when missing, empty, or unusable. */
export const storedAdminEmails = (data: { emails?: unknown } | null | undefined): string[] | null => {
    if (!data || !Array.isArray(data.emails)) return null;
    const emails = data.emails
        .filter((email): email is string => typeof email === 'string')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_PATTERN.test(email));
    const unique = uniqueEmails(emails);
    return unique.length > 0 ? unique : null;
};

/** Saved list when it has at least one address; otherwise the built-in list. */
export const resolveAdminEmails = (data: { emails?: unknown } | null | undefined): string[] =>
    storedAdminEmails(data) ?? builtinAdminEmails();

export const addAdminEmail = (current: string[], value: string): { emails: string[]; error?: string } => {
    const email = normalizeAdminEmail(value);
    if (!email) return { emails: current, error: 'Enter a valid email address.' };
    if (current.includes(email)) return { emails: current, error: 'That address is already an admin.' };
    return { emails: [...current, email] };
};

/** Null when the remove would leave nobody who can open the admin page. */
export const removeAdminEmail = (current: string[], email: string): string[] | null => {
    const target = email.trim().toLowerCase();
    if (!current.includes(target)) return current;
    if (current.length <= 1) return null;
    return current.filter((item) => item !== target);
};
