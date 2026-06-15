/** White stacked Duke / Fuqua / Racquets Club mark — transparent PNG for dark backgrounds */
export const LOGO_DARK = '/logo_dark.png';

/** Navy stacked mark for light backgrounds */
export const LOGO_LIGHT = '/logo_light.png';

export const logoSrcForTheme = (theme: 'light' | 'dark') =>
    theme === 'dark' ? LOGO_DARK : LOGO_LIGHT;

/** Stacked crest is tall — always use height + auto width, never square crops */
export const LOGO_CLASS = {
    nav: 'h-12 w-auto object-contain md:h-14',
    footer: 'h-14 w-auto object-contain',
    login: 'mx-auto mb-2 h-32 w-auto max-w-[220px] object-contain',
    preloader: 'h-16 w-auto object-contain md:h-20',
} as const;
