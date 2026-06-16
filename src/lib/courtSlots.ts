import type { CourtSlot } from '../components/home/CourtDiagram';
import { mapAttendeesToCourtSlots, parseAttendee } from './sessions';

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
        return {
            name,
            email,
            tooltip: email.includes('@') ? email : name,
            isMine,
        };
    });
};
