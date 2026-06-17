import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
    OPEN_PLAY_SCHEDULE,
    type AdminRecurringSchedule,
    type DayName,
    type OpenPlayDayConfig,
    type Sport,
    SPORTS,
} from './sports';

const SETTINGS_DOC = 'settings/recurringSchedules';

export const toOpenPlayDayConfig = (schedule: AdminRecurringSchedule): OpenPlayDayConfig => ({
    day: schedule.day,
    title: schedule.title,
    courts: schedule.courts,
    maxPerCourt: schedule.maxPerCourt,
    time: schedule.time,
    maxWaitlistSize: schedule.maxWaitlistSize,
    scheduleId: schedule.id,
    isCustom: true,
});

export const getMergedScheduleForSport = (
    sport: Sport,
    customSchedules: AdminRecurringSchedule[] = [],
): OpenPlayDayConfig[] => {
    const custom = customSchedules.filter((s) => s.sport === sport).map(toOpenPlayDayConfig);
    return [...(OPEN_PLAY_SCHEDULE[sport] || []), ...custom];
};

export const getAllMergedSchedules = (
    customSchedules: AdminRecurringSchedule[] = [],
): Record<Sport, OpenPlayDayConfig[]> => {
    const merged = {} as Record<Sport, OpenPlayDayConfig[]>;
    for (const sport of SPORTS) {
        merged[sport] = getMergedScheduleForSport(sport, customSchedules);
    }
    return merged;
};

export const listBuiltinRecurringSchedules = (): Array<AdminRecurringSchedule & { isBuiltin: true }> => {
    const items: Array<AdminRecurringSchedule & { isBuiltin: true }> = [];
    for (const sport of SPORTS) {
        for (const config of OPEN_PLAY_SCHEDULE[sport] || []) {
            items.push({
                id: `builtin_${sport.toLowerCase().replace(/ /g, '_')}_${config.day}`,
                sport,
                day: config.day,
                title: config.title,
                time: config.time,
                courts: config.courts,
                maxPerCourt: config.maxPerCourt,
                maxWaitlistSize: config.maxWaitlistSize,
                isBuiltin: true,
            });
        }
    }
    return items;
};

export const formatRecurringDayLabel = (day: DayName): string =>
    day.charAt(0).toUpperCase() + day.slice(1);

export const defaultRecurringTitle = (day: DayName): string =>
    `Open Play ${formatRecurringDayLabel(day)}`;

export const fetchRecurringSchedules = async (): Promise<AdminRecurringSchedule[]> => {
    const snap = await getDoc(doc(db, SETTINGS_DOC));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.schedules) ? (data.schedules as AdminRecurringSchedule[]) : [];
};

export const saveRecurringSchedules = async (schedules: AdminRecurringSchedule[]): Promise<void> => {
    await setDoc(doc(db, SETTINGS_DOC), { schedules });
};

export const addRecurringSchedule = async (
    input: Omit<AdminRecurringSchedule, 'id'>,
): Promise<AdminRecurringSchedule> => {
    const existing = await fetchRecurringSchedules();
    const created: AdminRecurringSchedule = {
        ...input,
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
    };
    await saveRecurringSchedules([...existing, created]);
    return created;
};

export const removeRecurringSchedule = async (id: string): Promise<void> => {
    const existing = await fetchRecurringSchedules();
    await saveRecurringSchedules(existing.filter((s) => s.id !== id));
};
