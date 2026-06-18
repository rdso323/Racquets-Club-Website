import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { filterMembers, type ClubMember } from '../../lib/members';

export interface MemberDraft {
    name: string;
    uid?: string;
    email?: string;
}

interface MemberLookupInputProps {
    value: string;
    members: ClubMember[];
    placeholder?: string;
    onChange: (draft: MemberDraft) => void;
    className?: string;
}

const MemberLookupInput = ({
    value,
    members,
    placeholder = 'Search members or type a name...',
    onChange,
    className = '',
}: MemberLookupInputProps) => {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const suggestions = useMemo(() => filterMembers(members, value), [members, value]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const pickMember = (member: ClubMember) => {
        onChange({ name: member.name, uid: member.uid, email: member.email });
        setOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (text: string) => {
        onChange({ name: text });
        setOpen(text.trim().length > 0);
        setActiveIndex(-1);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open || suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            pickMember(suggestions[activeIndex]);
        } else if (event.key === 'Escape') {
            setOpen(false);
            setActiveIndex(-1);
        }
    };

    return (
        <div ref={rootRef} className={`relative min-w-0 flex-grow ${className}`}>
            <input
                type="text"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => value.trim() && setOpen(true)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-gray-350 bg-white p-2 text-xs text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
            />

            {open && suggestions.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute bottom-full z-20 mb-1 max-h-44 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-carbon"
                >
                    {suggestions.map((member, index) => (
                        <li key={`${member.uid}-${member.email}`} role="option" aria-selected={index === activeIndex}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickMember(member)}
                                className={`flex w-full flex-col px-3 py-2 text-left text-xs transition-colors ${
                                    index === activeIndex
                                        ? 'bg-court-accent/15 text-gray-900 dark:text-chalk'
                                        : 'text-gray-800 hover:bg-gray-50 dark:text-chalk/90 dark:hover:bg-chalk/5'
                                }`}
                            >
                                <span className="font-semibold">{member.name}</span>
                                {member.email && (
                                    <span className="mt-0.5 text-[10px] text-gray-400 dark:text-chalk/45">
                                        {member.email}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MemberLookupInput;
