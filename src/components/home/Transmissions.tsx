import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { RevealLines } from '../system/kinetic';

/*
 * ACT IV — transmissions. Club events as a draggable film-strip,
 * world racquet news as a numbered wire dispatch.
 * Firestore feeds (events / news) identical to the legacy SocialHub.
 */

interface Event {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link?: string;
}

interface NewsItem {
    id: string | number;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    link: string;
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: 1,
        title: "Indian Wells 2026: Zverev, Sabalenka Advance",
        excerpt: "Alexander Zverev outlasts Brandon Nakashima in three sets while Aryna Sabalenka powers past Jaqueline Cristian to reach the fourth round of the BNP Paribas Open.",
        date: "1 day ago",
        category: "ATP/WTA Tour",
        link: "https://www.atptour.com/en/news"
    },
    {
        id: 2,
        title: "Lin Chun-Yi Claims All England Open Title",
        excerpt: "Chinese Taipei's Lin Chun-Yi defeats India's Lakshya Sen to capture his first men's singles title at the prestigious All England Open in Birmingham.",
        date: "2 days ago",
        category: "BWF World Tour",
        link: "https://bwfworldtour.bwfbadminton.com/news"
    },
    {
        id: 3,
        title: "Paul Coll Dominates to Win New Zealand Open",
        excerpt: "World No. 2 Paul Coll secures his third consecutive New Zealand Open squash title with a straight-games victory over rising Egyptian star Mohamad Zakaria in Christchurch.",
        date: "3 days ago",
        category: "PSA Squash Tour",
        link: "https://www.psasquashtour.com/news/"
    }
];

/** Purely visual stand-ins so the strip stays cinematic when the feed is empty. */
const MOCK_EVENTS: Event[] = [
    { id: 'mock1', title: 'Night Court — Season Opener', date: 'Friday, Sep 12', time: '21:00', location: 'Card Gym, Courts 2–5', image: '' },
    { id: 'mock2', title: 'Fuqua × Law Doubles Invitational', date: 'Saturday, Oct 04', time: '10:00', location: 'Center Courts', image: '' },
    { id: 'mock3', title: 'Glow Rally — Blacklight Badminton', date: 'Wednesday, Oct 22', time: '19:30', location: 'Courts 1–2', image: '' },
    { id: 'mock4', title: 'The Pressure Chamber — Squash Open', date: 'Monday, Nov 03', time: '18:00', location: 'Glass Box', image: '' },
];

const EVENT_ACCENTS = ['#D7FF3E', '#6FA8FF', '#FF6A3D', '#EDF2E4'];

const Transmissions = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
    const [offline, setOffline] = useState(false);

    const trackRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [dragLimit, setDragLimit] = useState(0);

    useEffect(() => {
        const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const fbEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(fbEvents);
            setOffline(false);
        }, (err) => {
            console.error("Error fetching events:", err);
            setOffline(true);
        });

        const unsubscribeNews = onSnapshot(collection(db, 'news'), (snapshot) => {
            if (!snapshot.empty) {
                const fbNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem));
                setNews(fbNews);
            } else {
                setNews(MOCK_NEWS);
            }
        }, (err) => {
            console.warn("Could not load news from Firestore, using defaults.", err);
            setNews(MOCK_NEWS);
        });

        return () => {
            unsubscribeEvents();
            unsubscribeNews();
        };
    }, []);

    const displayEvents = events.length > 0 ? events : MOCK_EVENTS;
    const usingMockEvents = events.length === 0;

    useEffect(() => {
        const measure = () => {
            const track = trackRef.current;
            const viewport = viewportRef.current;
            if (track && viewport) {
                setDragLimit(Math.max(0, track.scrollWidth - viewport.clientWidth));
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [displayEvents.length]);

    return (
        <section className="relative overflow-hidden py-24 md:py-32">
            {/* ── EVENTS FILM-STRIP ── */}
            <div className="mb-4 flex items-baseline justify-between px-5 md:px-12">
                <span className="hud-label text-ace">03 / TRANSMISSIONS</span>
                <span className="hud-label text-chalk/40">
                    {offline ? '⚠ OFFLINE FEED' : usingMockEvents ? 'PREVIEW REEL' : `${displayEvents.length} INCOMING`}
                </span>
            </div>

            <div className="px-5 md:px-12">
                <RevealLines
                    lines={[
                        <h2 key="1" className="display-tight text-[clamp(2.8rem,8vw,7.5rem)] text-chalk">
                            UPCOMING <span className="text-hollow">SIGNALS</span>
                        </h2>,
                    ]}
                />
                <p className="hud-label mt-4 text-chalk/40">DRAG THE STRIP — RSVP ON COURT</p>
            </div>

            <div ref={viewportRef} className="mt-12 overflow-hidden">
                <motion.div
                    ref={trackRef}
                    drag="x"
                    dragConstraints={{ left: -dragLimit, right: 0 }}
                    dragElastic={0.06}
                    className="flex w-max cursor-grab gap-px bg-chalk/10 pl-5 active:cursor-grabbing md:pl-12"
                    data-cursor="hover"
                    data-cursor-label="DRAG"
                >
                    {displayEvents.map((event, i) => {
                        const accent = EVENT_ACCENTS[i % EVENT_ACCENTS.length];
                        const inner = (
                            <div className="relative flex h-[26rem] w-[19rem] flex-col justify-between overflow-hidden bg-court p-6 transition-colors hover:bg-carbon md:h-[30rem] md:w-[24rem]">
                                {event.image ? (
                                    <>
                                        <img
                                            src={event.image}
                                            alt=""
                                            draggable={false}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            className="absolute inset-0 h-full w-full object-cover opacity-45 saturate-0 transition-all duration-500 hover:opacity-65"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-court via-court/55 to-transparent" />
                                    </>
                                ) : (
                                    <div
                                        className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-[0.12] blur-2xl"
                                        style={{ background: accent }}
                                    />
                                )}

                                <div className="relative z-10 flex items-start justify-between">
                                    <span className="hud-label" style={{ color: accent }}>
                                        TX.{String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span className="hud-label text-chalk/50">{event.time || '—'}</span>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="display-narrow mb-4 text-3xl uppercase leading-[0.95] text-chalk md:text-4xl">
                                        {event.title}
                                    </h3>
                                    <div className="hairline-t flex flex-col gap-1.5 pt-4">
                                        <p className="hud-label text-chalk/70">▸ {event.date?.toUpperCase()}</p>
                                        {event.location && <p className="hud-label text-chalk/45">▸ {event.location.toUpperCase()}</p>}
                                        {event.link && <p className="hud-label" style={{ color: accent }}>▸ OPEN BRIEFING ↗</p>}
                                    </div>
                                </div>
                            </div>
                        );

                        return event.link ? (
                            <a key={event.id} href={event.link} target="_blank" rel="noopener noreferrer" draggable={false}>
                                {inner}
                            </a>
                        ) : (
                            <div key={event.id}>{inner}</div>
                        );
                    })}

                    {/* end cap */}
                    <div className="flex h-[26rem] w-56 items-center justify-center bg-court md:h-[30rem]">
                        <span className="hud-label rotate-90 text-chalk/30">END OF REEL —</span>
                    </div>
                </motion.div>
            </div>

            {/* ── THE WIRE: DISPATCHES ── */}
            <div className="mt-32 px-5 md:px-12">
                <div className="mb-10 flex items-baseline justify-between">
                    <h2 className="display-narrow text-3xl uppercase text-chalk md:text-5xl">
                        WORLD <span className="text-hollow">DISPATCHES</span>
                    </h2>
                    <a
                        href="https://www.espn.com/tennis/"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="hover"
                        className="hud-label text-ace hover:text-chalk transition-colors"
                    >
                        FULL WIRE ↗
                    </a>
                </div>

                <div className="hairline-t">
                    {news.map((item, i) => (
                        <motion.a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cursor="hover"
                            data-cursor-label="READ"
                            className="hairline-b group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 py-6 transition-colors hover:bg-carbon md:grid-cols-[6rem_1fr_18rem_8rem] md:px-4"
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-8%' }}
                            transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <span className="hud-label text-chalk/35">D.{String(i + 1).padStart(2, '0')}</span>
                            <h4 className="display-narrow text-xl uppercase text-chalk transition-transform duration-300 group-hover:translate-x-2 md:text-2xl">
                                {item.title}
                            </h4>
                            <p className="hud-label col-start-2 text-chalk/40 md:col-start-3 line-clamp-2 normal-case tracking-normal">
                                {item.excerpt}
                            </p>
                            <span className="hud-label col-start-2 text-ace md:col-start-4 md:text-right">
                                {item.category.toUpperCase()}
                                <span className="block text-chalk/35">{item.date.toUpperCase()}</span>
                            </span>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Transmissions;
