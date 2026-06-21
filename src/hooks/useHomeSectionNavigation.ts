import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { HOME_SECTION_IDS, type HomeSectionId } from '../lib/siteNav';

export const isHomeSectionHash = (hash: string): hash is `#${HomeSectionId}` =>
    HOME_SECTION_IDS.some((id) => hash === `#${id}`);

export const useHomeSectionNavigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const lenis = useLenis();

    const scrollToHomeSection = useCallback(
        (sectionId: HomeSectionId) => {
            const scroll = () => {
                const el = document.getElementById(sectionId);
                if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
            };

            if (location.pathname !== '/') {
                navigate(`/#${sectionId}`);
                return;
            }

            scroll();
        },
        [lenis, location.pathname, navigate],
    );

    return { scrollToHomeSection };
};
