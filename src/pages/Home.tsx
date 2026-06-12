import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import Hero from '../components/home/Hero';
import LiveWire from '../components/system/LiveWire';
import Manifesto from '../components/home/Manifesto';
import Disciplines from '../components/home/Disciplines';
import CourtRadar from '../components/booking/CourtRadar';
import Transmissions from '../components/home/Transmissions';
import Footer from '../components/home/Footer';

/*
 * INDEX — one continuous descent:
 * cathedral → wire → creed → arsenal → radar → transmissions → credits.
 */
const Home = () => {
    const location = useLocation();
    const lenis = useLenis();

    // deep-link support for "/#radar" arrivals via the menu
    useEffect(() => {
        if (location.hash === '#radar') {
            const t = window.setTimeout(() => {
                const el = document.getElementById('radar');
                if (el) lenis?.scrollTo(el, { duration: 1.6, offset: -10 });
            }, 900);
            return () => window.clearTimeout(t);
        }
    }, [location.hash, lenis]);

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <Hero />
            <LiveWire />
            <Manifesto />
            <Disciplines />
            <CourtRadar />
            <Transmissions />
            <LiveWire flipped />
            <Footer />
        </motion.main>
    );
};

export default Home;
