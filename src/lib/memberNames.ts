/** Duke email must use firstname.lastname@duke.edu (dot in local part — not netid-only aliases). */
export const DUKE_EMAIL_FORMAT_REGEX = /^.+\..+@duke\.edu$/i;

export const DUKE_EMAIL_FORMAT_MESSAGE =
    'Use your firstname.lastname@duke.edu address (e.g. rohan.dsouza@duke.edu). NetID-only aliases are not supported.';

export const isAllowedDukeEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    return trimmed.endsWith('@duke.edu') && DUKE_EMAIL_FORMAT_REGEX.test(trimmed);
};

const titleCase = (segment: string): string =>
    segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : '';

/** Short court label: "Rohan D." from rohan.dsouza@duke.edu; manual entries keep stored name. */
export const formatCourtDisplayName = (email: string, fallbackName?: string): string => {
    const trimmedEmail = email.trim();
    const lower = trimmedEmail.toLowerCase();

    if (lower.endsWith('@manual.club') && fallbackName?.trim()) {
        return fallbackName.trim();
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

    if (fallbackName?.trim()) return fallbackName.trim();
    return 'Player';
};

export const formatMemberNameFromEmail = (email: string | null | undefined): string => {
    if (!email) return 'Player';
    return formatCourtDisplayName(email);
};
