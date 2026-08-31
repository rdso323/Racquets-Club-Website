export interface FuquaConnectAddress {
    name?: string | null;
    line1?: string | null;
    address?: string | null;
}

export interface FuquaConnectEventRecord {
    id?: number;
    name?: string;
    imageUrl?: string;
    startsOn?: string;
    endsOn?: string;
    address?: FuquaConnectAddress | null;
}

export interface FuquaConnectImportPayload {
    title: string;
    dateISO: string;
    date: string;
    startTime: string;
    endTime: string;
    time: string;
    location: string;
    image: string;
    link: string;
    fuquaConnectEventId: number;
}

const FUQUA_CONNECT_HOST = 'fuquaconnect.duke.edu';
const EVENT_PATH_RE = /^\/event\/(\d+)\/?$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const normalizeFuquaConnectUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('Paste a Fuqua Connect event URL.');
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed: URL;
    try {
        parsed = new URL(withProtocol);
    } catch {
        throw new Error('That does not look like a valid URL.');
    }
    if (parsed.hostname.toLowerCase() !== FUQUA_CONNECT_HOST) {
        throw new Error('Only fuquaconnect.duke.edu event links are supported.');
    }
    if (!EVENT_PATH_RE.test(parsed.pathname)) {
        throw new Error('URL must point to a Fuqua Connect event (…/event/12345678).');
    }
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
};

export const parseIsoDateTimeParts = (iso: string): { dateISO: string; time24: string } => {
    const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!match) throw new Error(`Could not parse datetime: ${iso}`);
    return { dateISO: match[1], time24: `${match[2]}:${match[3]}` };
};

const formatDisplayDate = (dateISO: string): string => {
    const parts = dateISO.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateISO;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const formatDisplayTime = (time24: string): string => {
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    const hour24 = Number(match[1]);
    const minute = Number(match[2]);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${pad2(minute)} ${period}`;
};

const formatDisplayTimeRange = (startTime: string, endTime?: string): string => {
    if (endTime) return `${formatDisplayTime(startTime)} – ${formatDisplayTime(endTime)}`;
    return formatDisplayTime(startTime);
};

const resolveLocation = (address?: FuquaConnectAddress | null): string => {
    if (!address) return '';
    const name = address.name?.trim();
    const line = address.line1?.trim() || address.address?.trim();
    if (name && line && name !== line) return `${name} — ${line}`;
    return name || line || '';
};

const resolveImageUrl = (imageUrl?: string): string => {
    if (!imageUrl?.trim()) return '';
    const url = imageUrl.trim();
    if (url.includes('preset=')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}preset=med-w`;
};

export const extractFuquaConnectEvent = (html: string): FuquaConnectEventRecord => {
    const marker = 'window.initialAppState = ';
    const start = html.indexOf(marker);
    if (start === -1) {
        throw new Error('Could not read event data from Fuqua Connect (page layout may have changed).');
    }

    const jsonStart = html.indexOf('{', start + marker.length);
    if (jsonStart === -1) {
        throw new Error('Could not read event data from Fuqua Connect.');
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;

    for (let i = jsonStart; i < html.length; i += 1) {
        const ch = html[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') depth += 1;
        if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                jsonEnd = i;
                break;
            }
        }
    }

    if (jsonEnd === -1) {
        throw new Error('Could not parse Fuqua Connect page data.');
    }

    const state = JSON.parse(html.slice(jsonStart, jsonEnd + 1)) as {
        preFetchedData?: { event?: FuquaConnectEventRecord };
    };
    const event = state.preFetchedData?.event;
    if (!event?.name || !event.startsOn) {
        throw new Error('This Fuqua Connect page does not include public event details.');
    }
    return event;
};

export const mapFuquaConnectEvent = (
    event: FuquaConnectEventRecord,
    canonicalUrl: string,
): FuquaConnectImportPayload => {
    const eventIdMatch = canonicalUrl.match(EVENT_PATH_RE);
    const fuquaConnectEventId = eventIdMatch ? Number(eventIdMatch[1]) : event.id ?? 0;

    const start = parseIsoDateTimeParts(event.startsOn!);
    const end = event.endsOn ? parseIsoDateTimeParts(event.endsOn) : null;

    return {
        title: event.name.trim(),
        dateISO: start.dateISO,
        date: formatDisplayDate(start.dateISO),
        startTime: start.time24,
        endTime: end?.time24 ?? '',
        time: formatDisplayTimeRange(start.time24, end?.time24),
        location: resolveLocation(event.address),
        image: resolveImageUrl(event.imageUrl),
        link: canonicalUrl,
        fuquaConnectEventId,
    };
};

export const fetchFuquaConnectImport = async (rawUrl: string): Promise<FuquaConnectImportPayload> => {
    const canonicalUrl = normalizeFuquaConnectUrl(rawUrl);
    const response = await fetch(canonicalUrl, {
        headers: {
            Accept: 'text/html',
            'User-Agent': 'FuquaRacquetsClub-EventImport/1.0',
        },
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Fuqua Connect returned ${response.status}. Is the event public?`);
    }

    const html = await response.text();
    if (html.includes('app/login') && !html.includes('preFetchedData')) {
        throw new Error('This event is not publicly visible on Fuqua Connect.');
    }

    const event = extractFuquaConnectEvent(html);
    return mapFuquaConnectEvent(event, canonicalUrl);
};
