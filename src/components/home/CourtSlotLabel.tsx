/** First token on the top line, everything after it on the smaller line. */
export const splitCourtSlotName = (name: string): { first: string; last: string } => {
    const trimmed = name.trim();
    const space = trimmed.indexOf(' ');
    if (space === -1) return { first: trimmed, last: '' };
    return { first: trimmed.slice(0, space), last: trimmed.slice(space + 1).trim() };
};

/** Centered first name with the rest of the name smaller underneath. */
const CourtSlotLabel = ({ name, truncate = true }: { name: string; truncate?: boolean }) => {
    const { first, last } = splitCourtSlotName(name);
    const line = truncate ? 'max-w-full truncate' : 'whitespace-nowrap';

    return (
        <span className="flex min-w-0 max-w-full flex-col items-center text-center leading-tight">
            <span className={`${line} font-semibold`}>{first}</span>
            {last ? <span className={`${line} text-[0.85em] font-medium opacity-80`}>{last}</span> : null}
        </span>
    );
};

export default CourtSlotLabel;
