import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle } from 'lucide-react';
import Footer from '../components/home/Footer';
import { HELP_FAQ } from '../lib/helpFaq';
import { sectionHud } from '../lib/siteNav';
import { useUI } from '../components/system/UIProvider';

const Help = () => {
    const { openFeedback } = useUI();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-3xl px-5 pb-16 pt-28 md:px-10 md:pt-32">
                <p className="hud-label mb-3 text-court-accent">{sectionHud('help')}</p>
                <h1 className="font-display text-4xl text-gray-900 dark:text-chalk md:text-5xl">
                    Booking & club FAQ
                </h1>
                <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-chalk/60">
                    Quick answers about signing in, reserving courts, waitlists, and weekly schedules.
                    This page is static — no extra cost to load and it works offline after your first visit.
                </p>

                <div className="mt-10 space-y-2">
                    {HELP_FAQ.map((item, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div
                                key={item.question}
                                className="glass-deep overflow-hidden rounded-xl border border-gray-200/80 dark:border-chalk/10"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <span className="font-medium text-gray-900 dark:text-chalk">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-chalk/40 ${
                                            isOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-chalk/10 dark:text-chalk/65">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50/80 p-6 dark:border-chalk/10 dark:bg-court-900/40">
                    <p className="font-display text-xl text-gray-900 dark:text-chalk">Still stuck?</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-chalk/60">
                        Send feedback and we will get back to you, or head to the booking section to try again.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={openFeedback}
                            className="clay-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Send feedback
                        </button>
                        <Link
                            to="/#booking-section"
                            className="inline-flex items-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-wimbledon-navy transition-colors hover:bg-white dark:border-chalk/20 dark:text-chalk dark:hover:bg-chalk/5"
                        >
                            Go to booking
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Help;
