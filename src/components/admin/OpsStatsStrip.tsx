import { Calendar, MessageSquare, Radio, Users } from 'lucide-react';

interface OpsStatsStripProps {
    sessionCount: number;
    eventCount: number;
    feedbackCount: number;
    tickerConfigured: boolean;
}

const StatTile = ({
    label,
    value,
    icon,
    accent = 'text-emerald-600 dark:text-court-accent',
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent?: string;
}) => (
    <div className="rounded-xl border border-gray-200/80 bg-[#FAF8F3]/80 px-4 py-3 dark:border-chalk/10 dark:bg-court-950/50">
        <div className={`mb-2 flex items-center gap-2 ${accent}`}>{icon}</div>
        <p className="font-display text-2xl text-wimbledon-navy dark:text-chalk">{value}</p>
        <p className="hud-label mt-1 text-gray-400 dark:text-chalk/40">{label}</p>
    </div>
);

const OpsStatsStrip = ({
    sessionCount,
    eventCount,
    feedbackCount,
    tickerConfigured,
}: OpsStatsStripProps) => (
    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile
            label="Live sessions"
            value={sessionCount}
            icon={<Users className="h-4 w-4" />}
        />
        <StatTile
            label="Active events"
            value={eventCount}
            icon={<Calendar className="h-4 w-4" />}
        />
        <StatTile
            label="Feedback queue"
            value={feedbackCount}
            icon={<MessageSquare className="h-4 w-4" />}
            accent="text-clay-600 dark:text-clay-300"
        />
        <StatTile
            label="Club wire"
            value={tickerConfigured ? 'Live' : 'Off'}
            icon={<Radio className="h-4 w-4" />}
            accent={tickerConfigured ? 'text-emerald-600 dark:text-court-accent' : 'text-gray-400 dark:text-chalk/30'}
        />
    </div>
);

export default OpsStatsStrip;
