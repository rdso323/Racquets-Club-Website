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

export interface RecurringSchedulesSettings {
    schedules: AdminRecurringSchedule[];
    disabledBuiltin: string[];
}

const emptySettings = (): RecurringSchedulesSettings => ({
    schedules: [],
    disabledBuiltin: [],
});

export const getBuiltinScheduleKey = (sport: Sport, day: DayName): string =>
    `${sport.toLowerCase().replace(/ /g, '_')}_${day}`;

export const getRecurringTemplateKey = (sport: Sport, config: OpenPlayDayConfig): string =>
    config.scheduleId ? `custom:${config.scheduleId}` : `builtin:${getBuiltinScheduleKey(sport, config.day)}`;

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
    disabledBuiltin: string[] = [],
): OpenPlayDayConfig[] => {
    const disabled = new Set(disabledBuiltin);
    const builtin = (OPEN_PLAY_SCHEDULE[sport] || []).filter(
        (config) => !disabled.has(getBuiltinScheduleKey(sport, config.day)),
    );
    const custom = customSchedules.filter((s) => s.sport === sport).map(toOpenPlayDayConfig);
    return [...builtin, ...custom];
};

export const getAllMergedSchedules = (
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): Record<Sport, OpenPlayDayConfig[]> => {
    const merged = {} as Record<Sport, OpenPlayDayConfig[]>;
    for (const sport of SPORTS) {
        merged[sport] = getMergedScheduleForSport(sport, customSchedules, disabledBuiltin);
    }
    return merged;
};

export const formatRecurringDayLabel = (day: DayName): string =>
    day.charAt(0).toUpperCase() + day.slice(1);

export const defaultRecurringTitle = (day: DayName): string =>
    `Open Play ${formatRecurringDayLabel(day)}`;

export const fetchRecurringSettings = async (): Promise<RecurringSchedulesSettings> => {
    const snap = await getDoc(doc(db, SETTINGS_DOC));
    if (!snap.exists()) return emptySettings();
    const data = snap.data();
    return {
        schedules: Array.isArray(data.schedules) ? (data.schedules as AdminRecurringSchedule[]) : [],
        disabledBuiltin: Array.isArray(data.disabledBuiltin) ? (data.disabledBuiltin as string[]) : [],
    };
};

export const saveRecurringSettings = async (settings: RecurringSchedulesSettings): Promise<void> => {
    await setDoc(doc(db, SETTINGS_DOC), settings, { merge: true });
};

export const fetchRecurringSchedules = async (): Promise<AdminRecurringSchedule[]> => {
    const settings = await fetchRecurringSettings();
    return settings.schedules;
};

export const saveRecurringSchedules = async (schedules: AdminRecurringSchedule[]): Promise<void> => {
    const current = await fetchRecurringSettings();
    await saveRecurringSettings({ ...current, schedules });
};

export const addRecurringSchedule = async (
    input: Omit<AdminRecurringSchedule, 'id'>,
): Promise<AdminRecurringSchedule> => {
    const current = await fetchRecurringSettings();
    const created: AdminRecurringSchedule = {
        ...input,
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
    };
    await saveRecurringSettings({
        ...current,
        schedules: [...current.schedules, created],
    });
    return created;
};

export const removeRecurringSchedule = async (id: string): Promise<void> => {
    const current = await fetchRecurringSettings();
    await saveRecurringSettings({
        ...current,
        schedules: current.schedules.filter((s) => s.id !== id),
    });
};

export const disableBuiltinSchedule = async (sport: Sport, day: DayName): Promise<void> => {
    const current = await fetchRecurringSettings();
    const key = getBuiltinScheduleKey(sport, day);
    if (current.disabledBuiltin.includes(key)) return;
    await saveRecurringSettings({
        ...current,
        disabledBuiltin: [...current.disabledBuiltin, key],
    });
};
