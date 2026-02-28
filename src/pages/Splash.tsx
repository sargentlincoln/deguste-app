import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Splash() {
    const navigate = useNavigate();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-between bg-[#0A0A0F] overflow-hidden select-none">
            {/* Full background image from design */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-0">
                <img
                    src="/logo.png"
                    alt="Deguste Logo"
                    className="w-48 h-auto object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                />
            </div>
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

            {/* Top spacer */}
            <div></div>

            {/* Center content — logo area is already in the image */}
            <div className="relative z-10 flex flex-col items-center"></div>

            {/* Bottom CTA */}
            <div
                className={`relative z-10 w-full px-8 pb-14 transition-all duration-[1000ms] delay-500 ease-out ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
            >
                <button
                    onClick={() => navigate('/shorts')}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold text-lg px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)] active:scale-[0.97] transition-all"
                >
                    Começar a Explorar
                    <span className="material-icons text-primary text-xl">arrow_forward</span>
                </button>
            </div>
        </div>
    );
}
