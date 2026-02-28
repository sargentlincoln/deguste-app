// ===== DEGUSTE — Domain Types (from gemini.md schema) =====

export interface AvailableLocation {
    state: string;
    cities: { name: string; lat: number; lng: number }[];
}

export interface Restaurant {
    id: string;
    google_place_id?: string;
    name: string;
    slug: string;
    description: string | null;
    address: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    phone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    website: string | null;
    categories: string[];
    tags: string[];
    price_level: 1 | 2 | 3 | 4;
    rating_avg: number;
    rating_count: number;
    photos: RestaurantPhoto[];
    opening_hours: Record<string, { open: string; close: string }>;
    attributes: RestaurantAttributes;
    status: 'active' | 'pending' | 'inactive';
    is_verified: boolean;
    badges?: string[];
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
    distance_meters?: number;
    google_reviews?: any[];
}

export interface RestaurantPhoto {
    id: string;
    url: string;
    source: 'google' | 'upload' | 'cloudinary';
    is_cover: boolean;
}

export interface RestaurantAttributes {
    pet_friendly: boolean;
    outdoor_seating: boolean;
    wheelchair_accessible: boolean;
    reservation_available: boolean;
    delivery: boolean;
    wifi: boolean;
    parking: boolean;
    vegan_options: boolean;
    vegetarian_options: boolean;
    live_music: boolean;
}

export interface User {
    id: string;
    auth_id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    preferences: UserPreferences;
    stats: UserStats;
    points: number;
    level: string;
    created_at: string;
    updated_at: string;
}

export interface UserPreferences {
    favorite_cuisines: string[];
    dietary_restrictions: string[];
    price_preference: 1 | 2 | 3 | 4;
    search_radius_km: number;
}

export interface UserStats {
    total_points: number;
    current_streak: number;
    max_streak: number;
    total_savings: number;
    reviews_count: number;
}

export interface Video {
    id: string;
    restaurant_id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string;
    duration_seconds: number;
    views_count: number;
    likes_count: number;
    tags: string[];
    status: 'active' | 'pending' | 'removed';
    created_at: string;
    restaurant?: Restaurant;
    is_photo?: boolean;
}

export interface Coupon {
    id: string;
    restaurant_id: string;
    code: string;
    title: string;
    description: string;
    discount_type: 'percentage' | 'fixed' | 'freebie';
    discount_value: number;
    min_order_value: number | null;
    max_redemptions: number | null;
    current_redemptions: number;
    valid_from: string;
    valid_until: string;
    status: 'active' | 'expired' | 'paused';
    created_at: string;
}

export interface Favorite {
    id: string;
    user_id: string;
    restaurant_id: string;
    created_at: string;
    restaurant?: Restaurant;
}

export interface Review {
    id: string;
    user_id: string;
    restaurant_id: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string | null;
    menu_item_id?: string | null;
    photo_url?: string | null;
    created_at: string;
}

export interface SearchFilters {
    query?: string;
    categories?: string[];
    vibes?: string[];
    price_level?: number;
    max_distance_km?: number;
    open_now?: boolean;
    attributes?: Partial<RestaurantAttributes>;
    city?: string;
    state?: string;
    is_perola?: boolean;
    has_promotions?: boolean;
    lat?: number;
    lng?: number;
    sort_by?: 'rating' | 'distance' | 'price' | 'popularity';
}

export interface SearchResult {
    restaurants: Restaurant[];
    distance: number;
    ai_interpretation?: string;
}

// ===== DEGUSTE — Phase 7: Chat Assistant Types =====

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    suggestedRestaurants?: Restaurant[]; // Optional: if the assistant suggests places
}

export interface ChatState {
    messages: ChatMessage[];
    isOpen: boolean;
    isTyping: boolean;
}

export interface MenuItem {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    is_active: boolean;
    created_at?: string;
}

export interface Order {
    id: string;
    user_id: string;
    restaurant_id: string;
    status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
    total_amount: number;
    delivery_address: string | null;
    created_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    special_instructions: string | null;
}

// ===== DEGUSTE — Restaurant Guru Enhancements =====

export interface Badge {
    id: string;
    restaurant_id: string;
    title: string;
    month_year: string;
    icon_url: string | null;
}

export interface RankedCategory {
    title: string;
    emoji: string;
    categoryFilter: string;
    restaurants: Restaurant[];
}

// Extended Restaurant type with optional search context
export interface RestaurantWithDish extends Restaurant {
    matched_dish?: string;
}
