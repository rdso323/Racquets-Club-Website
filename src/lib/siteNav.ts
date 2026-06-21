/** Shared section index + labels — keep menu and on-page HUD numbers aligned. */
export type SiteSectionId = 'home' | 'booking' | 'events' | 'news' | 'help' | 'feedback';

/** Home page anchor sections linked from footer, menu, and cross-page CTAs. */
export const HOME_SECTION_IDS = [
    'booking-section',
    'events-section',
    'news-section',
    'radar',
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const SITE_NAV_SECTIONS: Record<
    SiteSectionId,
    { index: string; menuLabel: string; menuSub: string; hudLabel: string }
> = {
    home: {
        index: '01',
        menuLabel: 'Home',
        menuSub: 'Club overview',
        hudLabel: 'Home',
    },
    booking: {
        index: '02',
        menuLabel: 'Book a Court',
        menuSub: 'Session availability',
        hudLabel: 'Matchmaker',
    },
    events: {
        index: '03',
        menuLabel: 'Events',
        menuSub: 'Socials & mixers',
        hudLabel: 'Events',
    },
    news: {
        index: '04',
        menuLabel: 'News',
        menuSub: 'Latest results',
        hudLabel: 'News',
    },
    help: {
        index: '05',
        menuLabel: 'Help',
        menuSub: 'Booking FAQ',
        hudLabel: 'Help',
    },
    feedback: {
        index: '06',
        menuLabel: 'Feedback',
        menuSub: 'Share your thoughts',
        hudLabel: 'Feedback',
    },
};

export const sectionHud = (id: SiteSectionId): string =>
    `${SITE_NAV_SECTIONS[id].index} — ${SITE_NAV_SECTIONS[id].hudLabel}`;
