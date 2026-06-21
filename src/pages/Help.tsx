import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle, Search, Shield, X } from 'lucide-react';
import Footer from '../components/home/Footer';
import { ADMIN_HELP_FAQ, MEMBER_HELP_FAQ, type FaqItem } from '../lib/helpFaq';
import { sectionHud } from '../lib/siteNav';
import { useUI } from '../components/system/UIProvider';
import { useAuth } from '../contexts/AuthContext';

type FaqSection = 'member' | 'admin';

interface FaqSearchEntry {
    section: FaqSection;
    index: number;
    item: FaqItem;
}

const faqItemId = (section: FaqSection, index: number) => `faq-${section}-${index}`;

const normalizeSearchText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const matchesFaqQuery = (item: FaqItem, query: string) => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return false;
    return (
        normalizeSearchText(item.question).includes(normalizedQuery) ||
        normalizeSearchText(item.answer).includes(normalizedQuery)
    );
};

const FaqAccordion = ({
    items,
    openIndex,
    onToggle,
    idPrefix,
    section,
    highlightIndex,
}: {
    items: FaqItem[];
    openIndex: number | null;
    onToggle: (index: number) => void;
    idPrefix: string;
    section: FaqSection;
    highlightIndex?: number | null;
}) => (
    <div className="space-y-2">
        {items.map((item, index) => {
            const isOpen = openIndex === index;
            const isHighlighted = highlightIndex === index;
            return (
                <div
                    id={faqItemId(section, index)}
                    key={`${idPrefix}-${item.question}`}
                    className={`glass-deep scroll-mt-32 overflow-hidden rounded-xl border transition-shadow duration-500 ${
                        isHighlighted
                            ? 'border-court-accent/60 shadow-md shadow-court-accent/10 ring-2 ring-court-accent/25'
                            : 'border-gray-200/80 dark:border-chalk/10'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => onToggle(isOpen ? -1 : index)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        aria-expanded={isOpen}
                    >
                        <span className="font-medium text-gray-900 dark:text-chalk">{item.question}</span>
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
);

const Help = () => {
    const { openFeedback } = useUI();
    const { isAdmin } = useAuth();
    const [memberOpenIndex, setMemberOpenIndex] = useState<number | null>(0);
    const [adminOpenIndex, setAdminOpenIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [highlight, setHighlight] = useState<{ section: FaqSection; index: number } | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const searchableEntries = useMemo<FaqSearchEntry[]>(() => {
        const memberEntries = MEMBER_HELP_FAQ.map((item, index) => ({
            section: 'member' as const,
            index,
            item,
        }));
        if (!isAdmin) return memberEntries;
        return [
            ...memberEntries,
            ...ADMIN_HELP_FAQ.map((item, index) => ({
                section: 'admin' as const,
                index,
                item,
            })),
        ];
    }, [isAdmin]);

    const searchResults = useMemo(() => {
        if (!normalizeSearchText(searchQuery)) return [];
        return searchableEntries.filter(({ item }) => matchesFaqQuery(item, searchQuery)).slice(0, 8);
    }, [searchQuery, searchableEntries]);

    const showSearchResults = searchFocused && searchQuery.trim().length > 0;

    useEffect(() => {
        if (!highlight) return;
        const timer = window.setTimeout(() => setHighlight(null), 2400);
        return () => window.clearTimeout(timer);
    }, [highlight]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!searchContainerRef.current?.contains(event.target as Node)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const openFaqResult = (entry: FaqSearchEntry) => {
        if (entry.section === 'member') {
            setMemberOpenIndex(entry.index);
            setAdminOpenIndex(null);
        } else {
            setAdminOpenIndex(entry.index);
        }

        setHighlight({ section: entry.section, index: entry.index });
        setSearchQuery('');
        setSearchFocused(false);

        window.requestAnimationFrame(() => {
            document.getElementById(faqItemId(entry.section, entry.index))?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    };

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-3xl px-5 pb-16 pt-28 md:px-10 md:pt-32">
                <p className="hud-label mb-3 text-court-accent">{sectionHud('help')}</p>
                <h1 className="font-display text-4xl text-gray-900 dark:text-chalk md:text-5xl">
                    Booking & club FAQ
                </h1>
                <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-chalk/60">
                    {isAdmin
                        ? 'Member FAQ below; scroll to the Operations guide for admin topics — homepage gear controls, clinic capacity, waitlists, recurring edits, and the Operations Deck.'
                        : 'Quick answers about signing in, all five club sports, reserving courts, waitlists (including who is queued), weekly sessions, clinics, and club events.'}
                </p>

                <div ref={searchContainerRef} className="relative mt-8">
                    <label htmlFor="help-faq-search" className="sr-only">
                        Search help topics
                    </label>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-chalk/40" />
                    <input
                        id="help-faq-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        placeholder="Search help topics (waitlist, courts, admin, sign in…)"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-court-accent/50 focus:ring-2 focus:ring-court-accent/15 dark:border-chalk/10 dark:bg-carbon dark:text-chalk dark:placeholder:text-chalk/35"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={showSearchResults}
                        aria-controls="help-faq-search-results"
                        aria-autocomplete="list"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSearchFocused(true);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-chalk/70"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {showSearchResults && (
                        <div
                            id="help-faq-search-results"
                            role="listbox"
                            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-chalk/10 dark:bg-carbon"
                        >
                            {searchResults.length > 0 ? (
                                searchResults.map((entry) => (
                                    <button
                                        key={`${entry.section}-${entry.index}-${entry.item.question}`}
                                        type="button"
                                        role="option"
                                        onClick={() => openFaqResult(entry)}
                                        className="flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-chalk/10 dark:hover:bg-court-950/60"
                                    >
                                        <span className="text-sm font-medium text-gray-900 dark:text-chalk">
                                            {entry.item.question}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-chalk/45">
                                            {entry.section === 'admin' ? 'Operations guide' : 'Member FAQ'}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <p className="px-4 py-3 text-sm text-gray-500 dark:text-chalk/50">
                                    No matching help topics. Try words like waitlist, courts, sign in, or admin.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-10">
                    <FaqAccordion
                        items={MEMBER_HELP_FAQ}
                        openIndex={memberOpenIndex}
                        onToggle={(index) => setMemberOpenIndex(index < 0 ? null : index)}
                        idPrefix="member"
                        section="member"
                        highlightIndex={highlight?.section === 'member' ? highlight.index : null}
                    />
                </div>

                {isAdmin && (
                    <div className="mt-14">
                        <div className="mb-6 flex items-center gap-3">
                            <Shield className="h-5 w-5 text-court-accent" />
                            <div>
                                <p className="hud-label text-court-accent">Admin only</p>
                                <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">
                                    Operations guide
                                </h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-chalk/50">
                                    Not visible to regular members — shown because you are signed in as an admin.
                                </p>
                            </div>
                        </div>
                        <FaqAccordion
                            items={ADMIN_HELP_FAQ}
                            openIndex={adminOpenIndex}
                            onToggle={(index) => setAdminOpenIndex(index < 0 ? null : index)}
                            idPrefix="admin"
                            section="admin"
                            highlightIndex={highlight?.section === 'admin' ? highlight.index : null}
                        />
                    </div>
                )}

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
