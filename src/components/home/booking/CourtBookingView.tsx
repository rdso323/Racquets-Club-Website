import CourtDiagram, { type CourtDiagramProps } from '../CourtDiagram';
import CourtRosterCompact from '../CourtRosterCompact';

export const CourtBookingView = (props: CourtDiagramProps) => (
    <>
        <div className="lg:hidden">
            <CourtRosterCompact {...props} />
        </div>
        <div className="hidden lg:block">
            <CourtDiagram {...props} />
        </div>
    </>
);
