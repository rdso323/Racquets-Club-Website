const pulseBlock = 'animate-pulse rounded-lg bg-gray-200/80 dark:bg-chalk/10';

const OpenPlayCardSkeleton = () => (
    <div
        className="booking-card flex h-full w-[min(calc(100vw-2.5rem),28rem)] shrink-0 snap-start flex-col overflow-hidden md:w-full md:shrink"
        aria-hidden
    >
        <div className="border-b border-gray-200/80 p-4 dark:border-chalk/10 md:p-6">
            <div className={`${pulseBlock} mb-3 h-5 w-24`} />
            <div className={`${pulseBlock} mb-2 h-7 w-3/4`} />
            <div className={`${pulseBlock} mb-4 h-4 w-1/2`} />
            <div className={`${pulseBlock} h-4 w-full`} />
            <div className={`${pulseBlock} mt-4 h-1.5 w-full rounded-full`} />
        </div>
        <div className="flex flex-grow flex-col gap-4 p-4 md:p-5">
            <div className={`${pulseBlock} h-36 w-full`} />
            <div className={`${pulseBlock} h-36 w-full`} />
            <div className={`${pulseBlock} mt-2 h-11 w-full`} />
        </div>
    </div>
);

const ClinicCardSkeleton = () => (
    <div className="booking-card flex h-full w-full flex-col overflow-hidden" aria-hidden>
        <div className="border-b border-gray-200/80 p-4 dark:border-chalk/10 md:p-6">
            <div className={`${pulseBlock} mb-3 h-5 w-28`} />
            <div className={`${pulseBlock} mb-2 h-7 w-2/3`} />
            <div className={`${pulseBlock} mb-4 h-4 w-1/3`} />
            <div className={`${pulseBlock} h-4 w-full`} />
            <div className={`${pulseBlock} mt-4 h-1.5 w-full rounded-full`} />
        </div>
        <div className="flex flex-grow flex-col gap-4 p-4 md:p-5">
            <div className={`${pulseBlock} h-44 w-full`} />
            <div className={`${pulseBlock} h-11 w-full`} />
        </div>
    </div>
);

const BookingCardSkeleton = () => (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading sessions">
        <div className="-mx-5 overflow-hidden px-5 md:mx-0 md:px-0">
            <div className="flex gap-6 md:grid md:grid-cols-2 md:gap-6">
                <OpenPlayCardSkeleton />
                <OpenPlayCardSkeleton />
            </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-6">
            <ClinicCardSkeleton />
        </div>
    </div>
);

export default BookingCardSkeleton;
