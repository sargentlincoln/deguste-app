import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Restaurant } from '@/lib/types';
import { useLocation } from '@/contexts/LocationContext';
import { getCoverPhotoUrl, parsePhotos } from '@/lib/photoUtils';
import { isRestaurantOpen, getPriceSymbols } from '@/lib/restaurantUtils';
import MapWrapper from '@/components/MapWrapper';
import { AdvancedMarker } from '@vis.gl/react-google-maps';

export default function MapExplore() {
    const { latitude, longitude } = useLocation();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const filters = [
        { id: 'famosos', label: '⭐ Mais Famosos' },
        { id: 'escondidos', label: '💎 Escondidinhos' },
        { id: 'rodizio', label: '🍕 Rodízios' },
        { id: 'barato', label: '💰 Mais Baratos' },
        { id: 'japonesa', label: '🍣 Japonesa' },
        { id: 'brasileira', label: '🥩 Brasileira' },
        { id: 'lanches', label: '🍔 Lanches' }
    ];

    const filteredRestaurants = React.useMemo(() => {
        if (!activeFilter) return restaurants;
        return restaurants.filter(r => {
            switch (activeFilter) {
                case 'famosos':
                    return r.rating_count > 100 && r.rating_avg >= 4.5;
                case 'escondidos':
                    return r.rating_count < 50 && r.rating_avg >= 4.6;
                case 'rodizio':
                    return r.categories.some(c => c.toLowerCase().includes('rodízio')) ||
                        (r.description && r.description.toLowerCase().includes('rodízio'));
                case 'barato':
                    return r.price_level === 1;
                case 'japonesa':
                    return r.categories.some(c => c.toLowerCase().includes('japon') || c.toLowerCase().includes('sushi'));
                case 'brasileira':
                    return r.categories.some(c => c.toLowerCase().includes('brasil') || c.toLowerCase().includes('churras'));
                case 'lanches':
                    return r.categories.some(c => c.toLowerCase().includes('hamburg') || c.toLowerCase().includes('lanche'));
                default:
                    return true;
            }
        });
    }, [restaurants, activeFilter]);

    useEffect(() => {
        async function fetchRestaurants() {
            setLoading(true);
            try {
                if (!supabase) return;

                const userLat = latitude || -23.0333;
                const userLng = longitude || -45.5500;

                // Try RPC first
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_nearby_restaurants', {
                    user_lat: userLat,
                    user_lng: userLng,
                });

                if (rpcData && rpcData.length > 0) {
                    console.log(`MapExplore: RPC returned ${rpcData.length} restaurants`);
                    setRestaurants(rpcData as Restaurant[]);
                    return;
                }

                if (rpcError) {
                    console.warn('MapExplore RPC error:', rpcError.message);
                }

                // Fallback: fetch all active restaurants and filter by proximity client-side
                console.log('MapExplore: RPC returned empty, using fallback query');
                const { data: allData, error: allError } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('status', 'active');

                if (allError) {
                    console.error('MapExplore fallback error:', allError.message);
                    return;
                }

                if (allData && allData.length > 0) {
                    // Calculate distance, then sort primarily by rating count (descending) 
                    // and secondarily by distance to prioritize famous places
                    const withDistance = (allData as Restaurant[]).map(r => {
                        const dLat = (r.lat - userLat) * 111.32;
                        const dLng = (r.lng - userLng) * 111.32 * Math.cos(userLat * Math.PI / 180);
                        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
                        return { ...r, distance_meters: Math.round(distKm * 1000) };
                    });

                    const nearby = withDistance.filter(r => r.distance_meters <= 50000); // 50km radius

                    // Sort descending by rating_count, then ascending by distance
                    nearby.sort((a, b) => {
                        if (b.rating_count !== a.rating_count) {
                            return b.rating_count - a.rating_count;
                        }
                        return a.distance_meters - b.distance_meters;
                    });

                    console.log(`MapExplore: Fallback found ${nearby.length} restaurants within 50km`);
                    setRestaurants(nearby.slice(0, 100));
                }
            } catch (err) {
                console.error('Error fetching restaurants for map:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchRestaurants();
    }, [latitude, longitude]);

    const defaultCenter = latitude && longitude
        ? { lat: latitude, lng: longitude }
        : { lat: -23.0333, lng: -45.5500 };

    return (
        <div className="h-screen w-full flex flex-col bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="px-5 py-4 flex items-center gap-3 relative z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-border-light dark:border-white/5 safe-top">
                <button className="text-gray-800 dark:text-white hover:text-primary transition-colors" onClick={() => window.history.back()}>
                    <span className="material-symbols-outlined shrink-0 text-2xl font-light">arrow_back_ios_new</span>
                </button>
                <div className="space-y-0.5 flex-1">
                    <h1 className="text-gray-900 dark:text-white font-bold text-lg leading-none tracking-tight">Mapa de Experiências</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                        {loading ? 'Carregando...' : `${filteredRestaurants.length} locais encontrados`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedRestaurant(null)}
                        className="p-2 rounded-full bg-white dark:bg-card-dark border border-border-light dark:border-white/10 shadow-sm hover:border-primary/50 transition-colors"
                    >
                        <span className="material-icons text-gray-600 dark:text-gray-400 text-xl">my_location</span>
                    </button>
                </div>
            </header>

            {/* Filter Chips */}
            <div className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-white/5 relative z-20">
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeFilter === f.id
                                ? 'bg-primary border-primary text-white shadow-md'
                                : 'bg-white dark:bg-card-dark border-border-light dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-primary/50'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 w-full relative">
                <MapWrapper latitude={defaultCenter.lat} longitude={defaultCenter.lng} name="Sua Localização">
                    {filteredRestaurants.map(r => (
                        <AdvancedMarker
                            key={r.id}
                            position={{ lat: r.lat, lng: r.lng }}
                            onClick={() => setSelectedRestaurant(r)}
                        >
                            <div className={`transition-all duration-200 ${selectedRestaurant?.id === r.id ? 'scale-125 z-50' : 'hover:scale-110'}`}>
                                <div className={`flex flex-col items-center ${selectedRestaurant?.id === r.id ? 'drop-shadow-[0_0_12px_rgba(242,13,13,0.6)]' : ''}`}>
                                    {/* Pin label */}
                                    {selectedRestaurant?.id === r.id && (
                                        <div className="bg-primary text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-lg mb-1 whitespace-nowrap max-w-[120px] truncate">
                                            {r.name}
                                        </div>
                                    )}
                                    {/* Pin icon */}
                                    <div className={`${selectedRestaurant?.id === r.id ? 'bg-primary border-white' : 'bg-primary/90 border-white/40'} text-white p-2 rounded-full shadow-lg border-[3px] flex items-center justify-center cursor-pointer`}>
                                        <span className="material-icons text-white text-base">restaurant</span>
                                    </div>
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}
                </MapWrapper>

                {/* Bottom Info Card */}
                {selectedRestaurant && (
                    <div className="absolute bottom-4 left-4 right-4 z-30 animate-slide-up">
                        <div className="bg-white dark:bg-[#1A1A24] rounded-2xl shadow-2xl border border-border-light dark:border-white/10 overflow-hidden">
                            <div className="flex gap-0">
                                {/* Photo */}
                                <div className="w-28 h-32 flex-shrink-0 relative">
                                    <img
                                        src={getCoverPhotoUrl(selectedRestaurant.photos)}
                                        alt={selectedRestaurant.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10"></div>
                                    {/* Open/Closed badge */}
                                    {(() => {
                                        const s = isRestaurantOpen(selectedRestaurant);
                                        return s.isOpen ? (
                                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/90 text-white shadow-sm">
                                                Aberto
                                            </span>
                                        ) : (
                                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/90 text-white shadow-sm">
                                                Fechado
                                            </span>
                                        );
                                    })()}
                                </div>
                                {/* Info */}
                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                    <div>
                                        <h3 className="text-text-dark dark:text-white font-bold text-sm leading-tight truncate">{selectedRestaurant.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-0.5">
                                                <span className="material-icons text-yellow-500 text-[12px]">star</span>
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedRestaurant.rating_avg}</span>
                                                <span className="text-[10px] text-gray-400">({selectedRestaurant.rating_count})</span>
                                            </div>
                                            <span className="text-emerald-500 dark:text-emerald-400 text-xs font-bold">{getPriceSymbols(selectedRestaurant.price_level)}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {selectedRestaurant.categories?.join(' • ')}
                                        </p>
                                        {selectedRestaurant.distance_meters !== undefined && (
                                            <p className="text-[10px] text-primary font-semibold mt-0.5">
                                                📍 {selectedRestaurant.distance_meters < 1000 ? `${Math.round(selectedRestaurant.distance_meters)}m` : `${(selectedRestaurant.distance_meters / 1000).toFixed(1)} km`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Link
                                            to={`/restaurant/${selectedRestaurant.id}`}
                                            className="flex-1 bg-primary text-white text-[11px] font-bold py-2 rounded-lg text-center hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-1"
                                        >
                                            <span className="material-icons-round text-[14px]">restaurant_menu</span>
                                            Perfil
                                        </Link>
                                        <Link
                                            to={`/explore?restaurant_id=${selectedRestaurant.id}`}
                                            className="flex-1 bg-gray-900 dark:bg-black border border-gray-800 dark:border-white/10 text-white text-[11px] font-bold py-2 rounded-lg text-center hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-1"
                                        >
                                            <span className="material-icons-round text-[16px] text-primary">play_circle</span>
                                            Shorts
                                        </Link>
                                        <button
                                            onClick={() => setSelectedRestaurant(null)}
                                            className="px-2.5 py-2 rounded-lg border border-border-light dark:border-white/10 text-gray-500 dark:text-gray-400 text-[11px] font-medium hover:border-primary/50 transition-colors bg-white dark:bg-card-dark"
                                        >
                                            <span className="material-icons-round text-[14px]">close</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
