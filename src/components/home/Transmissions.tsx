import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { RevealLines } from '../system/kinetic';
import { Calendar, ExternalLink } from 'lucide-react';
import { sectionHud } from '../../lib/siteNav';
import { DEFAULT_CLUB_EVENTS, resolveDisplayEvents, type ClubEvent } from '../../lib/defaultEvents';

interface Event extends ClubEvent {}

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
        title: 'Indian Wells 2026: Zverev, Sabalenka Advance',
        excerpt: 'Alexander Zverev outlasts Brandon Nakashima in three sets while Aryna Sabalenka powers past Jaqueline Cristian.',
        date: '1 day ago',
        category: 'Tennis',
        link: 'https://www.atptour.com/en/news',
    },
    {
        id: 2,
        title: 'Lin Chun-Yi Claims All England Open Title',
        excerpt: "Chinese Taipei's Lin Chun-Yi defeats India's Lakshya Sen to capture his first men's singles title at the All England Open.",
        date: '2 days ago',
        category: 'Badminton',
        link: 'https://bwfworldtour.bwfbadminton.com/news',
    },
    {
        id: 3,
        title: 'Paul Coll Dominates to Win New Zealand Open',
        excerpt: 'World No. 2 Paul Coll secures his third consecutive New Zealand Open squash title in Christchurch.',
        date: '3 days ago',
        category: 'Squash',
        link: 'https://www.psasquashtour.com/news/',
    },
    {
        id: 4,
        title: 'Ben Johns Headlines PPA Tour Championship',
        excerpt: 'World No. 1 Ben Johns continues his dominant pickleball season, advancing to the PPA Tour Championship final in straight games.',
        date: '4 days ago',
        category: 'Pickleball',
        link: 'https://www.ppatour.com/',
    },
];

const EVENT_ACCENTS = ['#BEF264', '#22D3EE', '#FFBF00', '#C9A84C'];
const MAX_NEWS_ARTICLES = 4;

const Transmissions = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragLimit, setDragLimit] = useState(0);

    useEffect(() => {
        const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const fbEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
            setEvents(resolveDisplayEvents(fbEvents));
        });

        const unsubNews = onSnapshot(collection(db, 'news'), (snapshot) => {
            const fbNews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NewsItem));
            const source = fbNews.length > 0 ? fbNews : MOCK_NEWS;
            setNews(source.slice(0, MAX_NEWS_ARTICLES));
        });

        return () => {
            unsubEvents();
            unsubNews();
        };
    }, []);

    useEffect(() => {
        const measure = () => {
            if (trackRef.current) {
                setDragLimit(Math.max(0, trackRef.current.scrollWidth - trackRef.current.offsetWidth));
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [events]);

    const displayEvents = events.length > 0 ? events : DEFAULT_CLUB_EVENTS;

    return (
        <section className="pb-16 pt-8 md:pb-24 md:pt-10">
            {/* Events carousel */}
            <div id="events-section" className="mb-20 scroll-mt-24">
                <RevealLines
                    className="mb-8 px-5 md:px-10"
                    lineClassName="flex items-baseline gap-4"
                    lines={[
                        <span key="a" className="hud-label text-emerald-600 dark:text-court-accent">{sectionHud('events')}</span>,
                        <h2 key="b" className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">Club Events</h2>,
                    ]}
                />
                <p className="mb-8 px-5 text-sm text-gray-500 dark:text-chalk/50 md:px-10">
                    Social gatherings, mixers, and community play — drag to browse upcoming events.
                </p>

                <div className="overflow-x-hidden">
                    <motion.div
                        ref={trackRef}
                        drag="x"
                        dragConstraints={{ left: -dragLimit, right: 0 }}
                        dragElastic={0.06}
                        className="flex cursor-grab gap-5 px-5 active:cursor-grabbing md:px-10"
                    >
                    {displayEvents.map((event, i) => (
                        <article
                            key={event.id}
                            data-cursor
                            className="glass-deep w-[min(85vw,22rem)] shrink-0 overflow-hidden"
                            style={{ borderColor: `${EVENT_ACCENTS[i % EVENT_ACCENTS.length]}33` }}
                        >
                            {event.image ? (
                                <div className="relative h-40 overflow-hidden">
                                    <img
                                        src={event.image}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex h-32 items-end p-5"
                                    style={{
                                        background: `linear-gradient(135deg, ${EVENT_ACCENTS[i % EVENT_ACCENTS.length]}22, transparent)`,
                                    }}
                                >
                                    <Calendar className="h-8 w-8 text-gray-400 dark:text-chalk/30" />
                                </div>
                            )}
                            <div className="p-5">
                                <p className="hud-label mb-2 text-gray-400 dark:text-chalk/40">{event.date} · {event.time}</p>
                                <h3 className="font-display text-xl text-gray-900 dark:text-chalk">{event.title}</h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-chalk/55">{event.location}</p>
                                {event.link && (
                                    <a
                                        href={event.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold accent-text hover:underline"
                                    >
                                        Details <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </article>
                    ))}
                    </motion.div>
                </div>
            </div>

            {/* News rail */}
            <div id="news-section" className="px-5 scroll-mt-24 md:px-10">
                <RevealLines
                    className="mb-8"
                    lineClassName="flex items-baseline gap-4"
                    lines={[
                        <span key="a" className="hud-label text-emerald-600 dark:text-court-accent">{sectionHud('news')}</span>,
                        <h2 key="b" className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">In the News</h2>,
                    ]}
                />
                <p className="mb-4 text-sm text-gray-500 dark:text-chalk/50 sm:hidden">
                    Swipe sideways to browse headlines
                </p>
                <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                    <div className="flex gap-4 sm:grid sm:grid-cols-2 sm:gap-px sm:overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:bg-gray-200 lg:grid-cols-4 dark:sm:border-chalk/10 dark:sm:bg-chalk/10">
                        {news.map((item, i) => (
                            <motion.a
                                key={item.id}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-cursor
                                className="group flex w-[min(85vw,20rem)] shrink-0 snap-start flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:bg-gray-50 dark:border-chalk/10 dark:bg-court-950 dark:hover:bg-carbon sm:w-auto sm:rounded-none sm:border-0"
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-5%' }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="hud-label text-gray-300 dark:text-chalk/30">{String(i + 1).padStart(2, '0')}</span>
                                    <span className="hud-label text-emerald-600/80 dark:text-court-accent/70">{item.category}</span>
                                    <span className="hud-label ml-auto text-gray-400 dark:text-chalk/30">{item.date}</span>
                                </div>
                                <h3 className="font-display text-lg text-gray-900 transition-colors group-hover:text-clay-600 dark:text-chalk dark:group-hover:text-clay-300">
                                    {item.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-gray-500 dark:text-chalk/50">{item.excerpt}</p>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Transmissions;
