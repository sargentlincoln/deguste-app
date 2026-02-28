import { Restaurant, User, Video, Coupon } from './types';

// Mock data — used as fallback when Supabase is unavailable.
// All real data comes from Supabase.

export const MOCK_USER: User = {
    id: 'mock-user-001',
    auth_id: 'mock-auth-001',
    name: 'Usuário Deguste',
    email: 'user@deguste.app',
    avatar_url: null,
    preferences: {
        favorite_cuisines: [],
        dietary_restrictions: [],
        price_preference: 2,
        search_radius_km: 15,
    },
    stats: {
        total_points: 0,
        current_streak: 0,
        max_streak: 0,
        total_savings: 0,
        reviews_count: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export const MOCK_RESTAURANTS: Restaurant[] = [];

export const MOCK_VIDEOS: Video[] = [];

export const MOCK_COUPONS: Coupon[] = [];
