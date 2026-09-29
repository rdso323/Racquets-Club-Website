/**
 * Joining a weekly court writes sessions/open_play_custom_… for that week's roster.
 * That document must not show up as a second session next to the weekly card.
 */
import type { AdminRecurringSchedule } from '../src/lib/sports.ts';
import {
    type Session,
    buildAdminDisplaySessions,
    filterRegularSessionsForDisplay,
    getRecurringSessionId,
    pickAdminOpenPlayInstances,
    getOpenPlayInstancesWithinHorizon,
} from '../src/lib/sessions.ts';

const schedule: AdminRecurringSchedule = {
    id: '0e9164e4ef62',
    sport: 'Tennis',
    day: 'tuesday',
    title: 'Rock Quarry Courts',
    time: '5:30 PM – 7:30 PM',
    sessionType: 'court',
    courts: ['Court 1', 'Court 2', 'Court 3'],
    maxPerCourt: 4,
    maxAttendees: 12,
    maxWaitlistSize: 0,
    endsOn: '2026-10-27',
    bookingLockEnabled: false,
    autoEnrollCreator: false,
};

const court = (partial: Pick<Session, 'id' | 'title' | 'date' | 'sport'> & Partial<Session>): Session => ({
    type: 'court',
    time: '5:30 PM – 7:30 PM',
    maxAttendees: 12,
    attendees: [],
    waitlist: [],
    ...partial,
});

const weekDoc = court({
    id: 'open_play_custom_0e9164e4ef62_tuesday_2026-09-29',
    title: 'Rock Quarry Courts',
    date: 'Tuesday, Sep 29',
    sport: 'Tennis',
    weekStartDate: '2026-09-29',
    attendees: ['member|Rohan D.|r@duke.edu|Court 1|0'],
});

const oneTimeTennis = court({
    id: 'abcOneTimeTennis',
    title: 'Evening Hit',
    date: 'Tuesday, Sep 29',
    sport: 'Tennis',
    time: '8:00 PM – 9:00 PM',
    weekStartDate: '2026-09-29',
});

const oneTimeSquash = court({
    id: 'wooRtUy1hHOJALa3gTfX',
    title: 'Test Session',
    date: 'Tuesday, Sep 29',
    sport: 'Squash',
    time: '6:30 PM – 8:00 PM',
    weekStartDate: '2026-09-29',
});

const clinicDoc = court({
    id: 'clinic_custom_abc_tuesday_2026-09-29',
    title: 'Backhand Clinic',
    date: 'Tuesday, Sep 29',
    sport: 'Tennis',
    type: 'coaching',
    weekStartDate: '2026-09-29',
});

const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
    if (ok) {
        console.log(`PASS ${name}`);
        return;
    }
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
};

const beforeJoin = [oneTimeTennis, oneTimeSquash];
const afterJoin = [weekDoc, oneTimeTennis, oneTimeSquash, clinicDoc];

const weeklyCards = (sessions: Session[]) =>
    pickAdminOpenPlayInstances(
        getOpenPlayInstancesWithinHorizon(sessions, 'Tennis', [schedule], []),
        'Tennis',
    );

const beforeCards = weeklyCards(beforeJoin);
const afterCards = weeklyCards(afterJoin);
const expectedId = getRecurringSessionId('court', 'Tennis', 'tuesday', afterCards[0]?.playDate ?? new Date(), schedule.id);

check('weekly card exists before anyone joins', beforeCards.length === 1, `count ${beforeCards.length}`);
check('joining does not add a second weekly card', afterCards.length === 1, `count ${afterCards.length}`);
check(
    'join writes the same session id the card already uses',
    afterCards[0]?.session.id === weekDoc.id && weekDoc.id === expectedId,
    `card ${afterCards[0]?.session.id} doc ${weekDoc.id} expected ${expectedId}`,
);
check(
    'roster from the join shows on the weekly card',
    (afterCards[0]?.session.attendees.length ?? 0) === 1,
    `attendees ${afterCards[0]?.session.attendees.length}`,
);

const tennisOneTimeAfter = filterRegularSessionsForDisplay(afterJoin, 'Tennis').map((s) => s.title);
check(
    'the week document is not listed as its own tennis session',
    tennisOneTimeAfter.length === 1 && tennisOneTimeAfter[0] === 'Evening Hit',
    tennisOneTimeAfter.join(', '),
);

const squashOneTime = filterRegularSessionsForDisplay(afterJoin, 'Squash').map((s) => s.id);
check('a real one-time session still shows', squashOneTime.length === 1 && squashOneTime[0] === oneTimeSquash.id, squashOneTime.join(', '));

const adminTitles = buildAdminDisplaySessions(afterJoin, 'Tennis', [schedule], []).map((s) => s.title);
const rockQuarryCount = adminTitles.filter((title) => title === 'Rock Quarry Courts').length;
check('admin lists Rock Quarry once', rockQuarryCount === 1, `titles ${adminTitles.join(' | ')}`);
check('admin still lists the separate one-time tennis session', adminTitles.includes('Evening Hit'), adminTitles.join(' | '));

if (failures.length > 0) {
    console.error(`\n${failures.length} failed`);
    process.exit(1);
}
console.log('\nAll weekly-session display checks passed');
