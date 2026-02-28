import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useLocation } from '@/contexts/LocationContext';
import MapWrapper from '@/components/MapWrapper';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Base states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [openNow, setOpenNow] = useState(searchParams.get('open_now') === 'true');
  const [distance, setDistance] = useState(parseInt(searchParams.get('distance') || '50'));

  const { latitude, longitude, closestCity, closestState, availableLocations } = useLocation();

  // Location states
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
  const [userLat, setUserLat] = useState<string | null>(searchParams.get('lat') || (latitude ? latitude.toString() : null));
  const [userLng, setUserLng] = useState<string | null>(searchParams.get('lng') || (longitude ? longitude.toString() : null));

  // Filter states
  const activePriceStr = searchParams.get('price');
  const [activePrice, setActivePrice] = useState(activePriceStr ? parseInt(activePriceStr) - 1 : -1);

  const initialCuisines = searchParams.get('cuisines');
  const [activeCuisines, setActiveCuisines] = useState<string[]>(initialCuisines ? initialCuisines.split(',') : []);

  const initialFeatures = searchParams.get('features');
  const [activeDiffs, setActiveDiffs] = useState<string[]>(initialFeatures ? initialFeatures.split(',') : []);

  const initialVibes = searchParams.get('vibes');
  const [activeVibes, setActiveVibes] = useState<string[]>(initialVibes ? initialVibes.split(',') : []);

  // Special states
  const [isPerola, setIsPerola] = useState(searchParams.get('is_perola') === 'true');
  const [hasPromotions, setHasPromotions] = useState(searchParams.get('promotions') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'popularity');

  useEffect(() => {
    if (!userLat || !userLng) {
      if (latitude && longitude) {
        setUserLat(latitude.toString());
        setUserLng(longitude.toString());
      }
    }
  }, [latitude, longitude, userLat, userLng]);

  useEffect(() => {
    if (!searchParams.get('state') && closestState && !selectedState) {
      setSelectedState(closestState);
    }
    if (!searchParams.get('city') && closestCity && !selectedCity) {
      setSelectedCity(closestCity);
    }
  }, [closestState, closestCity, searchParams, selectedState, selectedCity]);

  const handleVoiceResult = useCallback((text: string) => {
    setQuery(text);
    const params = new URLSearchParams();
    if (text.trim()) params.set('q', text.trim());
    if (openNow) params.set('open_now', 'true');
    if (distance) params.set('distance', distance.toString());
    if (activePrice >= 0) params.set('price', (activePrice + 1).toString());
    if (activeCuisines.length > 0) params.set('cuisines', activeCuisines.join(','));
    if (activeDiffs.length > 0) params.set('features', activeDiffs.join(','));
    if (activeVibes.length > 0) params.set('vibes', activeVibes.join(','));
    if (selectedState) params.set('state', selectedState);
    if (selectedCity) params.set('city', selectedCity);
    if (isPerola) params.set('is_perola', 'true');
    if (hasPromotions) params.set('promotions', 'true');
    if (userLat) params.set('lat', userLat);
    if (userLng) params.set('lng', userLng);
    if (sortBy && sortBy !== 'popularity') params.set('sort_by', sortBy);
    navigate(`/search/results?${params.toString()}`);
  }, [navigate, openNow, distance, activePrice, activeCuisines, activeDiffs, activeVibes, selectedState, selectedCity, isPerola, hasPromotions, userLat, userLng]);

  const { isListening, startListening: startVoiceSearch } = useVoiceSearch(handleVoiceResult);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (openNow) params.set('open_now', 'true');
    if (distance) params.set('distance', distance.toString());
    if (activePrice >= 0) params.set('price', (activePrice + 1).toString());
    if (activeCuisines.length > 0) params.set('cuisines', activeCuisines.join(','));
    if (activeDiffs.length > 0) params.set('features', activeDiffs.join(','));
    if (activeVibes.length > 0) params.set('vibes', activeVibes.join(','));
    if (selectedState) params.set('state', selectedState);
    if (selectedCity) params.set('city', selectedCity);
    if (isPerola) params.set('is_perola', 'true');
    if (hasPromotions) params.set('promotions', 'true');
    if (userLat) params.set('lat', userLat);
    if (userLng) params.set('lng', userLng);
    if (sortBy && sortBy !== 'popularity') params.set('sort_by', sortBy);

    navigate(`/search/results?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleCuisine = (name: string) => {
    setActiveCuisines(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const toggleDiff = (label: string) => {
    setActiveDiffs(prev =>
      prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]
    );
  };

  const toggleVibe = (label: string) => {
    setActiveVibes(prev =>
      prev.includes(label) ? prev.filter(v => v !== label) : [...prev, label]
    );
  };

  const filterCount = activeCuisines.length + activeDiffs.length + activeVibes.length + (activePrice >= 0 ? 1 : 0) + (openNow ? 1 : 0) + (isPerola ? 1 : 0) + (hasPromotions ? 1 : 0) + (selectedState ? 1 : 0) + (selectedCity ? 1 : 0);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
      <header className="pt-12 pb-2 px-6 flex flex-col sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <Link to="/home" className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-dark transition-colors">
            <span className="material-icons text-2xl">arrow_back</span>
          </Link>
          <h1 className="text-lg font-bold text-center tracking-tight text-gray-900 dark:text-white">Buscar & Filtrar</h1>
          <div className="w-10"></div>
        </div>
        <div className="relative w-full mb-2">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
            <span className="material-icons text-gray-400 text-2xl">search</span>
          </div>
          <input
            className="w-full pl-14 pr-[90px] py-4 bg-gray-100 dark:bg-surface-dark border border-primary/30 focus:border-primary/80 shadow-[0_0_15px_-3px_rgba(216,100,100,0.1)] focus:shadow-[0_0_20px_-3px_rgba(216,100,100,0.25)] rounded-2xl text-base text-gray-900 dark:text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:outline-none transition-all h-14"
            placeholder="Qual a aventura de hoje? 🚀"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button onClick={startVoiceSearch} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}>
              <span className="material-icons text-xl">mic</span>
            </button>
            <button onClick={handleSearch} className="w-10 h-10 flex items-center justify-center bg-primary/10 hover:bg-primary/20 rounded-full text-primary transition-colors">
              <span className="material-icons text-xl">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-32 pt-4 space-y-8 overflow-y-auto no-scrollbar">
        <section>
          <div className="flex items-center justify-between py-2 px-4 bg-gray-100 dark:bg-surface-dark rounded-lg border border-gray-200 dark:border-gray-800/60 shadow-sm h-12">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full ${openNow ? 'bg-green-500/20 ring-1 ring-green-500/50' : 'bg-green-500/10 ring-1 ring-green-500/30'}`}>
                <span className="material-symbols-outlined text-green-500 text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Abertos Agora</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer scale-[0.75] origin-right">
              <input type="checkbox" className="sr-only peer" checked={openNow} onChange={() => setOpenNow(!openNow)} />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500 shadow-inner"></div>
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2"><span className="material-icons text-sm">map</span> 6 restaurantes no mapa</span>
          </div>
          <div className="relative w-full h-[280px] rounded-2xl overflow-hidden shadow-lg shadow-black/40 pointer-events-none select-none">
            <MapWrapper
              latitude={parseFloat(userLat || String(latitude || -23.0333))}
              longitude={parseFloat(userLng || String(longitude || -45.5500))}
              name="Search Map"
              radius={distance * 1000}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative w-1/3">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  const firstCity = availableLocations.find(l => l.state === e.target.value)?.cities[0];
                  setSelectedCity(firstCity ? firstCity.name : '');
                }}
                className="w-full appearance-none bg-gray-100 dark:bg-surface-dark text-gray-800 dark:text-gray-200 text-sm font-medium py-3.5 px-4 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none border border-transparent dark:border-gray-800 focus:border-primary/50 transition-colors"
                style={{ paddingRight: '2rem' }}
              >
                <option value="">Estado</option>
                {availableLocations.map((loc) => (
                  <option key={loc.state} value={loc.state}>{loc.state}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <span className="material-icons text-gray-500 text-sm">expand_more</span>
              </div>
            </div>
            <div className="relative w-2/3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full appearance-none bg-gray-100 dark:bg-surface-dark text-gray-800 dark:text-gray-200 text-sm font-medium py-3.5 px-4 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none border border-transparent dark:border-gray-800 focus:border-primary/50 transition-colors"
                style={{ paddingRight: '2rem' }}
                disabled={!selectedState}
              >
                <option value="">Cidade</option>
                {availableLocations.find(l => l.state === selectedState)?.cities.map(city => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <span className="material-icons text-gray-500 text-sm">expand_more</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Distância Máxima</h2>
            <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Até {distance} km</span>
          </div>
          <div className="relative w-full h-12 flex items-center">
            <div className="absolute w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden"></div>
            <div className="absolute h-2 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-l-full z-10" style={{ width: `${(distance / 50) * 100}%`, boxShadow: "0 0 10px rgba(236,72,153,0.5)" }}></div>
            <div className="absolute transform -translate-x-1/2 w-7 h-7 bg-gradient-to-br from-primary to-purple-600 rounded-full border-[3px] border-surface-dark shadow-[0_0_15px_rgba(216,100,100,0.6)] z-20 pointer-events-none flex items-center justify-center" style={{ left: `${(distance / 50) * 100}%` }}>
              <div className="w-2 h-2 bg-white/40 rounded-full"></div>
            </div>
            <input
              className="absolute w-full h-full opacity-0 cursor-pointer z-30"
              type="range"
              min="1"
              max="50"
              value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-xs font-medium text-gray-400">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Faixa de Preço</h2>
          </div>
          <div className="grid grid-cols-5 gap-2 w-full p-1 rounded-lg">
            {[
              { label: "$", sub: "até\nR$30" },
              { label: "$$", sub: "R$30\n–60" },
              { label: "$$$", sub: "R$60\n–100" },
              { label: "$$$$", sub: "R$100\n–180" },
              { label: "$$$$$", sub: "R$180\n+" },
            ].map((price, i) => (
              <div key={i} className="flex flex-col items-center gap-1 group">
                <button
                  onClick={() => setActivePrice(i === activePrice ? -1 : i)}
                  className={`w-full h-11 flex items-center justify-center text-sm font-medium rounded-xl transition-all ${i === activePrice ? 'text-white bg-primary shadow-[0_0_15px_rgba(216,100,100,0.4)] ring-1 ring-primary/50 transform scale-105 font-bold' : 'text-gray-500 bg-gray-200 dark:bg-surface-dark/60 border border-transparent dark:border-gray-800 hover:bg-gray-300 dark:hover:bg-white/5 glass-chip'}`}
                >
                  {price.label}
                </button>
                <span className={`text-[10px] text-center font-medium leading-tight ${i === activePrice ? 'text-primary font-semibold' : 'text-gray-500'}`}>
                  {price.sub.split('\n').map((line, j) => <span key={j} className="block">{line}</span>)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tipo de Cozinha</h2>
            <button onClick={() => setActiveCuisines([])} className="text-xs text-primary hover:text-primary-hover font-semibold tracking-wide uppercase transition-colors">Limpar</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Brasileira', 'Japonesa', 'Pizzaria', 'Hamburgueria', 'Bar', 'Cafeteria', 'Sorveteria', 'Padaria', 'Lanchonete', 'Fast Food'].map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => toggleCuisine(cuisine)}
                className={`flex items-center ${activeCuisines.includes(cuisine) ? 'justify-between' : 'justify-center'} px-4 py-3.5 rounded-xl border transition-all transform active:scale-[0.98] ${activeCuisines.includes(cuisine)
                  ? 'glass-chip-active text-primary dark:text-white border-primary/40 shadow-lg shadow-primary/10 bg-primary/10'
                  : 'glass-chip bg-gray-200 dark:bg-surface-dark/60 text-gray-600 dark:text-gray-400 border-transparent dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
              >
                <span className="text-sm font-medium tracking-wide">{cuisine}</span>
                {activeCuisines.includes(cuisine) && (
                  <span className="material-icons text-sm bg-white/20 rounded-full p-0.5">check</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Vibes e Ocasiões</h2>
            <button onClick={() => setActiveVibes([])} className="text-xs text-primary hover:text-primary-hover font-semibold tracking-wide uppercase transition-colors">Limpar</button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: '🥂', label: 'Romântico' },
              { icon: '👨‍👩‍👧', label: 'Família' },
              { icon: '💼', label: 'Negócios' },
              { icon: '🍻', label: 'Happy Hour' },
              { icon: '🎸', label: 'Agito' },
              { icon: '🤫', label: 'Tranquilo' },
              { icon: '🌿', label: 'Ar Livre' },
              { icon: '🎯', label: 'Descontraído' },
            ].map((vibe, i) => (
              <button
                key={i}
                onClick={() => toggleVibe(vibe.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-xs font-medium border ${activeVibes.includes(vibe.label)
                  ? 'bg-surface-active text-white shadow-[0_0_10px_rgba(216,100,100,0.3)] border-primary/50'
                  : 'bg-gray-200 dark:bg-surface-dark text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/80 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
              >
                <span className="text-sm">{vibe.icon}</span> {vibe.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Diferenciais</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: '🐾', label: 'Pet Friendly' },
              { icon: '👶', label: 'Área Kids' },
              { icon: '🌿', label: 'Área Verde' },
              { icon: '📡', label: 'Wi-Fi' },
              { icon: '🔥', label: 'Fogão a Lenha' },
              { icon: '🅿️', label: 'Estacionamento' },
              { icon: '🍷', label: 'Carta de Vinhos' },
              { icon: '🎵', label: 'Música ao Vivo' },
              { icon: '🛵', label: 'Delivery' },
              { icon: '🌱', label: 'Opções Veganas' },
              { icon: '♿', label: 'Acessível' },
              { icon: '📅', label: 'Aceita Reserva' },
            ].map((diff, i) => (
              <button
                key={i}
                onClick={() => toggleDiff(diff.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-xs font-medium border ${activeDiffs.includes(diff.label)
                  ? 'bg-surface-active text-white shadow-[0_0_10px_rgba(216,100,100,0.3)] border-primary/50'
                  : 'bg-gray-200 dark:bg-surface-dark text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/80 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
              >
                <span className="text-sm">{diff.icon}</span> {diff.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sort By */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Ordenar por</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'popularity', label: '🔥 Mais Popular' },
              { key: 'rating', label: '⭐ Melhor Avaliado' },
              { key: 'distance', label: '📍 Mais Próximo' },
              { key: 'price', label: '💰 Mais Barato' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all transform active:scale-[0.98] ${sortBy === opt.key
                  ? 'glass-chip-active text-primary dark:text-white border-primary/40 shadow-lg shadow-primary/10 bg-primary/10'
                  : 'glass-chip bg-gray-200 dark:bg-surface-dark/60 text-gray-600 dark:text-gray-400 border-transparent dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Especial</h2>
          <div className="space-y-3">
            <button
              onClick={() => setIsPerola(!isPerola)}
              className={`w-full flex items-center justify-between px-5 py-4 border rounded-2xl group transition-all ${isPerola ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-500/5 dark:bg-emerald-900/10 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl drop-shadow-sm">💎</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-tight">Pérolas Escondidas</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500/60 font-medium">Restaurantes exclusivos bem avaliados</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isPerola ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-500/30 group-hover:border-emerald-500 bg-emerald-500/5'}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm transition-opacity ${isPerola ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
              </div>
            </button>
            <button
              onClick={() => setHasPromotions(!hasPromotions)}
              className={`w-full flex items-center justify-between px-5 py-4 border rounded-2xl group transition-all ${hasPromotions ? 'bg-orange-500/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-orange-500/5 dark:bg-orange-900/10 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/30'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl drop-shadow-sm">🔥</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 tracking-tight">Com Promoção</p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-500/60 font-medium">Descontos e vantagens</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${hasPromotions ? 'border-orange-500 bg-orange-500/20' : 'border-orange-500/30 group-hover:border-orange-500 bg-orange-500/5'}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-orange-500 transition-opacity shadow-sm ${hasPromotions ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
              </div>
            </button>
          </div>
        </section>

        <div className="relative w-full mt-4 mb-1 px-1">
          <button onClick={handleSearch} className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-[#e25a5a] to-[#d86464] text-white font-bold text-lg shadow-[0_0_25px_rgba(216,100,100,0.5)] hover:shadow-[0_0_35px_rgba(216,100,100,0.6)] active:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10">
            <span>Aplicar Filtros</span>
            <span className="bg-white text-primary px-2.5 py-0.5 rounded-full text-sm font-extrabold shadow-sm">{filterCount}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
