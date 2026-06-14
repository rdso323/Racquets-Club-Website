import { useRef, type ReactNode, type CSSProperties } from 'react';
import {
    motion,
    useMotionValue,
    useSpring,
    useScroll,
    useVelocity,
    useTransform,
    useAnimationFrame,
    useInView,
} from 'framer-motion';

export const RevealLines = ({
    lines,
    className = '',
    lineClassName = '',
    delay = 0,
    once = true,
}: {
    lines: ReactNode[];
    className?: string;
    lineClassName?: string;
    delay?: number;
    once?: boolean;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once, margin: '-10% 0px' });

    return (
        <div ref={ref} className={className}>
            {lines.map((line, i) => (
                <div key={i} className="overflow-hidden">
                    <motion.div
                        className={lineClassName}
                        initial={{ y: '110%', rotate: 2 }}
                        animate={inView ? { y: '0%', rotate: 0 } : { y: '110%', rotate: 2 }}
                        transition={{
                            duration: 0.9,
                            ease: [0.16, 1, 0.3, 1],
                            delay: delay + i * 0.09,
                        }}
                    >
                        {line}
                    </motion.div>
                </div>
            ))}
        </div>
    );
};

const wrap = (min: number, max: number, v: number) => {
    const range = max - min;
    return ((((v - min) % range) + range) % range) + min;
};

export const VelocityMarquee = ({
    children,
    baseVelocity = 2.4,
    className = '',
    itemClassName = '',
    copies = 4,
    style,
    skew = true,
    velocityBoost = 1.2,
}: {
    children: ReactNode;
    baseVelocity?: number;
    className?: string;
    itemClassName?: string;
    copies?: number;
    style?: CSSProperties;
    skew?: boolean;
    velocityBoost?: number;
}) => {
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 380 });
    const velocityFactor = useTransform(smoothVelocity, [0, 1200], [0, velocityBoost], { clamp: true });
    const skewX = useTransform(smoothVelocity, [-1500, 1500], skew ? [4, -4] : [0, 0]);
    const directionFactor = useRef<number>(1);

    const period = 100 / copies;
    const x = useTransform(baseX, (v) => `${wrap(-period, 0, v)}%`);

    useAnimationFrame((_, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
        const vf = velocityFactor.get();
        if (vf < 0) directionFactor.current = -1;
        else if (vf > 0) directionFactor.current = 1;
        moveBy += directionFactor.current * moveBy * Math.abs(vf);
        baseX.set(baseX.get() + moveBy);
    });

    return (
        <div className={`overflow-hidden whitespace-nowrap ${className}`} style={style}>
            <motion.div className="inline-flex w-max will-change-transform" style={{ x, skewX }}>
                {Array.from({ length: copies }).map((_, i) => (
                    <div key={i} className={`flex-shrink-0 ${itemClassName}`} aria-hidden={i > 0}>
                        {children}
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
