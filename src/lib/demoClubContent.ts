/** Known seeded / fallback event document ids from early site mocks. */
export const DEMO_EVENT_IDS = [
    'fall-doubles-mixer',
    'wimbledon-watch-party',
    'summer-kickoff',
    'us-open-watch-party',
] as const;

export const DEMO_EVENT_TITLES = new Set(
    [
        'Fall Doubles Mixer',
        'Wimbledon Finals Watch Party',
        'Summer Kickoff Social',
        "US Open Men's Final Watch Party",
    ].map((t) => t.toLowerCase()),
);

export const isDemoClubEvent = (event: { id?: string; title?: string }): boolean => {
    const id = String(event.id ?? '');
    const title = String(event.title ?? '').toLowerCase();
    return (
        DEMO_EVENT_IDS.includes(id as (typeof DEMO_EVENT_IDS)[number]) ||
        DEMO_EVENT_TITLES.has(title)
    );
};
