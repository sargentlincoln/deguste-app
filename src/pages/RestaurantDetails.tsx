import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getRestaurantById, getMenuItems, getRestaurantVideos } from '@/lib/api/restaurants';
import { toggleFavorite, getFavoriteIds } from '@/lib/api/favorites';
import { getReviews, addReview } from '@/lib/api/reviews';
import { getCouponsForRestaurant, redeemCoupon } from '@/lib/api/coupons';
import { Restaurant, Review, Coupon, MenuItem, Video } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import MapWrapper from '@/components/MapWrapper';
import { isGooglePlaceId, getCachedPlace } from '@/lib/api/placesCache';
import { isRestaurantOpen, getPriceRangeText, getPriceSymbols, calculateDistance } from '@/lib/restaurantUtils';
import { parsePhotos, getMenuItemImage } from '@/lib/photoUtils';
import { StarRating } from '@/components/StarRating';
import { useLocation } from '@/contexts/LocationContext';

export default function RestaurantDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMenuItemId, setReviewMenuItemId] = useState('');
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [redeemedCoupons, setRedeemedCoupons] = useState<Set<string>>(new Set());
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && galleryIndex < allPhotos.length - 1) {
      setGalleryIndex(prev => prev + 1);
    }
    if (isRightSwipe && galleryIndex > 0) {
      setGalleryIndex(prev => prev - 1);
    }
  };

  const { latitude, longitude } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchRestaurant() {
      if (!id) return;
      try {
        if (isGooglePlaceId(id)) {
          const cachedData = getCachedPlace(id);
          if (cachedData) {
            setRestaurant(cachedData);
            setLoading(false);
            return;
          }
          navigate('/home');
          return;
        }

        const [data, favIds] = await Promise.all([
          getRestaurantById(id),
          user ? getFavoriteIds(user.id) : Promise.resolve([])
        ]);

        if (!data) {
          navigate('/home');
          return;
        }

        setRestaurant(data);
        if (user) {
          setIsFavorited(favIds.includes(data.id));
        }

        const [reviewsData, couponsData, menuData, videosData] = await Promise.all([
          getReviews(data.id),
          getCouponsForRestaurant(data.id),
          getMenuItems(data.id),
          getRestaurantVideos(data.id)
        ]);
        setReviews(reviewsData);
        setCoupons(couponsData);
        setMenuItems(menuData);
        setVideos(videosData);
      } catch (error) {
        console.error('Failed to fetch restaurant:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurant();
  }, [id, user, navigate]);

  const handleToggleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    if (!restaurant) return;
    try {
      const newState = !isFavorited;
      setIsFavorited(newState);
      await toggleFavorite(user.id, restaurant.id);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setIsFavorited(!isFavorited);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !restaurant || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const newReview = await addReview(
        user.id,
        restaurant.id,
        reviewRating,
        reviewComment,
        reviewMenuItemId || undefined,
        reviewPhotoUrl || undefined
      );
      if (newReview) {
        setReviews(prev => [{
          ...newReview,
          user: { name: user.name, avatar_url: user.avatar_url },
          menu_item: menuItems.find(m => m.id === reviewMenuItemId)
        } as any, ...prev]);
        setReviewComment('');
        setReviewRating(5);
        setReviewMenuItemId('');
        setReviewPhotoUrl('');
        setShowReviewForm(false);
        if (refreshProfile) {
          await refreshProfile();
        }
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRedeemCoupon = async (couponId: string) => {
    const success = await redeemCoupon(couponId);
    if (success) {
      setRedeemedCoupons(prev => new Set(prev).add(couponId));
    }
  };

  const parseJson = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return null; }
    }
    return val;
  };

  if (loading) {
    return <div className="min-h-screen bg-background-dark flex items-center justify-center text-primary"><span className="material-icons animate-spin text-4xl">autorenew</span></div>;
  }

  if (!restaurant) return null;

  let normalizedRestaurant: any;
  let openStatus: any;
  let reviewPhotos: any[] = [];
  let allPhotos: any[] = [];
  let attributes: any = {};

  try {
    // Normalize restaurant data to handle JSON strings and missing properties
    normalizedRestaurant = {
      ...restaurant,
      photos: parsePhotos(restaurant.photos),
      attributes: parseJson(restaurant.attributes) || {},
      opening_hours: parseJson(restaurant.opening_hours) || {},
      google_reviews: parseJson(restaurant.google_reviews) || [],
      rating_avg: restaurant.rating_avg || 0,
      rating_count: restaurant.rating_count || 0,
      price_level: (restaurant.price_level || 2) as 1 | 2 | 3 | 4
    };

    openStatus = isRestaurantOpen(normalizedRestaurant as Restaurant);
    reviewPhotos = (normalizedRestaurant.google_reviews || [])
      .flatMap((r: any) => r.photos || [])
      .filter((p: any) => p && p.url)
      .map((p: any) => ({
        id: Math.random().toString(),
        url: p.url,
        source: 'google_review' as const,
        is_cover: false
      }));
    // Limit to max 4 photos to prevent massive Google Places API billing 
    // ($0.007 per photo loaded in the UI)
    allPhotos = [...normalizedRestaurant.photos, ...reviewPhotos].slice(0, 4);
    attributes = normalizedRestaurant.attributes || {};
  } catch (e) {
    console.error('Error normalizing restaurant data:', e);
    normalizedRestaurant = {
      ...restaurant,
      photos: [],
      attributes: {},
      opening_hours: {},
      google_reviews: [],
      rating_avg: restaurant.rating_avg || 0,
      rating_count: restaurant.rating_count || 0,
      price_level: 2 as 1 | 2 | 3 | 4
    };
    openStatus = { isOpen: false, opensAt: null, closesAt: null };
    allPhotos = [];
  }

  const isGPlace = restaurant.id.startsWith('gplace_');
  const googleMapsUrl = isGPlace
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + (restaurant.address || restaurant.city || ''))}&query_place_id=${restaurant.id.replace('gplace_', '')}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + (restaurant.address || restaurant.city || ''))}`;

  const allReviews = [
    // Showing only real reviews sourced from Google
    ...normalizedRestaurant.google_reviews.map((r: any) => ({
      id: Math.random().toString(),
      authorName: r.author_name || r.authorAttribution?.displayName || 'Usuário Google',
      authorAvatar: r.author_photo || r.authorAttribution?.photoUri || null,
      authorLevel: 'Google',
      rating: r.rating || 5,
      comment: typeof r.text === 'string' ? r.text : (r.text?.text || r.originalText?.text || ''),
      dateStr: r.time ? new Date(r.time).toLocaleDateString('pt-BR') : (r.relativePublishTimeDescription || ''),
      source: 'google',
      photos: r.photos || []
    }))
  ];

  const distanceMeters = normalizedRestaurant.distance_meters || (latitude != null && longitude != null && restaurant.lat && restaurant.lng
    ? calculateDistance(latitude, longitude, restaurant.lat, restaurant.lng) * 1000
    : undefined);

  const totalReviewsCount = Math.max(allReviews.length, normalizedRestaurant.rating_count);

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-dark dark:text-text-light font-display antialiased min-h-screen pb-safe">
      {/* Photo Gallery Modal */}
      {showGallery && allPhotos.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 pt-12">
            <button onClick={() => setShowGallery(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <span className="material-icons text-white">close</span>
            </button>
            <span className="text-white/70 text-sm font-medium">{galleryIndex + 1} / {allPhotos.length}</span>
            <div className="w-10" />
          </div>
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            <img
              src={allPhotos[galleryIndex]?.url || ''}
              alt={`Foto ${galleryIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {galleryIndex > 0 && (
              <button
                onClick={() => setGalleryIndex(galleryIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
              >
                <span className="material-icons text-white">chevron_left</span>
              </button>
            )}
            {galleryIndex < allPhotos.length - 1 && (
              <button
                onClick={() => setGalleryIndex(galleryIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
              >
                <span className="material-icons text-white">chevron_right</span>
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto p-4 no-scrollbar justify-center">
            {allPhotos.map((photo: any, i: number) => (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === galleryIndex ? 'border-primary scale-105' : 'border-transparent opacity-60'}`}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto relative bg-background-light dark:bg-background-dark min-h-screen shadow-2xl overflow-hidden">
        <div className="relative h-[280px] w-full">
          <img alt={restaurant.name} className="w-full h-full object-cover" src={allPhotos[0]?.url || ''} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-[#0A0A0F] via-black/30 dark:via-black/40 to-transparent opacity-90"></div>
          <button onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/home');
            }
          }} className="absolute top-12 left-5 w-10 h-10 rounded-full glass flex items-center justify-center text-white active:scale-95 transition-transform bg-white/10 backdrop-blur-md border border-white/10">
            <span className="material-icons-round">arrow_back</span>
          </button>
          <button onClick={handleToggleFavorite} className={`absolute top-12 right-5 w-10 h-10 rounded-full glass flex items-center justify-center text-white active:scale-95 transition-all group backdrop-blur-md border border-white/10 ${isFavorited ? 'bg-primary/20' : 'bg-white/10'}`}>
            <span className={`material-icons-round transition-colors ${isFavorited ? 'text-primary' : 'group-hover:text-primary'}`}>{isFavorited ? 'favorite' : 'favorite_border'}</span>
          </button>
          <div className="absolute bottom-16 left-5 right-5">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-[26px] font-bold text-white leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2">
                {openStatus.isOpen ? (
                  <span className="bg-green-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                    🟢 Aberto agora
                  </span>
                ) : openStatus.opensAt ? (
                  <span className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                    🔴 Fechado
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-gray-200 dark:text-gray-300 text-sm font-medium">{restaurant.categories?.[0]} • {normalizedRestaurant.city}</p>
          </div>
        </div>

        <div className="relative px-4 -mt-10 pb-20 space-y-6">
          {/* Stats Bar */}
          <div className="bg-white dark:bg-card-dark rounded-lg p-4 shadow-soft-light dark:shadow-glow-red border border-border-light dark:border-white/5 grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/10">
            <div className="text-center px-1">
              <div className="flex items-center justify-center gap-1">
                <StarRating rating={normalizedRestaurant.rating_avg} showNumber={true} size="md" className="justify-center" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{totalReviewsCount} avaliações</p>
              {/* Aggregated rating sources */}
              {normalizedRestaurant.google_reviews.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-3 h-3" />
                  <span className="text-[8px] text-gray-400 dark:text-gray-500">+</span>
                  <span className="text-[9px] font-bold text-primary">Deguste</span>
                </div>
              )}
            </div>
            <div className="text-center px-1">
              <div className="flex items-center justify-center gap-1 text-primary font-bold text-lg">
                <span className="material-icons-round text-sm">location_on</span> {distanceMeters ? (distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`) : '—'}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">De distância</p>
            </div>
            <div className="text-center px-1">
              <div className="flex items-center justify-center gap-1 text-primary font-bold text-lg">
                {getPriceSymbols(normalizedRestaurant.price_level)}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{getPriceRangeText(normalizedRestaurant.price_level)}</p>
            </div>
          </div>

          {/* AI Summary / Description */}
          {normalizedRestaurant.description && (
            <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-xl p-4 border border-primary/20 flex gap-3 items-start shadow-sm">
              <img src="/logo.png" alt="AI Review" className="w-5 h-5 object-contain mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Resumo de Avaliações (IA)</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  "{normalizedRestaurant.description}"
                </p>
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {normalizedRestaurant.opening_hours?.weekday_descriptions && (
            <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-soft-light dark:shadow-glow-red border border-border-light dark:border-white/5">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsHoursExpanded(!isHoursExpanded)}
              >
                <h2 className="text-sm font-bold flex items-center gap-2 text-text-dark dark:text-white">
                  <span className="material-icons-round text-primary text-lg">schedule</span>
                  Horário de Funcionamento
                </h2>
                <span className="material-icons text-gray-400">{isHoursExpanded ? 'expand_less' : 'expand_more'}</span>
              </div>

              <ul className={`space-y-1.5 mt-3 transition-all overflow-hidden ${isHoursExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 m-0 p-0'}`}>
                {normalizedRestaurant.opening_hours.weekday_descriptions.map((desc: string, i: number) => {
                  const todayIdx = new Date().getDay();
                  const googleDayIdx = todayIdx === 0 ? 6 : todayIdx - 1;
                  const isToday = i === googleDayIdx;

                  return (
                    <li key={i} className={`text-xs flex justify-between ${isToday ? 'text-primary font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                      <span className="capitalize">{desc.split(': ')[0]}</span>
                      <span className="font-medium">{desc.split(': ').slice(1).join(': ') || 'Fechado'}</span>
                    </li>
                  )
                })}
              </ul>

              {!isHoursExpanded && (
                <div className="mt-2 text-xs flex justify-between text-gray-800 dark:text-gray-200 font-medium bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                  <span className="capitalize">Hoje</span>
                  <span>
                    {(() => {
                      const todayIdx = new Date().getDay();
                      const googleDayIdx = todayIdx === 0 ? 6 : todayIdx - 1;
                      const todayDesc = normalizedRestaurant.opening_hours.weekday_descriptions[googleDayIdx];
                      return todayDesc ? todayDesc.split(': ').slice(1).join(': ') : 'Consulte Horários';
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Shorts / Videos Section */}
          {videos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-text-dark dark:text-white flex items-center gap-1.5 align-middle">
                  <span className="material-icons-round text-primary text-[22px]">play_circle</span>
                  Shorts do Local
                </h2>
              </div>
              <div className="flex overflow-x-auto gap-3 hide-scroll pb-2 no-scrollbar">
                {videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="relative shrink-0 w-[110px] h-44 rounded-xl overflow-hidden bg-gray-900 shadow-card-light dark:shadow-glow-red cursor-pointer group border border-border-light dark:border-white/5"
                    onClick={() => navigate(`/explore?video=${vid.id}`)}
                  >
                    <img alt={vid.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={vid.thumbnail_url} />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow-md">{vid.title}</p>
                      <div className="flex items-center gap-1 mt-1 text-white/80">
                        <span className="material-icons-round text-[10px]">visibility</span>
                        <span className="text-[9px] font-medium">{vid.views_count >= 1000 ? `${(vid.views_count / 1000).toFixed(1)}k` : vid.views_count}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:bg-primary/80 transition-colors">
                        <span className="material-icons-round text-white text-2xl drop-shadow-md ml-0.5" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>play_arrow</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Section — Photos + Videos */}
          <div>
            <h2 className="text-lg font-bold text-text-dark dark:text-white mb-3 px-1">🎬 Conheça por Dentro</h2>
            <div className="flex gap-3 overflow-x-auto hide-scroll pb-2 no-scrollbar">
              {/* First card: Photo Gallery */}
              <div
                className="relative shrink-0 w-24 h-36 rounded-lg overflow-hidden bg-gray-100 dark:bg-card-dark border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-glow-red cursor-pointer group"
                onClick={() => { setGalleryIndex(0); setShowGallery(true); }}
              >
                <img alt="Fotos" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={allPhotos[0]?.url || ''} />
                <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                  <span className="text-white text-[10px] font-medium">📷 Fotos</span>
                  {allPhotos.length > 1 && <span className="text-white/60 text-[9px]">{allPhotos.length} fotos</span>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center shadow-lg border border-white/20">
                    <span className="material-icons-round text-lg">photo_library</span>
                  </div>
                </div>
              </div>
              {/* Additional photo/video cards */}
              {allPhotos.slice(1).map((photo: any, i: number) => (
                <div
                  key={i}
                  className="relative shrink-0 w-24 h-36 rounded-lg overflow-hidden bg-gray-100 dark:bg-card-dark border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-glow-red cursor-pointer group"
                  onClick={() => { setGalleryIndex(i + 1); setShowGallery(true); }}
                >
                  <img alt={`Foto ${i + 2}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={photo.url} />
                  <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <span className="text-white text-[10px] font-medium">{photo.source === 'google_review' ? 'De cliente' : ['Ambiente', 'Pratos', 'Detalhes', 'Vista', 'Interior', 'Entrada', 'Bar', 'Fachada', 'Lounge'][i % 9] || `Foto ${i + 2}`}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center shadow-lg border border-white/20">
                      <span className="material-icons-round text-lg">zoom_in</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attributes Tags */}
          <div className="flex gap-2 overflow-x-auto hide-scroll pb-1 no-scrollbar flex-wrap max-h-48">
            {attributes.good_for_birthdays && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🎉 Aniversário</span>}
            {attributes.romantic && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">💑 Romântico</span>}
            {attributes.vintage && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">📻 Vintage</span>}
            {attributes.live_music && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🎵 Música ao Vivo</span>}
            {attributes.classical_music && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🎹 Clássica</span>}
            {(attributes.pet_friendly || attributes.pet) && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🐾 Pet Friendly</span>}
            {attributes.kids_friendly && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🧸 Kids</span>}
            {attributes.outdoor_seating && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🌿 Ar Livre</span>}
            {(attributes.wheelchair_accessible || attributes.accessible) && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">♿️ Acessível</span>}
            {(attributes.parking_available || attributes.parking) && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🅿️ Estacionamento</span>}
            {attributes.vegan_options && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🌱 Vegano</span>}
            {(attributes.wifi_available || attributes.wifi) && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">📡 Wi-Fi</span>}
            {attributes.upscale && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">✨ Requintado</span>}
            {attributes.delivery && <span className="shrink-0 px-3 py-1.5 bg-white dark:bg-card-dark border border-primary/20 rounded-full text-xs text-text-dark dark:text-gray-200 font-medium shadow-sm whitespace-nowrap">🛵 Delivery</span>}
          </div>

          {/* Promo Banner */}
          {coupons.length > 0 && (
            <div className="bg-white dark:bg-card-dark border border-primary/20 rounded-lg p-4 shadow-soft-light dark:shadow-glow-red relative overflow-hidden">
              {(() => {
                if (!coupons[0].valid_until) return null;
                const expiry = new Date(coupons[0].valid_until);
                const now = new Date();
                const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (hoursLeft > 0 && hoursLeft <= 24) {
                  return (
                    <div className="absolute top-0 right-0 bg-[#FF2E00] text-white text-[9px] font-black px-3 py-1 rounded-bl-lg shadow-md uppercase tracking-wider animate-pulse flex items-center gap-1 z-10">
                      {hoursLeft <= 3 ? (
                        <><span className="material-icons-round text-[10px]">alarm</span> OPORTUNIDADE FINAL</>
                      ) : (
                        <><span className="material-icons-round text-[10px]">hourglass_empty</span> ACABA HOJE!</>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex items-start gap-3 mt-1 relative z-0">
                <div className="bg-primary/10 p-2 rounded-full shrink-0">
                  <span className="material-icons-round text-primary text-xl">local_fire_department</span>
                </div>
                <div className="pr-4">
                  <h3 className="text-primary font-bold text-sm leading-tight">🔥 {coupons[0].title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">{coupons[0].description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Deguste Restaurant Guru B2B Badges */}
          {restaurant.badges && restaurant.badges.length > 0 && (
            <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#FDB931]/5 border border-[#FFD700]/30 dark:border-[#FFD700]/20 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-[#FFD700]/5 relative overflow-hidden mt-2 mb-2">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50"></div>
              <div className="flex flex-wrap justify-center gap-4 mb-3">
                {restaurant.badges.map((badge, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FDB931] flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.4)] border-2 border-white dark:border-gray-900 mb-2 relative">
                      <span className="material-icons-round text-white text-2xl drop-shadow-md">star</span>
                      <div className="absolute -bottom-1 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded text-[8px] font-black text-[#FDB931] border border-[#FFD700]/30 whitespace-nowrap">TOP 10</div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-800 dark:text-[#FFD700] uppercase tracking-wider max-w-[80px] leading-tight">{badge}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-4 px-4 leading-relaxed">Recomendado oficialmente por nossos Críticos Gastronômicos.</p>
              <button
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931] rounded-full text-xs font-bold text-gray-900 hover:shadow-lg hover:shadow-[#FFD700]/40 transition-all active:scale-95 border border-[#FDB931]"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${restaurant.name} - Certificado Deguste`,
                      text: `Olha só o selo de qualidade que o ${restaurant.name} ganhou no Deguste!`,
                      url: window.location.href,
                    }).catch(console.error);
                  }
                }}
              >
                <span className="material-icons-round text-[16px] text-gray-900">share</span>
                Compartilhar Conquista
              </button>
            </div>
          )}

          {/* Menu Highlights */}
          {menuItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-text-dark dark:text-white">Destaques do Cardápio</h2>
                <a onClick={() => setShowFullMenu(true)} className="text-xs text-primary font-bold hover:text-primary-dark transition-colors cursor-pointer">Ver tudo</a>
              </div>
              <div className="flex overflow-x-auto gap-4 hide-scroll pb-2 -mx-4 px-4 no-scrollbar">
                {menuItems.map((item) => (
                  <div key={item.id} className="shrink-0 w-44 bg-white dark:bg-card-dark rounded-lg overflow-hidden shadow-card-light dark:shadow-glow-red border border-border-light dark:border-white/5 flex flex-col">
                    <div className="h-28 w-full relative">
                      <img alt={item.name} className="w-full h-full object-cover opacity-90" src={getMenuItemImage(item.image_url, item.category, item.name)} />
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="text-sm font-bold text-text-dark dark:text-white mb-1 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <p className="text-primary font-bold text-sm">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Menu Modal */}
          {showFullMenu && menuItems.length > 0 && (
            <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex flex-col">
              <div className="flex items-center justify-between p-4 pt-12 border-b border-border-light dark:border-white/10">
                <button onClick={() => setShowFullMenu(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <span className="material-icons text-text-dark dark:text-white">close</span>
                </button>
                <h2 className="text-lg font-bold text-text-dark dark:text-white">Cardápio Completo</h2>
                <div className="w-10" />
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-6 no-scrollbar">
                {(() => {
                  const categories = new Map<string, typeof menuItems>();
                  for (const item of menuItems) {
                    const cat = item.category || 'Outros';
                    if (!categories.has(cat)) categories.set(cat, []);
                    categories.get(cat)!.push(item);
                  }
                  return Array.from(categories.entries()).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="material-icons text-sm">restaurant_menu</span>
                        {cat}
                      </h3>
                      <div className="space-y-3">
                        {items.map(item => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedMenuItem(item)}
                            className="bg-white dark:bg-card-dark rounded-xl p-3 flex gap-3 shadow-card-light dark:shadow-soft border border-border-light dark:border-white/5 cursor-pointer hover:border-primary/30 transition-colors"
                          >
                            {item.image_url && (
                              <img
                                src={getMenuItemImage(item.image_url, item.category, item.name)}
                                alt={item.name}
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-text-dark dark:text-white">{item.name}</h4>
                                {item.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                                )}
                              </div>
                              <p className="text-primary font-bold text-sm mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Dish Detail Modal */}
          {selectedMenuItem && (
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white dark:bg-background-dark w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up sm:animate-fade-in relative">
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={() => setSelectedMenuItem(null)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <span className="material-icons-round">close</span>
                  </button>
                </div>

                {selectedMenuItem.image_url ? (
                  <div className="w-full h-56 relative shrink-0">
                    <img src={getMenuItemImage(selectedMenuItem.image_url, selectedMenuItem.category, selectedMenuItem.name)} alt={selectedMenuItem.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block shadow-lg border border-white/20">
                        {selectedMenuItem.category || 'Destaque'}
                      </span>
                      <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md">{selectedMenuItem.name}</h2>
                      <p className="text-primary-light font-bold text-lg mt-1 drop-shadow-md">R$ {selectedMenuItem.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 pb-2 shrink-0 bg-gray-50 dark:bg-card-dark border-b border-gray-200 dark:border-white/5">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                      {selectedMenuItem.category || 'Destaque'}
                    </span>
                    <h2 className="text-2xl font-bold text-text-dark dark:text-white leading-tight">{selectedMenuItem.name}</h2>
                    <p className="text-primary font-bold text-lg mt-1">R$ {selectedMenuItem.price.toFixed(2).replace('.', ',')}</p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedMenuItem.description && (
                    <div>
                      <h3 className="text-sm font-bold text-text-dark dark:text-white mb-2">Descrição</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selectedMenuItem.description}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-text-dark dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-icons-round text-primary text-sm">forum</span>
                      Avaliações deste prato
                    </h3>

                    {(() => {
                      const dishReviews = allReviews.filter(r => r.menuItemName === selectedMenuItem.name);

                      if (dishReviews.length === 0) {
                        return (
                          <div className="bg-gray-50 dark:bg-card-dark rounded-xl p-6 text-center border border-gray-100 dark:border-white/5">
                            <span className="material-icons-round text-3xl text-gray-300 dark:text-gray-600 mb-2">restaurant</span>
                            <p className="text-sm text-gray-500 font-medium">Ninguém avaliou este prato ainda.</p>
                            <p className="text-xs text-gray-400 mt-1">Peça e seja o primeiro!</p>
                            <button
                              onClick={() => {
                                setSelectedMenuItem(null);
                                setShowFullMenu(false);
                                setReviewMenuItemId(selectedMenuItem.id);
                                setShowReviewForm(true);
                                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                              }}
                              className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              Avaliar Agora
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {dishReviews.map((review: any) => (
                            <div key={review.id} className="bg-gray-50 dark:bg-card-dark rounded-xl p-4 border border-gray-100 dark:border-white/5">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {review.authorAvatar ? (
                                    <img src={review.authorAvatar} alt={review.authorName} className="w-6 h-6 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                                      {review.authorName[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-dark dark:text-white leading-none">{review.authorName}</span>
                                    {review.authorLevel && (
                                      <span className="text-[10px] text-primary/80 font-bold uppercase mt-0.5">{review.authorLevel}</span>
                                    )}
                                  </div>
                                </div>
                                <StarRating rating={review.rating} size="sm" />
                              </div>
                              {review.comment && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">"{review.comment}"</p>}
                              {review.photos && review.photos.length > 0 && (
                                <div className="flex gap-2 relative mt-2">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border-light shadow-sm">
                                    <img src={review.photos[0].url} alt="Foto original do prato" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reservation */}
          {attributes.reservation_available && (
            <div className="bg-primary rounded-lg p-5 shadow-lg shadow-primary/20">
              <h3 className="text-lg font-bold text-white mb-4">Reservar Mesa</h3>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white dark:bg-black/20 p-2 rounded border border-transparent dark:border-white/10">
                  <label className="block text-[10px] text-gray-500 dark:text-white/70 uppercase font-bold mb-1">Data</label>
                  <div className="font-bold text-sm text-text-dark dark:text-white flex items-center gap-1">
                    Hoje <span className="material-icons-round text-xs ml-auto text-primary dark:text-white">expand_more</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-black/20 p-2 rounded border border-transparent dark:border-white/10">
                  <label className="block text-[10px] text-gray-500 dark:text-white/70 uppercase font-bold mb-1">Hora</label>
                  <div className="font-bold text-sm text-text-dark dark:text-white flex items-center gap-1">
                    20:00 <span className="material-icons-round text-xs ml-auto text-primary dark:text-white">expand_more</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-black/20 p-2 rounded border border-transparent dark:border-white/10">
                  <label className="block text-[10px] text-gray-500 dark:text-white/70 uppercase font-bold mb-1">Pessoas</label>
                  <div className="font-bold text-sm text-text-dark dark:text-white flex items-center gap-1">
                    2 <span className="material-icons-round text-xs ml-auto text-primary dark:text-white">expand_more</span>
                  </div>
                </div>
              </div>
              <button className="w-full bg-white text-primary font-bold py-3.5 rounded-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-gray-100">
                Confirmar Reserva
                <span className="material-icons-round text-sm">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Contact & Location Card */}
          <div className="bg-white dark:bg-card-dark rounded-lg p-4 space-y-4 shadow-soft-light dark:shadow-glow-red border border-border-light dark:border-white/5">
            {/* Address — clickable → opens Google Maps */}
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <span className="material-icons-round text-sm">place</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-dark dark:text-white font-medium group-hover:text-primary transition-colors">{restaurant.address}</p>
              </div>
              <span className="material-icons-round text-gray-500 text-lg group-hover:text-primary transition-colors">chevron_right</span>
            </a>

            <MapWrapper latitude={restaurant.lat} longitude={restaurant.lng} name={restaurant.name} showStreetView={true} />

            {/* Phone */}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <span className="material-icons-round text-sm">phone</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-text-dark dark:text-white font-medium group-hover:text-primary transition-colors">{restaurant.phone}</p>
                </div>
              </a>
            )}

            {/* Opening Hours */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <span className="material-icons-round text-sm">schedule</span>
              </div>
              <div className="flex-1">
                {openStatus.opensAt && openStatus.closesAt ? (
                  openStatus.isOpen ? (
                    <p className="text-sm font-medium">
                      <span className="text-green-500">Aberto agora</span>
                      <span className="text-gray-600 font-normal mx-1">•</span>
                      <span className="text-gray-500 dark:text-gray-400">Fecha às {openStatus.closesAt}</span>
                    </p>
                  ) : (
                    <p className="text-sm font-medium">
                      <span className="text-red-500">Fechado agora</span>
                      <span className="text-gray-600 font-normal mx-1">•</span>
                      <span className="text-gray-500 dark:text-gray-400">Abre às {openStatus.opensAt}</span>
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 font-medium">Horário não disponível</p>
                )}
              </div>
            </div>
          </div>

          {/* Coupons Section */}
          {coupons.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-text-dark dark:text-white mb-3 px-1 flex items-center gap-2">🎟️ Cupons Disponíveis</h2>
              <div className="space-y-3">
                {coupons.map(coupon => (
                  <div key={coupon.id} className="bg-white dark:bg-card-dark border border-primary/20 rounded-lg p-4 flex items-center justify-between shadow-soft-light dark:shadow-glow-red">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-text-dark dark:text-white truncate">{coupon.title}</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{coupon.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-primary font-bold text-xs">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : coupon.discount_type === 'fixed' ? `R$ ${coupon.discount_value} OFF` : 'Grátis!'}
                        </span>
                        <span className="text-[10px] text-gray-500">Código: {coupon.code}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeemCoupon(coupon.id)}
                      disabled={redeemedCoupons.has(coupon.id)}
                      className={`ml-3 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${redeemedCoupons.has(coupon.id)
                        ? 'bg-green-500/20 text-green-500 dark:text-green-400 border border-green-500/30'
                        : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover'
                        }`}
                    >
                      {redeemedCoupons.has(coupon.id) ? '✓ Resgatado' : 'Resgatar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-text-dark dark:text-white flex items-center gap-2">⭐ Avaliações <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({totalReviewsCount})</span></h2>
              {user && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-xs text-primary font-bold hover:text-primary-dark transition-colors"
                >
                  {showReviewForm ? 'Cancelar' : '+ Avaliar'}
                </button>
              )}
            </div>

            {/* ── Review Summary Panel ── */}
            {(normalizedRestaurant.rating_avg > 0 || allReviews.length > 0) && (() => {
              // Use the REAL aggregate data from Google Maps (all reviews, not just the 5 samples)
              const avgRating = normalizedRestaurant.rating_avg || 0;
              const totalCount = totalReviewsCount || allReviews.length;

              // Build distribution: use the 5 sample reviews as proportional basis, scaled to total
              const sampleCounts = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars
              allReviews.forEach((r: any) => {
                const clampedRating = Math.max(1, Math.min(5, Math.round(r.rating || 0)));
                sampleCounts[clampedRating - 1]++;
              });
              const sampleTotal = allReviews.length || 1;

              // Scale sample distribution to match total review count
              const estimatedCounts = sampleCounts.map(c =>
                Math.round((c / sampleTotal) * totalCount)
              );
              const maxCount = Math.max(...estimatedCounts, 1);

              // Extract keyword highlights from review texts
              const allText = allReviews.map((r: any) => (r.comment || '').toLowerCase()).join(' ');
              const keywordMap: { label: string; emoji: string; keywords: string[] }[] = [
                { label: 'Comida', emoji: '🍽️', keywords: ['comida', 'prato', 'sabor', 'delicioso', 'gostoso', 'saboroso', 'tempero', 'cardápio', 'menu', 'refeição'] },
                { label: 'Atendimento', emoji: '👨‍🍳', keywords: ['atendimento', 'garçon', 'garçom', 'serviço', 'atencioso', 'educado', 'gentil', 'simpático'] },
                { label: 'Ambiente', emoji: '🏠', keywords: ['ambiente', 'decoração', 'lugar', 'espaço', 'aconchegante', 'limpo', 'bonito', 'confortável', 'agradável'] },
                { label: 'Preço', emoji: '💰', keywords: ['preço', 'valor', 'custo', 'barato', 'caro', 'conta', 'pagar', 'justo', 'acessível'] },
                { label: 'Localização', emoji: '📍', keywords: ['localização', 'endereço', 'estacionar', 'estacionamento', 'acesso', 'localizar'] },
              ];
              const highlights = keywordMap
                .map(km => {
                  const mentionCount = km.keywords.reduce((acc, kw) => acc + (allText.split(kw).length - 1), 0);
                  return { ...km, mentions: mentionCount };
                })
                .filter(h => h.mentions > 0)
                .sort((a, b) => b.mentions - a.mentions)
                .slice(0, 4);

              // Extract short positive/negative quotes
              const positiveReview = allReviews.find((r: any) => r.rating >= 4 && (r.comment || '').length > 20);
              const negativeReview = allReviews.find((r: any) => r.rating <= 2 && (r.comment || '').length > 20);

              return (
                <div className="bg-white dark:bg-card-dark border border-border-light dark:border-white/5 rounded-xl p-4 mb-4 shadow-sm dark:shadow-none">
                  <div className="flex gap-4">
                    {/* Left: Big rating */}
                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                      <span className="text-4xl font-extrabold text-text-dark dark:text-white leading-none">{avgRating.toFixed(1)}</span>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`material-icons-round text-sm ${s <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>star</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{totalReviewsCount} avaliações</span>
                    </div>

                    {/* Right: Distribution bars */}
                    <div className="flex-1 flex flex-col justify-center gap-[3px]">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = estimatedCounts[star - 1];
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-[12px] text-right">{star}</span>
                            <span className="material-icons-round text-[10px] text-yellow-400">star</span>
                            <div className="flex-1 h-[6px] bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: star >= 4 ? '#22c55e' : star === 3 ? '#facc15' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 w-[14px] text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Keyword tags */}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                      {highlights.map(h => (
                        <span key={h.label} className="inline-flex items-center gap-1 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-[10px] font-semibold px-2 py-1 rounded-full">
                          <span>{h.emoji}</span> {h.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick quotes */}
                  {(positiveReview || negativeReview) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2">
                      {positiveReview && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 text-sm mt-0.5">👍</span>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed line-clamp-2">
                            "{(positiveReview as any).comment.slice(0, 120)}{(positiveReview as any).comment.length > 120 ? '...' : ''}"
                          </p>
                        </div>
                      )}
                      {negativeReview && (
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 text-sm mt-0.5">👎</span>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed line-clamp-2">
                            "{(negativeReview as any).comment.slice(0, 120)}{(negativeReview as any).comment.length > 120 ? '...' : ''}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {showReviewForm && user && (
              <div className="bg-white dark:bg-card-dark border border-primary/20 rounded-lg p-4 mb-4 shadow-soft-light dark:shadow-glow-red">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110">
                      <span className={`material-icons-round text-2xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-600'}`}>star</span>
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{reviewRating}/5</span>
                </div>
                <div className="flex flex-col gap-3 mb-3">
                  <select
                    value={reviewMenuItemId}
                    onChange={(e) => setReviewMenuItemId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm text-text-dark dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                  >
                    <option value="">Sobre o restaurante em geral</option>
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">link</span>
                    <input
                      type="url"
                      value={reviewPhotoUrl}
                      onChange={(e) => setReviewPhotoUrl(e.target.value)}
                      placeholder="Link da foto (opcional)"
                      className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-text-dark dark:text-white placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Conte sua experiência..."
                    className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm text-text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-20"
                  />
                </div>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="mt-3 w-full bg-primary text-white font-bold py-2.5 rounded-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingReview ? (
                    <span className="material-icons animate-spin text-sm">autorenew</span>
                  ) : (
                    <>
                      <span className="material-icons-round text-sm">send</span>
                      Enviar Avaliação
                    </>
                  )}
                </button>
              </div>
            )}

            {allReviews.length > 0 ? (
              <div className="space-y-3">
                {allReviews.slice(0, 10).map((review: any) => (
                  <div key={review.id} className="bg-white dark:bg-card-dark rounded-lg p-4 border border-border-light dark:border-white/5 relative overflow-hidden shadow-sm dark:shadow-none">
                    {review.source === 'google' && (
                      <div className="absolute top-0 right-0 p-1 opacity-20">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Review" className="w-8 h-8 opacity-50 grayscale" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                      {review.authorAvatar ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 dark:border-black/10">
                          <img src={review.authorAvatar} alt={review.authorName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {review.authorName[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text-dark dark:text-white">{review.authorName}</p>
                          {review.authorLevel && (
                            <span className="bg-primary/10 text-primary dark:text-primary-light px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">{review.authorLevel}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500">{review.dateStr}</span>
                    </div>
                    {review.comment && <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed relative z-10">{review.comment}</p>}

                    {review.menuItemName && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 text-primary dark:text-primary-light px-2.5 py-1 rounded-md border border-primary/20">
                        <span className="material-icons-round text-[14px]">restaurant_menu</span>
                        <span className="text-[11px] font-bold">Avaliou o prato: {review.menuItemName}</span>
                      </div>
                    )}


                    {/* Review photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto hide-scroll pb-1 no-scrollbar relative z-10">
                        {review.photos.map((p: any, idx: number) => (
                          <div
                            key={idx}
                            className="shrink-0 w-16 h-16 rounded overflow-hidden cursor-pointer"
                            onClick={() => {
                              // Encontrar o índice dessa foto na galeria geral (todas depois das originais)
                              const photoIndex = normalizedRestaurant.photos.length +
                                allReviews.slice(0, allReviews.findIndex((r: any) => r.id === review.id))
                                  .reduce((acc: number, r: any) => acc + (r.photos?.length || 0), 0) + idx;

                              if (photoIndex >= 0 && photoIndex < allPhotos.length) {
                                setGalleryIndex(photoIndex);
                                setShowGallery(true);
                              }
                            }}
                          >
                            <img src={p.url} alt="Foto da avaliação" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white dark:bg-card-dark rounded-lg border border-border-light dark:border-white/5 shadow-sm dark:shadow-none">
                <span className="material-icons-round text-3xl text-gray-400 dark:text-gray-600 mb-1">rate_review</span>
                <p className="text-xs text-gray-500">Nenhuma avaliação ainda. {user ? 'Seja o primeiro!' : 'Faça login para avaliar.'}</p>
              </div>
            )}
          </div>

          {/* Contact Buttons — only show available ones */}
          <div className="grid grid-cols-2 gap-3 pb-8">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center justify-center gap-2 bg-white dark:bg-card-dark border border-blue-400 dark:border-blue-500/30 text-blue-500 dark:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 py-3 rounded-lg active:scale-[0.98] transition-all shadow-sm group">
                <span className="material-icons-round text-sm group-hover:scale-110 transition-transform">phone</span>
                <span className="text-sm font-bold">Ligar</span>
              </a>
            )}

            {restaurant.whatsapp && (
              <a href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-card-dark border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 dark:hover:bg-[#25D366]/10 py-3 rounded-lg active:scale-[0.98] transition-all shadow-sm group">
                <span className="material-icons-round text-sm group-hover:scale-110 transition-transform">chat</span>
                <span className="text-sm font-bold">WhatsApp</span>
              </a>
            )}

            {restaurant.instagram && (
              <a href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-card-dark border border-gray-200 dark:border-transparent text-white py-3 rounded-lg active:scale-[0.98] transition-all shadow-sm group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] opacity-10 dark:opacity-20"></div>
                <div className="absolute inset-0 border border-[#dc2743] rounded-lg opacity-30 dark:opacity-50"></div>

                <div className="flex items-center gap-2 z-10">
                  <span className="material-icons-round text-sm relative group-hover:scale-110 transition-transform text-[#dc2743]">camera_alt</span>
                  <span className="text-sm font-bold relative text-transparent bg-clip-text bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">Instagram</span>
                </div>
                {/* Mock Follower Count proportional to rating_count */}
                <span className="text-[10px] text-gray-500 dark:text-gray-300 font-medium z-10">{Math.floor((normalizedRestaurant.rating_count || 50) * 123.4).toLocaleString('pt-BR')} seguidores</span>
              </a>
            )}

            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 py-3 rounded-lg active:scale-[0.98] transition-all shadow-sm group">
                <span className="material-icons-round text-sm group-hover:scale-110 transition-transform">language</span>
                <span className="text-sm font-bold">Website</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
