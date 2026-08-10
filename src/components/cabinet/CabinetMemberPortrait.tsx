import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { CabinetMember } from '../../lib/cabinet';
import { getSportTheme } from '../../lib/sports';

interface CabinetMemberPortraitProps {
    member: CabinetMember;
    size?: 'featured' | 'standard';
    index?: number;
}

const accentForMember = (member: CabinetMember): string => {
    if (member.sport) return getSportTheme(member.sport).accentLight;
    if (member.role === 'Treasury') return '#C9A84C'; // wimbledon-gold
    return '#001A57'; // wimbledon-navy
};

const CabinetMemberPortrait = ({
    member,
    size = 'standard',
    index = 0,
}: CabinetMemberPortraitProps) => {
    const prefersReducedMotion = useReducedMotion();
    const [imgFailed, setImgFailed] = useState(false);
    const accent = accentForMember(member);
    const featured = size === 'featured';

    return (
        <motion.article
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
                duration: 0.65,
                delay: prefersReducedMotion ? 0 : index * 0.07,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="group flex flex-col"
        >
            <div
                className={`relative overflow-hidden bg-gray-100 dark:bg-court-900 ${
                    featured ? 'aspect-[4/5]' : 'aspect-[4/5]'
                }`}
            >
                <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 z-10 h-0.5 transition-opacity duration-300"
                    style={{ backgroundColor: accent }}
                />
                {!imgFailed ? (
                    <img
                        src={member.photo}
                        alt={`${member.name}, ${member.role}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-cover object-top transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 via-[#F3F0E8] to-orange-50/60 dark:from-court-900 dark:via-court-950 dark:to-court-900"
                        aria-hidden="true"
                    >
                        <span className="font-display text-4xl text-wimbledon-navy/70 dark:text-court-accent/80 md:text-5xl">
                            {member.initials}
                        </span>
                    </div>
                )}
            </div>

            <div className={`mt-4 ${featured ? 'md:mt-5' : ''}`}>
                <p className="hud-label text-court-accent">{member.role}</p>
                <h3
                    className={`mt-1.5 font-display tracking-tight text-gray-900 dark:text-chalk ${
                        featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
                    }`}
                >
                    {member.name}
                </h3>
                {member.sport && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-chalk/50">{member.sport}</p>
                )}
            </div>
        </motion.article>
    );
};

export default CabinetMemberPortrait;
