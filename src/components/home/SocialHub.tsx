import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

/* Numbered editorial section header */
const SectionHeading = ({ index, title, aside }: { index: string; title: string; aside?: React.ReactNode }) => (
    <div className="flex items-end justify-between gap-4 border-b border-gray-200 dark:border-court-line/10 pb-4 transition-colors">
        <div className="flex items-baseline gap-4">
            <span aria-hidden="true" className="font-display italic text-2xl sm:text-3xl text-clay-500 dark:text-clay-400 leading-none">
                {index}
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-wimbledon-navy dark:text-court-line tracking-tight transition-colors">
                {title}
            </h2>
        </div>
        {aside}
    </div>
);

const SocialHub = () => {
    const prefersReducedMotion = useReducedMotion();
    const [events, setEvents] = useState<Event[]>([]);
    const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const fbEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(fbEvents);
            setCurrentEventIndex(0);
            setError(null);
        }, (err) => {
            console.error("Error fetching events:", err);
            setError("Could not connect to database.");
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

    const nextEvent = () => {
        setCurrentEventIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1));
    };

    const prevEvent = () => {
        setCurrentEventIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
    };

    return (
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-8 items-start">
            {/* Events — the cover story */}
            <div className="lg:col-span-3 space-y-5">
                <SectionHeading index="01" title="On the Calendar" />

                {error ? (
                    <div className="h-64 sm:h-80 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-64 sm:h-80 glass-deep flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-court-line/40">
                        <Calendar className="w-8 h-8 opacity-60" />
                        <p className="font-display italic text-lg">A quiet week on the grounds.</p>
                        <p className="text-xs uppercase tracking-[0.25em] font-semibold">No events scheduled</p>
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-3xl club-card aspect-[16/10] sm:aspect-[21/10] group">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentEventIndex}
                                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0"
                            >
                                <img
                                    src={events[currentEventIndex].image}
                                    alt={events[currentEventIndex].title}
                                    className="w-full h-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-court-950/95 via-court-950/40 to-transparent flex flex-col justify-end p-6 sm:p-9">
                                    <span aria-hidden="true" className="absolute top-4 right-6 font-display italic text-6xl sm:text-7xl text-court-line/15 select-none">
                                        {String(currentEventIndex + 1).padStart(2, '0')}
                                    </span>
                                    <span className="bg-clay-500 text-court-line text-[10px] font-bold uppercase tracking-[0.2em] py-1.5 px-3.5 rounded-full w-fit mb-4 shadow-lg">
                                        Featured Event
                                    </span>
                                    {events[currentEventIndex].link ? (
                                        <a href={events[currentEventIndex].link} target="_blank" rel="noopener noreferrer" className="font-display text-court-line text-3xl sm:text-4xl mb-3 pr-12 hover:underline decoration-wimbledon-gold underline-offset-4">
                                            {events[currentEventIndex].title}
                                        </a>
                                    ) : (
                                        <h3 className="font-display text-court-line text-3xl sm:text-4xl mb-3 pr-12">
                                            {events[currentEventIndex].title}
                                        </h3>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-court-line/80 text-sm">
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5 text-wimbledon-gold" />
                                            {events[currentEventIndex].date}
                                        </div>
                                        {events[currentEventIndex].time && (
                                            <div className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1.5 text-wimbledon-gold" />
                                                {events[currentEventIndex].time}
                                            </div>
                                        )}
                                        {events[currentEventIndex].location && (
                                            <div className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-1.5 text-wimbledon-gold" />
                                                {events[currentEventIndex].location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Carousel Controls */}
                        {events.length > 1 && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-4 pointer-events-none">
                                <button
                                    onClick={prevEvent}
                                    aria-label="Previous event"
                                    className="w-10 h-10 rounded-full bg-court-950/30 backdrop-blur-md border border-court-line/20 flex items-center justify-center text-court-line hover:bg-clay-600/70 transition-colors pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-court-line"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextEvent}
                                    aria-label="Next event"
                                    className="w-10 h-10 rounded-full bg-court-950/30 backdrop-blur-md border border-court-line/20 flex items-center justify-center text-court-line hover:bg-clay-600/70 transition-colors pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-court-line"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        )}

                        {/* Indicators */}
                        <div className="absolute bottom-4 right-4 flex space-x-2">
                            {events.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentEventIndex ? 'w-6 bg-wimbledon-gold' : 'w-2 bg-court-line/40'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* News — the wire */}
            <div id="news-section" className="lg:col-span-2 space-y-5 lg:sticky lg:top-28 scroll-mt-28">
                <SectionHeading
                    index="02"
                    title="The Wire"
                    aside={
                        <a href="https://www.espn.com/tennis/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-wimbledon-green dark:text-wimbledon-gold uppercase tracking-[0.2em] hover:underline transition-colors whitespace-nowrap pb-1">
                            View All
                        </a>
                    }
                />

                <div className="flex flex-col gap-4">
                    {news.map((item, idx) => (
                        <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`glass-panel p-5 group cursor-pointer rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:shadow-lg dark:hover:border-wimbledon-gold/40 ${idx % 2 === 1 ? 'lg:ml-6' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay-600 dark:text-clay-300">{item.category}</span>
                                <span className="text-xs text-gray-400 dark:text-court-line/40">{item.date}</span>
                            </div>
                            <h4 className="font-display text-lg leading-snug text-gray-900 dark:text-court-line group-hover:text-clay-600 dark:group-hover:text-wimbledon-gold transition-colors line-clamp-2 mb-1.5">
                                {item.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-court-line/60 line-clamp-2 mb-3 transition-colors font-light">
                                {item.excerpt}
                            </p>
                            <span className="text-xs font-bold uppercase tracking-wider text-wimbledon-navy dark:text-court-line/80 group-hover:underline decoration-wimbledon-gold underline-offset-4 flex items-center transition-colors">
                                Read More <ChevronRight className="w-3 h-3 ml-0.5" />
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SocialHub;
