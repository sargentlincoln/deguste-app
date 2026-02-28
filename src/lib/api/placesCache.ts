import { Restaurant } from '../types';

const CACHE_KEY = 'deguste_places_cache';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
    place: Restaurant;
    timestamp: number;
}

/**
 * Persists dynamically retrieved Google Places restaurants to localStorage.
 * This allows RestaurantDetails to show Google Places data without
 * needing to re-fetch from Supabase (where these places don't exist),
 * surviving page reloads.
 */
function getStorageCache(): Record<string, CacheEntry> {
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.warn("Failed to read places cache from localStorage", e);
    }
    return {};
}

function setStorageCache(cache: Record<string, CacheEntry>) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn("Failed to write places cache to localStorage", e);
    }
}

export function cachePlaces(restaurants: Restaurant[]): void {
    const cache = getStorageCache();
    const now = Date.now();

    // Clean up expired entries
    const validCache: Record<string, CacheEntry> = {};
    for (const [id, entry] of Object.entries(cache)) {
        if (now - entry.timestamp < CACHE_EXPIRY_MS) {
            validCache[id] = entry;
        }
    }

    // Add new entries
    restaurants.forEach(r => {
        validCache[r.id] = { place: r, timestamp: now };
    });

    setStorageCache(validCache);
}

export function getCachedPlace(id: string): Restaurant | null {
    const cache = getStorageCache();
    const entry = cache[id];

    if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY_MS) {
        return entry.place;
    }

    return null;
}

export function isGooglePlaceId(id: string): boolean {
    return id.startsWith('gplace_');
}
