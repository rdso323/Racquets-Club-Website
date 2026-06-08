
import SocialHub from '../components/home/SocialHub';
import BookingEngine from '../components/home/BookingEngine';
import { ArrowRight, ChevronRight } from 'lucide-react';

const Home = () => {
    return (
        <div className="space-y-12">
            <section className="px-4 md:px-8 mt-12 mb-20 max-w-7xl mx-auto flex">
                <div className="relative w-full rounded-3xl overflow-hidden min-h-[350px] flex items-center p-8 md:p-12 bg-gradient-to-br from-[#0e1320] via-[#0A0F1C] to-[#001A57] shadow-xl group">
                    {/* Decorative Glows inside Hero */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-wimbledon-green-accent/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-wimbledon-gold/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

                    {/* Core Content */}
                    <div className="relative z-10 w-full max-w-4xl space-y-6 animate-fade-in">
                        <span className="inline-block py-1 px-3 rounded-full bg-wimbledon-gold/20 text-wimbledon-gold text-xs font-bold tracking-wider mb-2">
                            ESTABLISHED 1924
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-2">
                            Welcome to <br />the Club.
                        </h1>
                        <p className="text-lg md:text-xl font-light text-blue-100/90 dark:text-gray-300 max-w-3xl leading-relaxed">
                            The Racquets Club aims to create a sense of community by providing a place for all racquet sports players (tennis, pickleball, squash, and more) and of all levels the opportunity to play and socialize. We host hitting events and social events to bring together members of the Fuqua community, Duke community, and greater Durham community.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button className="forest-gradient px-8 py-4 rounded-xl text-white font-bold text-lg hover:scale-105 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2">
                                Book a Court
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button className="text-white hover:text-gray-200 px-8 py-3 font-semibold transition-colors flex items-center justify-center">
                                View Schedule <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <SocialHub>
                <BookingEngine />
            </SocialHub>
        </div>
    );
};

export default Home;
