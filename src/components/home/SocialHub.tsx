import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const SocialHub = ({ children }: { children?: React.ReactNode }) => {
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
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Events Carousel */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-2xl font-light text-wimbledon-navy dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2 transition-colors">Upcoming Events</h2>

                {error ? (
                    <div className="h-64 sm:h-80 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-64 sm:h-80 bg-gray-100 dark:bg-club-surface rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800">
                        No events scheduled
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-2xl club-card aspect-[16/9] sm:aspect-[21/9]">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentEventIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0"
                            >
                                <img
                                    src={events[currentEventIndex].image}
                                    alt={events[currentEventIndex].title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8">
                                    <span className="bg-wimbledon-green dark:bg-wimbledon-green-accent text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-3 shadow-sm">Featured Event</span>
                                    {events[currentEventIndex].link ? (
                                        <a href={events[currentEventIndex].link} target="_blank" rel="noopener noreferrer" className="text-white text-2xl sm:text-3xl font-medium mb-2 pr-12 hover:underline">
                                            {events[currentEventIndex].title}
                                        </a>
                                    ) : (
                                        <h3 className="text-white text-2xl sm:text-3xl font-medium mb-2 pr-12">
                                            {events[currentEventIndex].title}
                                        </h3>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-gray-200 text-sm">
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5" />
                                            {events[currentEventIndex].date}
                                        </div>
                                        {events[currentEventIndex].time && (
                                            <div className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1.5" />
                                                {events[currentEventIndex].time}
                                            </div>
                                        )}
                                        {events[currentEventIndex].location && (
                                            <div className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-1.5" />
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
                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors pointer-events-auto"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextEvent}
                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors pointer-events-auto"
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
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentEventIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {children && <div className="pt-8">{children}</div>}
            </div>

            {/* Latest News */}
            <div className="space-y-4">
                <h2 className="text-2xl font-light text-wimbledon-navy dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2 flex justify-between items-baseline transition-colors">
                    Latest News
                    <a href="https://www.espn.com/tennis/" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-wimbledon-green dark:text-wimbledon-gold uppercase tracking-wide hover:underline transition-colors">View All</a>
                </h2>

                <div className="flex flex-col gap-4">
                    {news.map((item) => (
                        <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="glass-panel p-4 group cursor-pointer lg:p-6 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-wimbledon-green dark:text-wimbledon-green-accent">{item.category}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{item.date}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-wimbledon-navy dark:group-hover:text-wimbledon-gold transition-colors line-clamp-2 mb-1">
                                {item.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 transition-colors">
                                {item.excerpt}
                            </p>
                            <span className="text-xs font-semibold text-wimbledon-navy dark:text-gray-300 group-hover:underline flex items-center transition-colors">
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

