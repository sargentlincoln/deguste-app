import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHighlights, getPromotions, getVideos, getRankedCategories } from '@/lib/api/restaurants';
import { Restaurant, Coupon, Video, RankedCategory } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { isRestaurantOpen, getProminentHighlight } from '@/lib/restaurantUtils';
import { getCoverPhotoUrl, parsePhotos } from '@/lib/photoUtils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { StarRating } from '@/components/StarRating';
import MapWrapper from '@/components/MapWrapper';
import NotificationModal from '@/components/NotificationModal';

export default function Home() {
  const { user } = useAuth();
  const { latitude, longitude, setCoordinates, closestCity, closestState, availableLocations } = useLocation();
  const [highlights, setHighlights] = useState<Restaurant[]>([]);
  const [promotions, setPromotions] = useState<Coupon[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [rankings, setRankings] = useState<RankedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [hasManuallySelected, setHasManuallySelected] = useState(false);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // GPS auto-fill removed — user must select city manually

  // Helper to get best available coordinates — prioritizes real GPS, falls back to city center
  const getCityCoords = () => {
    // Use real GPS location when available
    if (latitude != null && longitude != null) {
      return { lat: latitude, lng: longitude };
    }
    // Fallback to selected city center coords
    const stateObj = availableLocations.find(l => l.state === selectedState);
    const city = stateObj?.cities.find(c => c.name === selectedCity);
    return city ? { lat: city.lat, lng: city.lng } : { lat: -23.0333, lng: -45.5500 };
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const c = getCityCoords();
      navigate(`/search/results?q=${encodeURIComponent(searchQuery.trim())}&city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}&lat=${c.lat}&lng=${c.lng}`);
    }
  };

  const handleVoiceResult = useCallback((text: string) => {
    setSearchQuery(text);
    const stateObj = availableLocations.find(l => l.state === selectedState);
    const city = stateObj?.cities.find(c => c.name === selectedCity);
    const lat = city?.lat ?? -23.0333;
    const lng = city?.lng ?? -45.5500;
    navigate(`/search/results?q=${encodeURIComponent(text)}&city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}&lat=${lat}&lng=${lng}`);
  }, [navigate, selectedCity, selectedState, availableLocations]);

  const { isListening, startListening: startVoiceSearch } = useVoiceSearch(handleVoiceResult);

  useEffect(() => {
    async function fetchData() {
      try {
        const coords = getCityCoords();
        const fetchLat = coords.lat;
        const fetchLng = coords.lng;

        const [h, p, v, rk] = await Promise.all([
          getHighlights(fetchLat, fetchLng),
          getPromotions(fetchLat, fetchLng),
          getVideos(fetchLat, fetchLng),
          getRankedCategories(fetchLat, fetchLng)
        ]);
        setHighlights(h);
        setPromotions(p);
        setVideos(v);
        setRankings(rk);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-primary">
        <span className="material-icons animate-spin text-4xl">autorenew</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header Stats & Notifications — Compact */}
      <header className="pt-4 px-5 pb-0 flex items-center justify-between relative z-20">
        <div className="flex gap-2 w-full pr-4">
          <div className="bg-white dark:bg-[#1A1A24] rounded-xl px-3 py-2 flex items-center gap-2.5 h-[50px] shadow-[0_2px_12px_rgba(34,197,94,0.15)] dark:shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-500/30 dark:border-green-500/20 flex-1 relative overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/10 dark:from-green-500/30 dark:to-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[16px]">💰</span>
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[9px] text-green-600/70 dark:text-green-400/70 font-bold tracking-wider uppercase leading-none">Economizou</span>
              <span className="text-[14px] font-black leading-tight bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-500 tracking-tight">
                {user?.stats.total_savings ? `R$ ${user.stats.total_savings.toFixed(2).replace('.', ',')}` : 'R$ 0'}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1A1A24] rounded-xl px-3 py-2 flex items-center gap-2.5 h-[50px] shadow-[0_2px_12px_rgba(249,115,22,0.15)] dark:shadow-[0_0_15px_rgba(249,115,22,0.2)] border border-orange-500/30 dark:border-orange-500/20 flex-1 relative overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/10 dark:from-orange-500/30 dark:to-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[16px]">🔥</span>
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[9px] text-orange-600/70 dark:text-orange-400/70 font-bold tracking-wider uppercase leading-none">Sequência</span>
              <span className="text-[14px] font-black leading-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 tracking-tight">{user?.stats.current_streak || 0} dias.</span>
            </div>
          </div>
        </div>

        {/* Notification Icon */}
        <button
          onClick={() => setIsNotificationModalOpen(true)}
          className="relative flex-shrink-0 w-10 h-10 bg-white dark:bg-[#1A1A24] rounded-full flex items-center justify-center shadow-sm border border-border-light dark:border-white/10 active:scale-95 transition-transform"
        >
          <span className="material-icons text-gray-600 dark:text-gray-300">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-[#1A1A24] rounded-full flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </span>
          )}
        </button>
      </header>

      {/* Hero Text */}
      <section className="px-5 space-y-0.5 text-center pt-2">
        <h1 className="text-[36px] sm:text-[42px] font-black leading-[1.05] tracking-tight drop-shadow-sm flex flex-col items-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-text-dark via-text-dark to-primary dark:from-white dark:via-white dark:to-primary whitespace-nowrap">Descubra sabores</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-text-dark via-text-dark to-primary dark:from-white dark:via-white dark:to-primary whitespace-nowrap">Viva experiências</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-[13px] font-medium leading-relaxed">
          Encontre, compare e escolha em segundos
        </p>
      </section>

      {/* Search Bar */}
      <section className="px-5 space-y-3">
        <div className="relative group mt-2">
          <div className="relative bg-white dark:bg-[#1A1A24] rounded-2xl flex items-center pl-3 pr-1.5 shadow-[0_0_25px_rgba(242,13,13,0.2)] dark:shadow-[0_0_35px_rgba(242,13,13,0.35)] border-2 border-primary/60 focus-within:border-primary focus-within:shadow-[0_0_30px_rgba(242,13,13,0.4)] transition-all h-[80px] w-full animate-[pulse_3s_ease-in-out_infinite]">
            <img src="/logo.png" alt="Deguste" className="w-[26px] h-[26px] object-contain flex-shrink-0 animate-pulse drop-shadow-[0_0_10px_rgba(242,13,13,0.6)] dark:drop-shadow-[0_0_12px_rgba(242,13,13,0.9)]" />
            <input
              className="bg-transparent border-none text-text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 w-full flex-1 focus:ring-0 text-[15px] sm:text-[17px] tracking-tight font-bold ml-2 h-full pr-1 text-left focus:outline-none"
              placeholder="Pra onde iremos hoje?"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
            />
            <div className="flex-shrink-0 flex items-center gap-1 mr-0.5">
              <button
                onClick={startVoiceSearch}
                className={`${isListening ? 'bg-red-600 animate-pulse scale-110' : 'bg-primary/10 dark:bg-primary/20'} h-[48px] w-[48px] rounded-full flex items-center justify-center hover:bg-primary/30 transition-all active:scale-95`}
              >
                <span className={`material-icons ${isListening ? 'text-white' : 'text-primary'} text-[24px]`}>mic</span>
              </button>
              <button
                onClick={() => { if (searchQuery.trim()) { const c = getCityCoords(); navigate(`/search/results?q=${encodeURIComponent(searchQuery.trim())}&city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}&lat=${c.lat}&lng=${c.lng}`); } }}
                className="bg-primary h-[48px] w-[48px] rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors hover:scale-105 active:scale-95 shadow-red-900/40"
              >
                <span className="material-icons text-white text-[26px]">arrow_forward</span>
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2 italic">
            Diga o que quiser: <span className="font-semibold text-gray-500 dark:text-gray-400">"Sushi bom e barato perto de mim"</span>
          </p>
        </div>

        {/* Location Selectors */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="relative group">
            <select
              className="w-full bg-white dark:bg-[#1a1a24] dark:glass-select-minimal text-text-dark dark:text-white border border-border-light dark:border-white/10 text-xs rounded-xl py-3 pl-4 pr-10 appearance-none focus:ring-1 focus:ring-primary focus:border-primary font-bold tracking-wider text-center transition-all shadow-card-light dark:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer uppercase"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setHasManuallySelected(true);
                const stateObj = availableLocations.find(l => l.state === e.target.value);
                const firstCity = stateObj?.cities[0];
                if (firstCity) {
                  setSelectedCity(firstCity.name);
                  setCoordinates(firstCity.lat, firstCity.lng);
                }
              }}
            >
              {availableLocations.length > 0 ? (
                <>
                  <option className="bg-white dark:bg-card-dark text-text-dark dark:text-white" value="" disabled>ESTADO...</option>
                  {availableLocations.map(loc => (
                    <option key={loc.state} className="bg-white dark:bg-card-dark text-text-dark dark:text-white" value={loc.state}>
                      {loc.state}
                    </option>
                  ))}
                </>
              ) : (
                <option className="bg-white dark:bg-card-dark text-text-dark dark:text-white" value="">ESTADO...</option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-[18px]">expand_more</span>
            </div>
          </div>
          <div className="relative group">
            <select
              className="w-full bg-white dark:bg-[#1a1a24] dark:glass-select-minimal text-text-dark dark:text-white border border-border-light dark:border-white/10 text-xs rounded-xl py-3 pl-4 pr-10 appearance-none focus:ring-1 focus:ring-primary focus:border-primary font-bold tracking-wider text-center transition-all shadow-card-light dark:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer uppercase"
              value={selectedCity}
              onChange={(e) => {
                setHasManuallySelected(true);
                const stateObj = availableLocations.find(l => l.state === selectedState);
                const coords = stateObj?.cities.find(c => c.name === e.target.value);
                if (coords) {
                  setSelectedCity(coords.name);
                  setCoordinates(coords.lat, coords.lng);
                } else {
                  setSelectedCity(e.target.value);
                }
              }}
            >
              <option className="bg-white dark:bg-card-dark text-text-dark dark:text-white" value="" disabled>CIDADE...</option>
              {availableLocations.find(l => l.state === selectedState)?.cities.map(city => (
                <option key={city.name} className="bg-white dark:bg-card-dark text-text-dark dark:text-white" value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-[18px]">expand_more</span>
            </div>
          </div>
        </div>

        {/* Food Categories */}
        <div className="pt-3">
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { icon: '🍣', name: 'Japonesa', query: 'Japonesa' },
              { icon: '🍔', name: 'Lanches', query: 'Hamburgueria' },
              { icon: '🍕', name: 'Pizzaria', query: 'Pizzaria' },
              { icon: '🥩', name: 'Brasileira', query: 'Brasileira' },
              { icon: '☕', name: 'Cafés', query: 'Cafeteria' },
              { icon: '🍺', name: 'Bares', query: 'Bar' },
              { icon: '🍦', name: 'Sorvetes', query: 'Sorveteria' },
            ].map((cat, i) => {
              const c = getCityCoords();
              return (
                <Link
                  key={i}
                  to={`/search/results?q=${encodeURIComponent(cat.query)}&cuisines=${encodeURIComponent(cat.query)}&city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}&lat=${c.lat}&lng=${c.lng}`}
                  className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0 w-[72px]"
                >
                  <div className="w-[72px] h-[72px] bg-white dark:bg-[#1A1A24] rounded-3xl flex items-center justify-center shadow-card-light dark:shadow-soft border border-border-light dark:border-white/5 group-hover:border-primary/50 dark:group-hover:border-primary/50 group-hover:bg-gray-50 dark:group-hover:bg-[#20202A] transition-all active:scale-95">
                    <span className="text-3xl drop-shadow-md transform group-hover:scale-110 transition-transform">{cat.icon}</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-white transition-colors text-center leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Occasion Icons */}
        <div className="pt-1">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">Para qual ocasião?</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { icon: '💑', name: 'Romântico', query: 'lugar romântico para jantar a dois' },
              { icon: '👨‍👩‍👧‍👦', name: 'Em Família', query: 'restaurante para ir com a família e crianças' },
              { icon: '🎉', name: 'Aniversário', query: 'lugar para comemorar aniversário com amigos' },
              { icon: '💼', name: 'Executivo', query: 'restaurante executivo para almoço comercial' },
              { icon: '🍻', name: 'Happy Hour', query: 'bar para happy hour com drinks e petiscos' },
              { icon: '🌅', name: 'Brunch', query: 'cafeteria para brunch ou café da manhã' },
              { icon: '🏖️', name: 'Ar Livre', query: 'restaurante ao ar livre com área externa' },
              { icon: '🐶', name: 'Pet Friendly', query: 'lugar pet friendly que aceita animais' },

            ].map((occ, i) => {
              const c = getCityCoords();
              return (
                <Link
                  key={`occ-${i}`}
                  to={`/search/results?q=${encodeURIComponent(occ.query)}&city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}&lat=${c.lat}&lng=${c.lng}`}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1A1A24] border border-border-light dark:border-white/10 rounded-full px-3 py-2 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 active:scale-95 transition-all flex-shrink-0 group"
                >
                  <span className="text-base">{occ.icon}</span>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-white transition-colors whitespace-nowrap">{occ.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-5 space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="h-[1px] bg-border-light dark:bg-white/10 flex-1"></div>
          <h2 className="text-xs font-bold tracking-widest text-[#d4af37] dark:text-gold-accent uppercase flex items-center gap-1 shadow-glow-gold/30">
            <span className="material-icons text-sm">star</span> DESTAQUES
          </h2>
          <div className="h-[1px] bg-border-light dark:bg-white/10 flex-1"></div>
        </div>

        {highlights.map(restaurant => (
          <Link to={`/restaurant/${restaurant.id}`} key={restaurant.id} className="block">
            <div className="bg-white dark:bg-card-dark rounded-xl p-3 flex gap-4 shadow-card-light dark:shadow-soft border border-border-light dark:border-white/5 relative overflow-hidden active:scale-[0.98] transition-transform">
              <div className="absolute top-0 right-0 bg-gold-accent text-white dark:text-black text-[10px] font-black px-2 py-1 rounded-bl-lg z-10">DESTAQUE</div>
              <div className="relative w-24 h-24 flex-shrink-0">
                <img alt={restaurant.name} className="w-full h-full object-cover rounded-lg shadow-sm" src={getCoverPhotoUrl(restaurant.photos)} />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center justify-between pr-6">
                    <h3 className="text-text-dark dark:text-white font-bold text-base">{restaurant.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <StarRating rating={restaurant.rating_avg} showNumber={true} size="xs" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({restaurant.rating_count})</span>
                    </div>
                    {restaurant.distance_meters !== undefined && (
                      <>
                        <span className="text-gray-400 dark:text-gray-600 text-[10px]">•</span>
                        <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
                          <span className="material-icons text-[10px]">location_on</span>
                          <span className="text-[10px] font-medium font-mono">
                            {restaurant.distance_meters < 1000
                              ? `${Math.round(restaurant.distance_meters)}m`
                              : `${(restaurant.distance_meters / 1000).toFixed(1)}km`}
                          </span>
                        </div>
                      </>
                    )}
                    <span className="text-gray-400 dark:text-gray-600 text-[10px]">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{'💰'.repeat(restaurant.price_level)}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-1">{restaurant.categories?.join(' • ')}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  {(() => {
                    const status = isRestaurantOpen(restaurant);
                    return status.isOpen ? (
                      <span className="text-green-600 dark:text-green-400 text-[10px] font-bold bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-500/30">Aberto</span>
                    ) : status.opensAt ? (
                      <span className="text-red-600 dark:text-red-400 text-[10px] font-bold bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-500/30">Fechado</span>
                    ) : null;
                  })()}
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const highlight = getProminentHighlight(restaurant.attributes);
                      if (!highlight) return null;
                      return (
                        <span className="text-primary dark:text-red-400 text-[9px] font-bold bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          {highlight}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Promotions */}
      <section className="px-5 space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-2 drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(242,13,13,0.5)]">
            <span className="material-icons text-sm">local_offer</span> Promoções do Dia
          </h2>
          <button className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter hover:text-primary transition-colors">Ver tudo</button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex-shrink-0 w-52 space-y-2 group">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-border-light dark:border-white/10 shadow-card-light dark:shadow-soft ring-1 ring-black/5 dark:ring-white/5">
                {/* Mock image because Coupon type doesn't have image, we'd typically join with Restaurant */}
                <img alt={promo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 hover:opacity-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjKgIAdex2vnLwgqLtU35n9fqJuIKk9X-52tZJz_Ssf1Mr6--CzU0sJxODPnknxiU-gcHc36sIjqV63qBwAK_GsZbhRugakmDrUmlOThfTt1zmKOMc-w2tdNl6Xvw_FJfdV8kXj_tdkO2x8ee8AlEzoK5LFd62gwR83Rqfw7FjXt2PJtU2zU9ImEVCHNenm1KO7Mr-azy8D0w9LimnKhtus0FdI6aWChjV4Pgz-PmYtDNLC4eaQq05qhGnWq-OYHRItF5U8WaNk1t5" />
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                  <span className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg">
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `R$ ${promo.discount_value} OFF`}
                  </span>
                  {(() => {
                    if (!promo.valid_until) return null;
                    const expiry = new Date(promo.valid_until);
                    const now = new Date();
                    const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
                    if (hoursLeft > 0 && hoursLeft <= 24) {
                      return (
                        <span className="bg-[#FF2E00] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider animate-pulse border border-white/20">
                          {hoursLeft <= 3 ? '⏰ Acaba logo!' : '⏳ Acaba Hoje'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent dark:from-black dark:via-black/80 dark:to-transparent">
                  <p className="text-white font-bold text-lg leading-tight">{promo.title}</p>
                  <p className="text-gray-200 dark:text-gray-300 text-xs font-medium mt-0.5 line-clamp-2">{promo.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🏆 Rankings da Cidade */}
      {
        rankings.length > 0 && (
          <section className="px-5 space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-[1px] bg-border-light dark:bg-white/10 flex-1"></div>
              <h2 className="text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-1 drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(242,13,13,0.5)]">
                <span className="material-icons text-sm">emoji_events</span> Rankings da Cidade
              </h2>
              <div className="h-[1px] bg-border-light dark:bg-white/10 flex-1"></div>
            </div>

            {rankings.map((ranking, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-dark dark:text-white flex items-center gap-2">
                    <span className="text-lg">{ranking.emoji}</span> {ranking.title}
                  </h3>
                  <Link
                    to={`/search/results?q=${encodeURIComponent(ranking.categoryFilter || 'restaurantes')}&city=${encodeURIComponent(selectedCity)}&lat=${getCityCoords().lat}&lng=${getCityCoords().lng}`}
                    className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter hover:text-primary transition-colors"
                  >
                    Ver tudo
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
                  {ranking.restaurants.map((restaurant, pos) => (
                    <Link
                      to={`/restaurant/${restaurant.id}`}
                      key={restaurant.id}
                      className="flex-shrink-0 w-[160px] bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-card-light dark:shadow-soft border border-border-light dark:border-white/5 active:scale-[0.98] transition-transform group relative"
                    >
                      {/* Position Badge */}
                      <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white/20 text-white text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                        {pos + 1}º
                      </div>
                      <div className="h-24 w-full relative">
                        <img
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={getCoverPhotoUrl(restaurant.photos)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                        {/* Status Open/Closed */}
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                          {(() => {
                            const status = isRestaurantOpen(restaurant);
                            return status.isOpen ? (
                              <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider">Aberto</span>
                            ) : status.opensAt ? (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider">Fechado</span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="p-2.5 pb-2">
                        <h4 className="text-xs font-bold text-text-dark dark:text-white truncate">{restaurant.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <StarRating rating={restaurant.rating_avg} showNumber={true} size="xs" />
                          <span className="text-[9px] text-gray-500">({restaurant.rating_count})</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 mb-1.5">
                          <span className="text-[10px] text-gray-500">{'💰'.repeat(restaurant.price_level)}</span>
                          <span className="text-gray-400 text-[8px]">•</span>
                          <span className="text-[10px] text-gray-500 truncate">{restaurant.categories?.[0]}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const highlight = getProminentHighlight(restaurant.attributes);
                            if (!highlight) return null;
                            return (
                              <span className="text-primary dark:text-red-400 text-[8px] font-bold bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 px-1 rounded flex items-center h-4 shadow-sm line-clamp-1 truncate w-full max-w-full">
                                {highlight}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      }

      {/* Viral Shorts */}
      <section className="px-5 space-y-4 pt-2 mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-2 drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(242,13,13,0.5)]">
            <span className="material-icons text-sm">whatshot</span> VIRAIS DA SEMANA
          </h2>
          <button className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter hover:text-primary transition-colors">Ver Feed</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
            {videos.map((video) => (
              <Link to={`/restaurant/${video.restaurant_id}`} key={video.id} className="block flex-shrink-0 w-[140px] h-[220px] relative rounded-2xl overflow-hidden group shadow-card-light dark:shadow-soft border border-border-light dark:border-white/5 active:scale-95 transition-transform cursor-pointer">
                <img alt={video.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" src={video.thumbnail_url} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent dark:from-black/90 dark:via-black/30 pointer-events-none"></div>

                {/* View count indicator */}
                <div className="absolute top-2 right-2 bg-black/50 dark:bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 flex items-center gap-1 border border-white/20 dark:border-white/10 z-10 pointer-events-none">
                  <span className="material-icons text-[10px] text-primary">play_arrow</span>
                  <span className="text-[10px] text-white font-medium">{video.views_count ? (video.views_count > 1000 ? `${(video.views_count / 1000).toFixed(1)}k` : video.views_count) : '10k'}</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                  {/* Restaurant info snippet if available */}
                  {video.restaurant && (
                    <div className="flex items-center gap-1 mb-1.5 opacity-90">
                      <img src={video.thumbnail_url} className="w-4 h-4 rounded-full border border-white/50 object-cover" />
                      <span className="text-[9px] font-bold text-white truncate drop-shadow-md">{video.restaurant.name}</span>
                    </div>
                  )}
                  <p className="text-white font-black text-sm leading-tight drop-shadow-lg line-clamp-3 leading-snug">{video.title}</p>
                  <p className="text-gray-200 dark:text-gray-300 text-[10px] mt-1 line-clamp-1 drop-shadow-md">{video.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Map — Real Static Google Maps Image */}
      <section className="px-5 space-y-4 pt-2 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-text-dark dark:text-white uppercase flex items-center gap-2">
            📖 EXPLORAR
          </h2>
          <Link to="/map" className="text-[10px] text-gray-500 dark:text-gray-400 font-medium hover:text-primary transition-colors flex items-center gap-1">
            VER MAPA COMPLETO <span className="material-icons text-[10px]">arrow_forward</span>
          </Link>
        </div>
        <Link to="/map" className="block w-full h-[200px] bg-white dark:bg-[#121216] rounded-xl overflow-hidden relative shadow-card-light dark:shadow-soft border border-border-light dark:border-white/10 group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 pointer-events-none opacity-90 group-hover:scale-105 transition-transform duration-500">
            <MapWrapper
              latitude={getCityCoords().lat}
              longitude={getCityCoords().lng}
              name="Home Map"
            >
              <div /> {/* Dummy child to disable default marker */}
            </MapWrapper>
          </div>
          {/* "You are here" pulsing pin */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="relative">
              <div className="absolute -inset-3 bg-primary/20 rounded-full animate-ping"></div>
              <span className="material-icons text-primary text-4xl drop-shadow-[0_2px_8px_rgba(242,13,13,0.6)]">location_on</span>
            </div>
          </div>
          <div className="absolute bottom-3 right-3">
            <button className="bg-white dark:bg-card-dark text-primary text-[11px] font-bold px-3 py-1.5 rounded-full shadow-card-light dark:shadow-lg flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-primary/20 dark:border-primary/30">
              <span className="material-icons text-[14px]">my_location</span> Perto de mim
            </button>
          </div>
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="material-icons text-[12px] text-green-400">circle</span> Sua localização
          </div>
        </Link>
      </section>

      {/* Notification Modal */}
      {user && (
        <NotificationModal
          userId={user.id}
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}
