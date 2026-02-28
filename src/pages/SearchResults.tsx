import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { searchRestaurants } from '@/lib/api/search';
import { Restaurant, RestaurantWithDish } from '@/lib/types';
import { isRestaurantOpen, getPriceRangeText, getPriceSymbols, getProminentHighlight } from '@/lib/restaurantUtils';
import { getCoverPhotoUrl, parsePhotos } from '@/lib/photoUtils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { StarRating } from '@/components/StarRating';

// Global cache to prevent re-fetching when navigating back from details page
let globalSearchCache: {
  queryString: string;
  results: RestaurantWithDish[];
  aiInterpretation: string | null;
} | null = null;

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const distanceStr = searchParams.get('distance');
  const priceStr = searchParams.get('price');
  const cuisinesStr = searchParams.get('cuisines');
  const featuresStr = searchParams.get('features');
  const openStr = searchParams.get('open_now');
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const isPerolaStr = searchParams.get('is_perola');
  const promoStr = searchParams.get('promotions');
  const stateStr = searchParams.get('state');
  const cityStr = searchParams.get('city');

  const [results, setResults] = useState<RestaurantWithDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

  // Local Modal States
  const [modalOpenNow, setModalOpenNow] = useState(openStr === 'true');
  const [modalDistance, setModalDistance] = useState(distanceStr ? parseInt(distanceStr) : 50);
  const [modalPrice, setModalPrice] = useState(priceStr ? parseInt(priceStr) - 1 : -1);
  const [modalPromotions, setModalPromotions] = useState(promoStr === 'true');
  const [modalIsPerola, setModalIsPerola] = useState(isPerolaStr === 'true');
  const [modalVideo, setModalVideo] = useState(false);
  const [modalFeatures, setModalFeatures] = useState<string[]>(featuresStr ? featuresStr.split(',') : []);
  const [modalQuery, setModalQuery] = useState(query);
  const [modalCuisines, setModalCuisines] = useState<string[]>(cuisinesStr ? cuisinesStr.split(',') : []);
  const [modalSortBy, setModalSortBy] = useState(searchParams.get('sort_by') || 'popularity');

  const handleVoiceResult = useCallback((text: string) => {
    setModalQuery(text);
  }, []);
  const { isListening, startListening: startVoiceSearch } = useVoiceSearch(handleVoiceResult);

  useEffect(() => {
    if (showFilterModal) {
      setModalOpenNow(openStr === 'true');
      setModalDistance(distanceStr ? parseInt(distanceStr) : 50);
      setModalPrice(priceStr ? parseInt(priceStr) - 1 : -1);
      setModalPromotions(promoStr === 'true');
      setModalIsPerola(isPerolaStr === 'true');
      setModalFeatures(featuresStr ? featuresStr.split(',') : []);
      setModalQuery(query);
      setModalCuisines(cuisinesStr ? cuisinesStr.split(',') : []);
    }
  }, [showFilterModal, openStr, distanceStr, priceStr, promoStr, isPerolaStr, featuresStr, query, cuisinesStr]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (modalQuery.trim()) params.set('q', modalQuery.trim());
    if (modalCuisines.length > 0) params.set('cuisines', modalCuisines.join(','));
    if (modalOpenNow) params.set('open_now', 'true');
    if (modalDistance !== 50) params.set('distance', modalDistance.toString());
    if (modalPrice >= 0) params.set('price', (modalPrice + 1).toString());
    if (modalPromotions) params.set('promotions', 'true');
    if (modalIsPerola) params.set('is_perola', 'true');
    if (modalFeatures.length > 0) params.set('features', modalFeatures.join(','));
    if (modalSortBy && modalSortBy !== 'popularity') params.set('sort_by', modalSortBy);
    // Preserve location params
    if (latStr) params.set('lat', latStr);
    if (lngStr) params.set('lng', lngStr);
    if (stateStr) params.set('state', stateStr);
    if (cityStr) params.set('city', cityStr);

    setSearchParams(params);
    setShowFilterModal(false);
  };

  const toggleFeature = (name: string) => {
    setModalFeatures(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  const toggleCuisine = (name: string) => {
    setModalCuisines(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };


  useEffect(() => {
    async function fetchResults() {
      const currentQueryStr = searchParams.toString();

      // Check cache first
      if (globalSearchCache && globalSearchCache.queryString === currentQueryStr) {
        setResults(globalSearchCache.results);
        setAiInterpretation(globalSearchCache.aiInterpretation);
        setLoading(false);
        return;
      }

      setLoading(true);
      setAiInterpretation(null);
      try {
        const filters: any = { query };
        if (priceStr) filters.price_level = parseInt(priceStr);
        if (cuisinesStr) filters.categories = cuisinesStr.split(',');
        if (distanceStr) filters.max_distance_km = parseInt(distanceStr);
        if (openStr === 'true') filters.open_now = true;
        if (latStr) filters.lat = parseFloat(latStr);
        if (lngStr) filters.lng = parseFloat(lngStr);
        if (isPerolaStr === 'true') filters.is_perola = true;
        if (promoStr === 'true') filters.has_promotions = true;
        if (stateStr) filters.state = stateStr;
        if (cityStr) filters.city = cityStr;
        const sortByStr = searchParams.get('sort_by');
        if (sortByStr) filters.sort_by = sortByStr as any;

        if (featuresStr) {
          const featureList = featuresStr.split(',');
          const attrMap: Record<string, string> = {
            'Pet Friendly': 'pet_friendly',
            'Wi-Fi': 'wifi',
            'Estacionamento': 'parking',
            'Área Verde': 'outdoor_seating',
            'Acessível': 'wheelchair_accessible',
            'Música ao Vivo': 'live_music'
          };
          const mappedAttributes: Record<string, boolean> = {};
          featureList.forEach(feat => {
            const key = attrMap[feat];
            if (key) mappedAttributes[key] = true;
          });
          if (Object.keys(mappedAttributes).length > 0) {
            filters.attributes = mappedAttributes;
          }
        }

        const data = await searchRestaurants(filters);

        setResults(data.restaurants);
        if (data.ai_interpretation) {
          setAiInterpretation(data.ai_interpretation);
        }

        // Save to global cache
        globalSearchCache = {
          queryString: currentQueryStr,
          results: data.restaurants,
          aiInterpretation: data.ai_interpretation || null
        };
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [query, distanceStr, priceStr, cuisinesStr, featuresStr, openStr, latStr, lngStr, isPerolaStr, promoStr, stateStr, cityStr]);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen">
      <div className="h-12 w-full sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md"></div>
      <header className="sticky top-12 z-40 px-5 pb-4 pt-2 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer">
            <span className="material-icons text-2xl dark:text-white">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">"{query}"</h1>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5">{results.length} encontrados</p>
          </div>
        </div>
        <button onClick={() => setShowFilterModal(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors relative block cursor-pointer">
          <span className="material-icons text-xl dark:text-gray-400">tune</span>
          {searchParams.toString() && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>}
        </button>
      </header>

      <main className="px-4 pt-2 space-y-8 mb-28">
        {/* AI Interpretation Chip */}
        {aiInterpretation && !loading && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-purple-500/10 dark:bg-purple-900/20 border border-purple-500/20 rounded-xl animate-fade-in">
            <img src="/logo.png" alt="AI" className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">IA entendeu</p>
              <p className="text-xs text-purple-300/90 font-medium leading-snug">{aiInterpretation}</p>
            </div>
          </div>
        )}

        <section className="space-y-6">
          {loading ? (
            <div className="text-center py-10 space-y-3">
              <img src="/logo.png" alt="Loading" className="w-8 h-8 object-contain animate-pulse" />
              <p className="text-gray-400 text-sm font-medium">Buscando com inteligência artificial...</p>
              <p className="text-gray-500 text-xs">Interpretando sua busca e encontrando os melhores resultados</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Nenhum resultado encontrado para "{query}"</div>
          ) : (
            results.map((restaurant, index) => (
              <Link key={restaurant.id} to={`/restaurant/${restaurant.id}`} className="block group relative rounded-3xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-[1.01] bg-card-dark">
                <div className="absolute inset-0">
                  <img alt={restaurant.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60" src={getCoverPhotoUrl(restaurant.photos)} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
                </div>
                {/* Ranking Position Badge */}
                <div className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white/30 text-white text-sm font-black flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                  {index + 1}º
                </div>
                <div className="relative z-10 p-5 flex justify-between h-[300px]">
                  <div className="w-[55%] flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 flex-wrap items-center">
                        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm w-fit">
                          <div className="flex items-center gap-1">
                            <StarRating rating={restaurant.rating_avg} showNumber={true} size="xs" />
                            <span className="text-gray-400 font-normal">({restaurant.rating_count})</span>
                          </div>
                        </div>
                        {/* Google source badge */}
                        {(restaurant as any).google_reviews?.length > 0 && (
                          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-1">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" className="w-3 h-3" />
                            <span>Google</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto mb-2">
                      {(() => {
                        const s = isRestaurantOpen(restaurant);
                        return s.isOpen ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                            Aberto agora
                          </span>
                        ) : s.opensAt ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Fechado
                          </span>
                        ) : null;
                      })()}
                      <h3 className="text-2xl font-bold text-white mb-1 text-shadow-sm leading-tight">{restaurant.name}</h3>
                      <p className="text-xs text-gray-300 font-medium mb-1">
                        {restaurant.categories?.join(' • ')} • {restaurant.city}
                      </p>
                      {/* Dish match badge */}
                      {(restaurant as RestaurantWithDish).matched_dish && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 mb-1 w-fit">
                          <span className="text-[10px]">🍽️</span>
                          <span className="text-[10px] font-bold text-amber-300 truncate max-w-[120px]">Prato: {(restaurant as RestaurantWithDish).matched_dish}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-lg font-extrabold text-emerald-400">{getPriceSymbols(restaurant.price_level)}</div>
                        <div className="text-xs text-gray-400 font-medium">{getPriceRangeText(restaurant.price_level)}</div>
                        {restaurant.distance_meters && (
                          <div className="text-base font-bold text-white/90">{restaurant.distance_meters < 1000 ? `${Math.round(restaurant.distance_meters)}m` : `${(restaurant.distance_meters / 1000).toFixed(1)} km`}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const highlight = getProminentHighlight(restaurant.attributes);
                          if (!highlight) return null;
                          return (
                            <span className="px-2 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-white shadow-sm">
                              {highlight}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* Video Thumbnail if available */}
                  <div className="w-[132px] h-[192px] self-center relative flex-shrink-0 group/video cursor-pointer">
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-video-card border border-white/10 relative">
                      <img alt="Video thumbnail" className="w-full h-full object-cover" src={(() => { const p = parsePhotos(restaurant.photos); return p[1]?.url || p[0]?.url || ''; })()} />
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover/video:scale-110 transition-transform duration-300">
                          <span className="material-icons text-white text-2xl ml-1">play_arrow</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </section>
      </main>

      {/* Stitch Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={() => setShowFilterModal(false)}></div>
          <div className="bg-[#0a0a0f]/85 backdrop-blur-xl border-t border-white/10 w-full max-w-md rounded-t-3xl pt-2 pb-8 px-5 relative z-10 animate-slide-up pointer-events-auto shadow-2xl h-[85vh] flex flex-col">
            <div className="w-full flex justify-center pt-2 pb-4">
              <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Buscar & Filtrar</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Fechar</button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-32">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200">O que você procura?</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <img src="/logo.png" alt="Deguste" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 object-contain" />
                    <input
                      className="w-full bg-card-dark border border-white/10 rounded-xl py-3 pl-10 pr-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Ex: sushi perto de mim, pizza boa..."
                      value={modalQuery}
                      onChange={(e) => setModalQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters(); }}
                    />
                  </div>
                  <button
                    onClick={startVoiceSearch}
                    className={`${isListening ? 'bg-red-600 animate-pulse' : 'bg-card-dark border border-white/10'} h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0`}
                  >
                    <span className={`material-icons ${isListening ? 'text-white' : 'text-primary'} text-xl`}>mic</span>
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="bg-primary h-11 w-11 rounded-xl flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors active:scale-95 flex-shrink-0"
                  >
                    <span className="material-icons text-white text-xl">arrow_forward</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1"><img src="/logo.png" alt="AI" className="w-3 h-3 object-contain" /> Busca inteligente com IA — entende linguagem natural</p>
              </div>

              {/* Sort By */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-200">Ordenar por</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'popularity', label: '🔥 Mais Popular', icon: 'trending_up' },
                    { key: 'rating', label: '⭐ Melhor Avaliado', icon: 'star' },
                    { key: 'distance', label: '📍 Mais Próximo', icon: 'near_me' },
                    { key: 'price', label: '💰 Mais Barato', icon: 'savings' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setModalSortBy(opt.key)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl bg-card-dark border transition-all ${modalSortBy === opt.key ? 'border-primary text-white bg-primary/10' : 'border-white/10 text-gray-300 hover:border-primary/50'}`}
                    >
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuisine Chips */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-200">Tipo de Cozinha</label>
                  {modalCuisines.length > 0 && (
                    <button onClick={() => setModalCuisines([])} className="text-[10px] text-primary font-bold uppercase tracking-wide">Limpar</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Brasileira', 'Japonesa', 'Pizzaria', 'Hamburgueria', 'Bar', 'Cafeteria', 'Sorveteria', 'Padaria', 'Lanchonete', 'Fast Food', 'Restaurante'].map(cuisine => (
                    <button
                      key={cuisine}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${modalCuisines.includes(cuisine) ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-card-dark border border-white/10 text-gray-300 hover:bg-white/5'}`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-200">Preferências de Busca</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModalOpenNow(!modalOpenNow)} className={`flex items-center justify-center gap-2 py-3 rounded-xl bg-card-dark border transition-all group ${modalOpenNow ? 'border-primary text-white bg-primary/10' : 'border-white/10 text-gray-300 hover:border-primary/50 hover:text-white'}`}>
                    <span className={`material-symbols-outlined text-xl transition-colors ${modalOpenNow ? 'text-primary' : 'text-primary group-hover:text-white'}`}>schedule</span>
                    <span className="text-xs font-medium">Abertos Agora</span>
                  </button>
                  <button onClick={() => setModalVideo(!modalVideo)} className={`flex items-center justify-center gap-2 py-3 rounded-xl bg-card-dark border transition-all group ${modalVideo ? 'border-primary text-white bg-primary/10' : 'border-white/10 text-gray-300 hover:border-primary/50 hover:text-white'}`}>
                    <span className={`material-symbols-outlined text-xl transition-colors ${modalVideo ? 'text-primary' : 'text-primary group-hover:text-white'}`}>videocam</span>
                    <span className="text-xs font-medium">Vídeo Disponível</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-200">Distância Máxima</label>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">Até {modalDistance} km</span>
                </div>
                <div className="px-1">
                  <input className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" max="100" min="1" type="range" value={modalDistance} onChange={(e) => setModalDistance(parseInt(e.target.value))} />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-medium">
                    <span>1 km</span>
                    <span>50 km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-200">Faixa de Preço</label>
                <div>
                  <div className="flex gap-2 justify-between">
                    {['$', '$$', '$$$', '$$$$', '$$$$$'].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setModalPrice(modalPrice === i ? -1 : i)}
                        className={`flex-1 py-2.5 rounded-lg border font-bold text-sm transition-all focus:outline-none ${modalPrice === i ? 'bg-primary text-white border-primary shadow-[0_0_15px_-3px_rgba(242,13,13,0.3)]' : 'bg-card-dark border-white/10 hover:border-primary/50 text-gray-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-1">
                    <span>Econômico</span>
                    <span>Sofisticado</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-200">Oportunidades</label>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setModalIsPerola(!modalIsPerola)} className={`w-full p-3 rounded-xl bg-gradient-to-r ${modalIsPerola ? 'from-primary/20 to-card-dark border-primary' : 'from-card-dark to-card-dark/50 border-white/10 hover:border-primary/30'} border flex items-center justify-between group transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${modalIsPerola ? 'bg-primary text-white' : 'bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                        <span className="material-symbols-outlined text-lg">local_activity</span>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-medium text-white">Cupons Exclusivos (Pérolas)</span>
                        <span className="text-[10px] text-gray-400">Descontos apenas no app</span>
                      </div>
                    </div>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${modalIsPerola ? 'border-primary bg-primary' : 'border-gray-600 group-hover:border-primary group-hover:bg-primary'}`}>
                      <span className={`material-icons text-[10px] text-white ${modalIsPerola ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>check</span>
                    </span>
                  </button>
                  <button onClick={() => setModalPromotions(!modalPromotions)} className={`w-full p-3 rounded-xl bg-gradient-to-r ${modalPromotions ? 'from-red-500/20 to-card-dark border-red-500' : 'from-card-dark to-card-dark/50 border-white/10 hover:border-primary/30'} border flex items-center justify-between group transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${modalPromotions ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-500 group-hover:bg-red-500 group-hover:text-white'}`}>
                        <span className="material-symbols-outlined text-lg">percent</span>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-white">Com Desconto</span>
                        <span className="text-[10px] text-gray-400">Restaurantes com ofertas ativas</span>
                      </div>
                    </div>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${modalPromotions ? 'border-red-500 bg-red-500' : 'border-gray-600 group-hover:border-primary group-hover:bg-primary'}`}>
                      <span className={`material-icons text-[10px] text-white ${modalPromotions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>check</span>
                    </span>
                  </button>
                  <button className="w-full p-3 rounded-xl bg-gradient-to-r from-card-dark to-card-dark/50 border border-white/10 hover:border-primary/30 flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-lg">loyalty</span>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-medium text-white">Programas de Fidelidade</span>
                        <span className="text-[10px] text-gray-400">Acumule pontos</span>
                      </div>
                    </div>
                    <span className="w-5 h-5 rounded-full border border-gray-600 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-colors">
                      <span className="material-icons text-[10px] text-white opacity-0 group-hover:opacity-100">check</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-200">Diferenciais</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Pet Friendly', icon: '🐾' },
                    { label: 'Área Verde', icon: '🌲' },
                    { label: 'Música ao Vivo', icon: '🎸' },
                    { label: 'Wi-Fi', icon: '📶' },
                    { label: 'Estacionamento', icon: '🅿️' },
                    { label: 'Acessível', icon: '♿' },
                    { label: 'Delivery', icon: '🛵' },
                    { label: 'Opções Veganas', icon: '🌱' },
                    { label: 'Aceita Reserva', icon: '📅' },
                    { label: 'Kids Friendly', icon: '👶' },
                  ].map(feat => (
                    <button
                      key={feat.label}
                      onClick={() => toggleFeature(feat.label)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${modalFeatures.includes(feat.label) ? 'bg-primary/20 text-primary border border-primary/30 shadow-inner' : 'bg-card-dark border border-white/10 text-gray-300 hover:bg-white/5'}`}
                    >
                      <span>{feat.icon}</span> {feat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20">
              <button onClick={handleApplyFilters} className="w-full py-4 bg-gradient-to-r from-red-600 to-primary rounded-xl text-white font-bold shadow-[0_0_15px_-3px_rgba(242,13,13,0.3)] hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer">
                Aplicar Filtros
                <span className="w-6 h-6 rounded-full bg-white/20 text-xs flex items-center justify-center">
                  {(modalOpenNow ? 1 : 0) + (modalDistance !== 50 ? 1 : 0) + (modalPrice >= 0 ? 1 : 0) + (modalPromotions ? 1 : 0) + (modalIsPerola ? 1 : 0) + modalFeatures.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
