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

const MOCK_NEWS = [
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
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
            const fbEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(fbEvents);
            setCurrentEventIndex(0);
            setError(null);
        }, (err) => {
            console.error("Error fetching events:", err);
            setError("Could not connect to database.");
        });

        return () => unsubscribe();
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
                <h2 className="text-2xl font-light text-wimbledon-navy border-b border-gray-200 pb-2">Upcoming Events</h2>

                {error ? (
                    <div className="h-64 sm:h-80 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 text-sm">
                        {error}
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-64 sm:h-80 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-200">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8">
                                    <span className="bg-wimbledon-green text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-3">Featured Event</span>
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
                <h2 className="text-2xl font-light text-wimbledon-navy border-b border-gray-200 pb-2 flex justify-between items-baseline">
                    Latest News
                    <a href="https://www.espn.com/tennis/" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-wimbledon-green uppercase tracking-wide hover:underline">View All</a>
                </h2>

                <div className="flex flex-col gap-4">
                    {MOCK_NEWS.map((news) => (
                        <a key={news.id} href={news.link} target="_blank" rel="noopener noreferrer" className="club-card p-4 group cursor-pointer border-l-4 border-l-transparent hover:border-l-wimbledon-navy transition-all duration-300 block">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-wimbledon-green">{news.category}</span>
                                <span className="text-xs text-gray-400">{news.date}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-wimbledon-navy transition-colors line-clamp-2 mb-1">
                                {news.title}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {news.excerpt}
                            </p>
                            <span className="text-xs font-semibold text-wimbledon-navy group-hover:underline flex items-center">
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
