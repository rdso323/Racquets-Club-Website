import type { CourtSlot } from '../components/home/CourtDiagram';
import { mapAttendeesToCourtSlots, parseAttendee } from './sessions';
import { formatCourtDisplayName, formatCourtSlotInitials } from './memberNames';

export const buildCourtSlots = (
    courtAttendees: string[],
    maxPerCourt: number,
    userId?: string,
): (CourtSlot | null)[] => {
    const mapped = mapAttendeesToCourtSlots(courtAttendees, maxPerCourt);
    return mapped.map((entry) => {
        if (!entry) return null;
        const { name, email, uid } = parseAttendee(entry);
        const isMine = userId ? entry.startsWith(`${uid}|`) || entry === uid : false;
        const displayName = formatCourtDisplayName(email, name);
        return {
            name: displayName,
            email,
            initials: formatCourtSlotInitials(email, name),
            // "Rohan D." — the same court label as the spot, not the email address.
            tooltip: displayName,
            isMine,
        };
    });
};
