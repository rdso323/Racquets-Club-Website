import type { CourtSlot } from '../components/home/CourtDiagram';
import { mapAttendeesToCourtSlots, parseAttendee } from './sessions';
import { formatCourtHoverName, formatCourtSlotInitials } from './memberNames';

export const buildCourtSlots = (
    courtAttendees: string[],
    maxPerCourt: number,
    userId?: string,
    namesByUid?: ReadonlyMap<string, string>,
): (CourtSlot | null)[] => {
    const mapped = mapAttendeesToCourtSlots(courtAttendees, maxPerCourt);
    return mapped.map((entry) => {
        if (!entry) return null;
        const { name, email, uid } = parseAttendee(entry);
        const isMine = userId ? entry.startsWith(`${uid}|`) || entry === uid : false;
        const displayName = formatCourtHoverName(email, name, namesByUid?.get(uid));
        return {
            name: displayName,
            email,
            initials: formatCourtSlotInitials(email, name),
            tooltip: displayName,
            isMine,
        };
    });
};
