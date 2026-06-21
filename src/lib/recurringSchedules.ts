import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
    CLINIC_SCHEDULE,
    OPEN_PLAY_SCHEDULE,
    type AdminRecurringSchedule,
    type DayName,
    type OpenPlayDayConfig,
    type SessionType,
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

export const getBuiltinClinicScheduleKey = (sport: Sport, day: DayName): string =>
    `clinic_${sport.toLowerCase().replace(/ /g, '_')}_${day}`;

export const getRecurringTemplateKey = (sport: Sport, config: OpenPlayDayConfig): string =>
    config.scheduleId
        ? `custom:${config.sessionType ?? 'court'}:${config.scheduleId}`
        : config.sessionType === 'coaching'
          ? `builtin-clinic:${getBuiltinClinicScheduleKey(sport, config.day)}`
          : `builtin:${getBuiltinScheduleKey(sport, config.day)}`;

export const toOpenPlayDayConfig = (schedule: AdminRecurringSchedule): OpenPlayDayConfig => ({
    day: schedule.day,
    title: schedule.title,
    courts: schedule.courts,
    maxPerCourt: schedule.maxPerCourt,
    time: schedule.time,
    sessionType: schedule.sessionType,
    maxAttendees: schedule.maxAttendees,
    coach: schedule.coach,
    maxWaitlistSize: schedule.maxWaitlistSize,
    scheduleId: schedule.id,
    isCustom: true,
});

export const getMergedOpenPlaySchedulesForSport = (
    sport: Sport,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): OpenPlayDayConfig[] => {
    const disabled = new Set(disabledBuiltin);
    const builtin = (OPEN_PLAY_SCHEDULE[sport] || []).map((config) => ({
        ...config,
        sessionType: 'court' as SessionType,
    })).filter((config) => !disabled.has(getBuiltinScheduleKey(sport, config.day)));
    const custom = customSchedules
        .filter((s) => s.sport === sport && (s.sessionType ?? 'court') === 'court')
        .map(toOpenPlayDayConfig);
    return [...builtin, ...custom];
};

export const getMergedClinicSchedulesForSport = (
    sport: Sport,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): OpenPlayDayConfig[] => {
    const disabled = new Set(disabledBuiltin);
    const builtin = (CLINIC_SCHEDULE[sport] || []).map((config) => ({
        ...config,
        sessionType: 'coaching' as SessionType,
    })).filter((config) => !disabled.has(getBuiltinClinicScheduleKey(sport, config.day)));
    const custom = customSchedules
        .filter((s) => s.sport === sport && s.sessionType === 'coaching')
        .map(toOpenPlayDayConfig);
    return [...builtin, ...custom];
};

/** All weekly recurring templates (open play + clinics) for a sport. */
export const getMergedScheduleForSport = (
    sport: Sport,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): OpenPlayDayConfig[] => [
    ...getMergedOpenPlaySchedulesForSport(sport, customSchedules, disabledBuiltin),
    ...getMergedClinicSchedulesForSport(sport, customSchedules, disabledBuiltin),
];

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

export const defaultRecurringTitle = (day: DayName, sessionType: SessionType = 'court'): string =>
    sessionType === 'coaching'
        ? `Coaching Clinic · ${formatRecurringDayLabel(day)}`
        : `Open Play ${formatRecurringDayLabel(day)}`;

export const fetchRecurringSettings = async (): Promise<RecurringSchedulesSettings> => {
    const snap = await getDoc(doc(db, SETTINGS_DOC));
    if (!snap.exists()) return emptySettings();
    const data = snap.data();
    const schedules = Array.isArray(data.schedules)
        ? (data.schedules as AdminRecurringSchedule[]).map((s) => ({
              ...s,
              sessionType: s.sessionType ?? 'court',
          }))
        : [];
    return {
        schedules,
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
        sessionType: input.sessionType ?? 'court',
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

export const updateRecurringSchedule = async (
    id: string,
    patch: Partial<Omit<AdminRecurringSchedule, 'id'>>,
): Promise<void> => {
    const current = await fetchRecurringSettings();
    await saveRecurringSettings({
        ...current,
        schedules: current.schedules.map((schedule) => {
            if (schedule.id !== id) return schedule;
            const next: AdminRecurringSchedule = {
                ...schedule,
                ...patch,
                sessionType: patch.sessionType ?? schedule.sessionType ?? 'court',
            };
            if (next.sessionType === 'court') {
                delete next.coach;
            }
            return next;
        }),
    });
};

/** Disable a built-in template and add a custom replacement (e.g. when changing session type). */
export const replaceBuiltinRecurringSchedule = async (
    sport: Sport,
    config: OpenPlayDayConfig,
    input: Omit<AdminRecurringSchedule, 'id' | 'sport' | 'day'>,
): Promise<AdminRecurringSchedule> => {
    await disableBuiltinSchedule(sport, config.day, config.sessionType ?? 'court');
    return addRecurringSchedule({
        sport,
        day: config.day,
        ...input,
    });
};

export const disableBuiltinSchedule = async (
    sport: Sport,
    day: DayName,
    sessionType: SessionType = 'court',
): Promise<void> => {
    const current = await fetchRecurringSettings();
    const key =
        sessionType === 'coaching'
            ? getBuiltinClinicScheduleKey(sport, day)
            : getBuiltinScheduleKey(sport, day);
    if (current.disabledBuiltin.includes(key)) return;
    await saveRecurringSettings({
        ...current,
        disabledBuiltin: [...current.disabledBuiltin, key],
    });
};
