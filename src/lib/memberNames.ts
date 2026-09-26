/** Duke email must use firstname.lastname@duke.edu (dot in local part — not netid-only aliases). */
export const DUKE_EMAIL_FORMAT_REGEX = /^.+\..+@duke\.edu$/i;

export const DUKE_EMAIL_FORMAT_MESSAGE =
    'Use your firstname.lastname@duke.edu address (e.g. rohan.dsouza@duke.edu). NetID-only aliases are not supported.';

export const DUKE_SIGNIN_EMAIL_MESSAGE =
    'Enter the same @duke.edu address you used when you requested the sign-in link.';

/** Any Duke address — for completing an inbound email sign-in link. */
export const isDukeEmail = (email: string): boolean =>
    email.trim().toLowerCase().endsWith('@duke.edu');

/** firstname.lastname@duke.edu — required when requesting a new sign-in link. */
export const isAllowedDukeEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    return trimmed.endsWith('@duke.edu') && DUKE_EMAIL_FORMAT_REGEX.test(trimmed);
};

const titleCase = (segment: string): string =>
    segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : '';

/** "anne-marie" / "o'brien" → "Anne-Marie" / "O'Brien". Empty or invalid returns null. */
export const normalizePersonName = (value: string): string | null => {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length > 40) return null;
    if (!/^[\p{L}][\p{L}'’.-]*$/u.test(trimmed)) return null;
    const normalized = trimmed
        .split(/([^A-Za-zÀ-ÿ]+)/)
        .map((part) => (/[\p{L}]/u.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
        .join('');
    return normalized || null;
};

/** Court label from a stored or typed name: "Rohan Dsouza" and "Rohan D." both become "Rohan D." */
export const courtLabelFromName = (name: string): string => {
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 'Player';
    const first = titleCase(tokens[0].replace(/\./g, ''));
    if (!first) return 'Player';
    if (tokens.length === 1) return first;
    const lastInitial = tokens[tokens.length - 1].replace(/\./g, '').charAt(0).toUpperCase();
    if (!lastInitial) return first;
    return `${first} ${lastInitial}.`;
};

/** Short court label: "Rohan D." from rohan.dsouza@duke.edu; other accounts use the saved name. */
export const formatCourtDisplayName = (email: string, fallbackName?: string): string => {
    const trimmedEmail = email.trim();
    const lower = trimmedEmail.toLowerCase();

    if (lower.endsWith('@manual.club') && fallbackName?.trim()) {
        return fallbackName.trim();
    }

    if (fallbackName?.trim()) {
        return courtLabelFromName(fallbackName);
    }

    if (lower.endsWith('@duke.edu')) {
        const local = lower.split('@')[0];
        const parts = local.split('.').filter(Boolean);
        if (parts.length >= 2) {
            const first = titleCase(parts[0]);
            const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
            return `${first} ${lastInitial}.`;
        }
    }

    if (fallbackName?.trim()) return courtLabelFromName(fallbackName);
    return 'Player';
};

/** Two-letter badge on court diagrams — first + last initial from the saved name when present. */
export const formatCourtSlotInitials = (email: string, storedName?: string): string => {
    if (storedName?.trim()) {
        const label = courtLabelFromName(storedName);
        const tokens = label.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
            const last = tokens[tokens.length - 1].replace(/\./g, '');
            return (tokens[0].charAt(0) + last.charAt(0)).toUpperCase();
        }
    }

    const lower = email.trim().toLowerCase();
    if (lower.endsWith('@duke.edu')) {
        const parts = lower.split('@')[0].split('.').filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
    }

    const display = formatCourtDisplayName(email, storedName);
    const tokens = display.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
        const last = tokens[tokens.length - 1].replace(/\./g, '');
        return (tokens[0].charAt(0) + last.charAt(0)).toUpperCase();
    }

    if (tokens.length === 1 && tokens[0] !== 'Player' && tokens[0].length >= 2) {
        return tokens[0].slice(0, 2).toUpperCase();
    }

    return '?';
};

export const formatMemberNameFromEmail = (email: string | null | undefined): string => {
    if (!email) return 'Player';
    return formatCourtDisplayName(email);
};

/** Greeting label — first name only, e.g. "Rohan" from rohan.dsouza@duke.edu. */
export const formatMemberFirstName = (
    email: string | null | undefined,
    displayName?: string | null,
): string => {
    const trimmed = displayName?.trim();
    if (trimmed?.includes(' ')) {
        const firstToken = trimmed.split(/\s+/)[0]?.replace(/\./g, '');
        if (firstToken) return titleCase(firstToken);
    }

    if (email) {
        const lower = email.trim().toLowerCase();
        if (lower.endsWith('@duke.edu')) {
            const parts = lower.split('@')[0].split('.').filter(Boolean);
            if (parts.length >= 1) return titleCase(parts[0]);
        }
    }

    if (trimmed) {
        const firstToken = trimmed.split(/\s+/)[0];
        if (firstToken.includes('.')) {
            const segment = firstToken.split('.').filter(Boolean)[0];
            if (segment) return titleCase(segment);
        }
        return titleCase(firstToken);
    }

    return 'Member';
};
