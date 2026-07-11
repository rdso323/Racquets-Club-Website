import type { ReactNode } from 'react';

interface BookingCardGridProps {
    children: ReactNode;
    className?: string;
}

/** Single-column stack on mobile; two-column grid from md up. */
const BookingCardGrid = ({ children, className = '' }: BookingCardGridProps) => (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-6 ${className}`}>
        {children}
    </div>
);

export default BookingCardGrid;
