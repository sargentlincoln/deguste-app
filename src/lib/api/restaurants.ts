import { supabase } from '../supabase';
import { MOCK_RESTAURANTS, MOCK_VIDEOS, MOCK_COUPONS } from '../mock-data';
import { Restaurant, Video, Coupon, MenuItem, RankedCategory, AvailableLocation } from '../types';

export async function getRestaurants(lat?: number | null, lng?: number | null): Promise<Restaurant[]> {
    if (supabase) {
        if (lat != null && lng != null) {
            // Call the PostGIS RPC function
            const { data, error } = await supabase.rpc('get_nearby_restaurants', {
                user_lat: lat,
                user_lng: lng
            });

            if (error) {
                console.error('Error fetching nearby restaurants from RPC:', error);
                return MOCK_RESTAURANTS;
            }
            return data as Restaurant[];
        } else {
            // Standard fetch without location
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('status', 'active');

            if (error) {
                console.error('Error fetching restaurants:', error);
                return MOCK_RESTAURANTS;
            }
            return data as Restaurant[];
        }
    }

    // Fallback to mock data
    return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_RESTAURANTS), 600);
    });
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
    if (supabase) {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as Restaurant;
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            const restaurant = MOCK_RESTAURANTS.find(r => r.id === id);
            resolve(restaurant || null);
        }, 400);
    });
}

const RANKING_CONFIGS = [
    { title: 'Top 5 Pizzarias', emoji: '🍕', categoryFilter: 'Pizzaria' },
    { title: 'Melhores Avaliados', emoji: '⭐', categoryFilter: '' },
    { title: 'Top 5 Hamburguerias', emoji: '🍔', categoryFilter: 'Hamburgueria' },
    { title: 'Top 5 Japonesa', emoji: '🍣', categoryFilter: 'Japonesa' },
    { title: 'Top 5 Bares', emoji: '🍺', categoryFilter: 'Bar' },
];

export async function getHomeFeed(lat?: number | null, lng?: number | null) {
    if (!supabase) {
        return {
            highlights: MOCK_RESTAURANTS.slice(0, 3),
            promotions: MOCK_COUPONS,
            videos: MOCK_VIDEOS.map(v => ({ ...v, restaurant: MOCK_RESTAURANTS.find(r => r.id === v.restaurant_id) })),
            rankings: [] as RankedCategory[]
        };
    }

    let allRestaurants: Restaurant[] = [];

    if (lat != null && lng != null) {
        const { data, error } = await supabase.rpc('get_nearby_restaurants', {
            user_lat: lat,
            user_lng: lng
        });
        if (error) {
            console.error('Error fetching nearby home feed:', error);
        } else {
            allRestaurants = data as Restaurant[];
        }
    } else {
        const { data } = await supabase.from('restaurants').select('*').eq('status', 'active');
        allRestaurants = (data as Restaurant[]) || [];
    }

    // 1. Highlights
    const highlights = allRestaurants.filter(r => r.is_verified).slice(0, 5);

    // 2. Promotions
    const cheapPlaces = allRestaurants
        .filter(r => r.price_level === 1)
        .sort((a, b) => b.rating_avg - a.rating_avg)
        .slice(0, 5);

    const promotions: Coupon[] = cheapPlaces.map(r => ({
        id: `promo-${r.id}`,
        restaurant_id: r.id,
        title: `Oferta em ${r.name}`,
        description: r.categories.includes('Brasileira') ? 'Almoço com desconto' : 'Desconto especial',
        discount_type: 'percentage' as const,
        discount_value: 20,
        min_order_value: 30,
        max_redemptions: 100,
        current_redemptions: 12,
        code: `DEGUSTE20`,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 86400000).toISOString(),
        status: 'active' as const,
        created_at: new Date().toISOString(),
    }));

    // 3. Videos
    const famousPlaces = [...allRestaurants]
        .sort((a, b) => b.rating_count - a.rating_count)
        .slice(0, 10);

    const videos: Video[] = famousPlaces.map(r => {
        let thumb_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80';
        try {
            if (r.photos) {
                const parsed = typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    thumb_url = parsed[0].url || thumb_url;
                }
            }
        } catch (e) { }

        return {
            id: `video-${r.id}`,
            restaurant_id: r.id,
            url: '',
            video_url: '',
            thumbnail_url: thumb_url,
            title: `Melhor ${r.categories[0] || 'Lugar'}?`,
            description: `Fomos conhecer o famoso ${r.name}!`,
            views_count: r.rating_count * 153,
            likes_count: r.rating_count * 12,
            duration_seconds: 15,
            tags: r.categories.slice(0, 3).map(c => c.toLowerCase()),
            status: 'active' as const,
            created_at: new Date().toISOString(),
            restaurant: r,
            is_photo: true
        };
    });

    // 4. Rankings
    const rankings: RankedCategory[] = [];
    for (const config of RANKING_CONFIGS) {
        let filtered = allRestaurants;
        if (config.categoryFilter) {
            filtered = allRestaurants.filter(r =>
                r.categories?.some(c => c.toLowerCase().includes(config.categoryFilter.toLowerCase()))
            );
        }
        const sorted = [...filtered]
            .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
            .slice(0, 5);

        if (sorted.length >= 2) {
            rankings.push({
                title: config.title,
                emoji: config.emoji,
                categoryFilter: config.categoryFilter,
                restaurants: sorted
            });
        }
    }

    return { highlights, promotions, videos, rankings };
}

export async function getHighlights(lat?: number | null, lng?: number | null): Promise<Restaurant[]> {
    if (supabase) {
        if (lat != null && lng != null) {
            const { data, error } = await supabase.rpc('get_nearby_restaurants', {
                user_lat: lat,
                user_lng: lng
            });
            if (error) {
                console.error('Error fetching highlighted nearby restaurants:', error);
                return MOCK_RESTAURANTS.slice(0, 3);
            }
            return (data as Restaurant[]).filter(r => r.is_verified).slice(0, 5);
        } else {
            const { data } = await supabase
                .from('restaurants')
                .select('*')
                .eq('is_verified', true)
                .limit(5);
            return (data as Restaurant[]) || [];
        }
    }
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_RESTAURANTS.slice(0, 3)), 400));
}

export async function getPromotions(lat?: number | null, lng?: number | null): Promise<Coupon[]> {
    if (supabase) {
        if (lat != null && lng != null) {
            const { data, error } = await supabase.rpc('get_nearby_restaurants', {
                user_lat: lat,
                user_lng: lng
            });
            if (error) {
                console.error('Error fetching cheap nearby restaurants:', error);
                return MOCK_COUPONS;
            }

            // Filter cheapest (price_level 1), sort by rating, limit 5
            const cheapPlaces = (data as Restaurant[])
                .filter(r => r.price_level === 1)
                .sort((a, b) => b.rating_avg - a.rating_avg)
                .slice(0, 5);

            // Convert to mock coupons
            return cheapPlaces.map(r => ({
                id: `promo-${r.id}`,
                restaurant_id: r.id,
                title: `Oferta em ${r.name}`,
                description: r.categories.includes('Brasileira') ? 'Almoço completo com desconto' : 'Desconto especial em todo cardápio',
                discount_type: 'percentage',
                discount_value: 20,
                min_order_value: 30,
                max_redemptions: 100,
                current_redemptions: 12,
                code: `DEGUSTE20`,
                valid_from: new Date().toISOString(),
                valid_until: new Date(Date.now() + 86400000).toISOString(),
                status: 'active',
                created_at: new Date().toISOString(),
            }));
        } else {
            const { data } = await supabase
                .from('restaurants')
                .select('*')
                .eq('price_level', 1)
                .limit(5);

            const places = (data as Restaurant[]) || [];
            return places.map(r => ({
                id: `promo-${r.id}`,
                restaurant_id: r.id,
                title: `Oferta em ${r.name}`,
                description: 'Desconto especial',
                discount_type: 'percentage',
                discount_value: 15,
                min_order_value: 30,
                max_redemptions: 100,
                current_redemptions: 5,
                code: 'DEGUSTE15',
                valid_from: new Date().toISOString(),
                valid_until: new Date(Date.now() + 86400000).toISOString(),
                status: 'active',
                created_at: new Date().toISOString(),
            }));
        }
    }
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_COUPONS), 400));
}

export async function getVideos(lat?: number | null, lng?: number | null): Promise<Video[]> {
    if (supabase) {
        if (lat != null && lng != null) {
            const { data, error } = await supabase.rpc('get_nearby_restaurants', {
                user_lat: lat,
                user_lng: lng
            });

            if (error) {
                console.error('Error fetching famous nearby restaurants:', error);
                return [];
            }

            // Filter top most famous (highest rating_count), limit 10
            const famousPlaces = (data as Restaurant[])
                .sort((a, b) => b.rating_count - a.rating_count)
                .slice(0, 10);

            // Convert to mock videos using the restaurant's cover photo as thumbnail
            return famousPlaces.map(r => {
                let thumb_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80';
                try {
                    if (r.photos) {
                        const parsed = typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos;
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            thumb_url = parsed[0].url || thumb_url;
                        }
                    }
                } catch (e) { }

                return {
                    id: `video-${r.id}`,
                    restaurant_id: r.id,
                    url: '',
                    video_url: '',
                    thumbnail_url: thumb_url,
                    title: `Melhor ${r.categories[0] || 'Lugar'} da Cidade?`,
                    description: `Fomos conhecer o famoso ${r.name}!`,
                    views_count: r.rating_count * 153,
                    likes_count: r.rating_count * 12,
                    duration_seconds: 15,
                    tags: r.categories.slice(0, 3).map(c => c.toLowerCase()),
                    status: 'active',
                    created_at: new Date().toISOString(),
                    restaurant: r,
                    is_photo: true
                };
            });
        }
    }

    // Fallback exactly as before if no supabase/lat/lng
    return new Promise((resolve) => {
        setTimeout(() => {
            const videosWithRestaurants = MOCK_VIDEOS.map(v => ({
                ...v,
                restaurant: MOCK_RESTAURANTS.find(r => r.id === v.restaurant_id)
            }));
            resolve(videosWithRestaurants);
        }, 400);
    });
}

export async function getRestaurantVideos(restaurantId: string): Promise<Video[]> {
    if (supabase) {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching restaurant videos:', error);
            return [];
        }
        return data as Video[];
    }

    // Fallback to mock videos linked to this restaurant
    return new Promise((resolve) => {
        setTimeout(() => {
            const vids = MOCK_VIDEOS.filter(v => v.restaurant_id === restaurantId).map(v => ({
                ...v,
                restaurant: MOCK_RESTAURANTS.find(r => r.id === v.restaurant_id)
            }));
            resolve(vids);
        }, 400);
    });
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('category', { ascending: true });

    if (error) {
        console.error('Error fetching menu items:', error);
        return [];
    }
    return data as MenuItem[];
}


export async function getRankedCategories(lat?: number | null, lng?: number | null): Promise<RankedCategory[]> {
    if (!supabase) return [];

    try {
        let allRestaurants: Restaurant[] = [];

        if (lat != null && lng != null) {
            const { data } = await supabase.rpc('get_nearby_restaurants', {
                user_lat: lat,
                user_lng: lng
            });
            allRestaurants = (data as Restaurant[]) || [];
        } else {
            const { data } = await supabase
                .from('restaurants')
                .select('*')
                .eq('status', 'active');
            allRestaurants = (data as Restaurant[]) || [];
        }

        if (allRestaurants.length === 0) return [];

        const rankings: RankedCategory[] = [];

        for (const config of RANKING_CONFIGS) {
            let filtered = allRestaurants;
            if (config.categoryFilter) {
                filtered = allRestaurants.filter(r =>
                    r.categories?.some(c => c.toLowerCase().includes(config.categoryFilter.toLowerCase()))
                );
            }

            const sorted = [...filtered]
                .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
                .slice(0, 5);

            if (sorted.length >= 2) {
                rankings.push({
                    title: config.title,
                    emoji: config.emoji,
                    categoryFilter: config.categoryFilter,
                    restaurants: sorted
                });
            }
        }

        return rankings;
    } catch (error) {
        console.error('Error fetching ranked categories:', error);
        return [];
    }
}

export async function getAvailableLocations(): Promise<AvailableLocation[]> {
    if (supabase) {
        const { data, error } = await supabase
            .from('restaurants')
            .select('state, city, lat, lng')
            .eq('status', 'active');

        if (error || !data) {
            console.error('Error fetching available locations', error);
            return [];
        }

        const locationMap = new Map<string, Map<string, { lat: number, lng: number }>>();
        for (const r of data) {
            if (!r.state || !r.city || r.lat == null || r.lng == null) continue;
            if (!locationMap.has(r.state)) {
                locationMap.set(r.state, new Map());
            }
            const cityMap = locationMap.get(r.state)!;
            if (!cityMap.has(r.city)) {
                cityMap.set(r.city, { lat: r.lat, lng: r.lng });
            }
        }

        const result: AvailableLocation[] = [];
        for (const [state, cityMap] of locationMap.entries()) {
            const cities = Array.from(cityMap.entries()).map(([name, coords]) => ({
                name,
                lat: coords.lat,
                lng: coords.lng
            })).sort((a, b) => a.name.localeCompare(b.name));

            result.push({ state, cities });
        }
        return result.sort((a, b) => a.state.localeCompare(b.state));
    }
    return [];
}

export function getNearestCity(userLat: number, userLng: number, locations: AvailableLocation[]) {
    let nearest = { state: 'SP', city: 'Taubaté', lat: -23.0333, lng: -45.5500 };
    let minDistance = Infinity;

    // Haversine formula
    const R = 6371; // km
    const dLat = (lat2: number, lat1: number) => (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2: number, lon1: number) => (lon2 - lon1) * Math.PI / 180;

    for (const loc of locations) {
        for (const city of loc.cities) {
            const dLatVal = dLat(city.lat, userLat);
            const dLonVal = dLon(city.lng, userLng);
            const a = Math.sin(dLatVal / 2) * Math.sin(dLatVal / 2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(city.lat * Math.PI / 180) *
                Math.sin(dLonVal / 2) * Math.sin(dLonVal / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;

            if (d < minDistance) {
                minDistance = d;
                nearest = { state: loc.state, city: city.name, lat: city.lat, lng: city.lng };
            }
        }
    }
    return nearest;
}
