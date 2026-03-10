
import SocialHub from '../components/home/SocialHub';
import BookingEngine from '../components/home/BookingEngine';

const Home = () => {
    return (
        <div className="space-y-16 pb-16">
            <header className="mb-8 relative">
                <h1 className="text-4xl md:text-5xl font-light text-wimbledon-navy tracking-tight mb-2">
                    Welcome to the Club
                </h1>
                <p className="text-gray-500 text-lg max-w-2xl leading-relaxed">
                    Your central hub for Fuqua Racquets news, social events, and court bookings. Connect with players across all racquet sports at Fuqua.
                </p>
            </header>

            <SocialHub>
                <BookingEngine />
            </SocialHub>
        </div>
    );
};

export default Home;
