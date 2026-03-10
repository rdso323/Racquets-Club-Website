import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';

const Login = () => {
    const { signInWithEmail, signUpWithEmail, error } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSignUp) {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4 text-center">
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
                <img
                    src="/new_logo.png"
                    alt="Fuqua Racquets Club Logo"
                    className="mx-auto h-56 w-auto -mb-6 object-contain"
                />
                <h1 className="text-3xl font-light text-wimbledon-navy mb-2 tracking-tight -mt-4">
                    Digital Clubhouse
                </h1>
                <p className="text-gray-500 mb-6 text-sm">
                    Exclusive access for Fuqua members.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center text-left">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email (@duke.edu)"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center bg-wimbledon-navy hover:bg-[#00287a] text-white py-3 px-4 rounded-xl transition duration-300 ease-in-out font-medium mt-6"
                    >
                        {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 flex justify-between text-sm">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-wimbledon-navy hover:underline focus:outline-none"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
                    Trouble logging in? Contact the admin.
                </div>
            </div>
        </div>
    );
};

export default Login;
