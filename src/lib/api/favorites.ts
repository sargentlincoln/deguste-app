import { supabase } from '../supabase';
import { Favorite, Restaurant } from '../types';
import { MOCK_RESTAURANTS } from '../mock-data';

const MOCK_FAVORITES_KEY = 'deguste_favorites';

export async function getFavorites(userId: string): Promise<Favorite[]> {
    if (supabase) {
        const { data } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId);
        return (data as Favorite[]) || [];
    }

    // Fallback: LocalStorage
    const stored = localStorage.getItem(MOCK_FAVORITES_KEY);
    if (!stored) return [];
    const allFavs = JSON.parse(stored) as Favorite[];
    return allFavs.filter(f => f.user_id === userId);
}

export async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
    if (supabase) {
        // Check if exists
        const { data } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('restaurant_id', restaurantId)
            .single();

        if (data) {
            await supabase.from('favorites').delete().eq('id', data.id);
            return false; // Removed
        } else {
            await supabase.from('favorites').insert({ user_id: userId, restaurant_id: restaurantId });
            return true; // Added
        }
    }

    // Fallback: LocalStorage
    const stored = localStorage.getItem(MOCK_FAVORITES_KEY);
    let allFavs = stored ? (JSON.parse(stored) as Favorite[]) : [];

    const existingIndex = allFavs.findIndex(f => f.user_id === userId && f.restaurant_id === restaurantId);
    let isAdded = false;

    if (existingIndex >= 0) {
        allFavs.splice(existingIndex, 1);
        isAdded = false;
    } else {
        allFavs.push({
            id: `fav-${Date.now()}`,
            user_id: userId,
            restaurant_id: restaurantId,
            created_at: new Date().toISOString()
        });
        isAdded = true;
    }

    localStorage.setItem(MOCK_FAVORITES_KEY, JSON.stringify(allFavs));
    return isAdded;
}

export async function getFavoriteIds(userId: string): Promise<string[]> {
    const favs = await getFavorites(userId);
    return favs.map(f => f.restaurant_id);
}

export async function getFavoriteRestaurants(userId: string): Promise<Restaurant[]> {
    if (supabase) {
        // Supabase join
        const { data } = await supabase
            .from('favorites')
            .select('restaurant:restaurants(*)')
            .eq('user_id', userId);

        // @ts-ignore - supabase types might be tricky with joins without generation
        return data?.map(d => d.restaurant).filter(Boolean) as Restaurant[] || [];
    }

    // Fallback: Mock
    const favs = await getFavorites(userId);
    const ids = favs.map(f => f.restaurant_id);
    return MOCK_RESTAURANTS.filter(r => ids.includes(r.id));
}
