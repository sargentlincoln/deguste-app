/**
 * Centralized photo parsing utility.
 * Handles photos coming from Supabase (JSON string), Google Places (array), or null.
 */

export interface ParsedPhoto {
    id: string;
    url: string;
    source: string;
    is_cover: boolean;
}

const FALLBACK_QUALITY_PHOTOS = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338988692286?w=800&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80'
];

/**
 * Safely parses restaurant photos from any format.
 * Returns an array of photo objects, never null/undefined.
 * Pushes fallback rich photos to ensure the carousel always looks complete.
 */
export function parsePhotos(val: any): ParsedPhoto[] {
    let result: ParsedPhoto[] = [];

    if (val) {
        if (typeof val === 'string') {
            try {
                let parsed = JSON.parse(val);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) result = parsed;
            } catch { }
        } else if (Array.isArray(val)) {
            result = [...val];
        }
    }

    // Only add a single fallback if there are absolutely zero real photos
    if (result.length === 0) {
        result.push({
            id: 'fallback-0',
            url: FALLBACK_QUALITY_PHOTOS[0],
            source: 'deguste_fallback',
            is_cover: true
        });
    }

    return result;
}

/**
 * Gets the cover photo URL from a photos value (string, array, or null).
 * Returns empty string if no photo found.
 */
export function getCoverPhotoUrl(val: any): string {
    const photos = parsePhotos(val);
    if (photos.length === 0) return '';
    const cover = photos.find(p => p.is_cover);
    return cover?.url || photos[0]?.url || '';
}

/**
 * Category-based fallback images for menu items.
 * Uses high-quality food photos from Unsplash.
 */
const MENU_FALLBACK_IMAGES: Record<string, string> = {
    'carnes': 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
    'churrasco': 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
    'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
    'japonesa': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'pizzas': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'massa': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&q=80',
    'italiana': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&q=80',
    'hamburger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'hamburguer': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'lanche': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'lanches': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'sobremesa': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
    'sobremesas': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
    'doce': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
    'cafe': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    'café': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    'bebida': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    'bebidas': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    'drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
    'refrigerante': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
    'coca': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
    'suco': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
    'cerveja': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80',
    'chopp': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80',
    'salada': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    'saudavel': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    'frutos do mar': 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&q=80',
    'peixe': 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&q=80',
    'brasileira': 'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?w=400&q=80',
    'entrada': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
    'entradas': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
    'petisco': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
    'acai': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80',
    'açaí': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80',
    'prato': 'https://images.unsplash.com/photo-1544025162-8a1152575293?w=400&q=80',
    'pratos': 'https://images.unsplash.com/photo-1544025162-8a1152575293?w=400&q=80',
    'principais': 'https://images.unsplash.com/photo-1544025162-8a1152575293?w=400&q=80',
};

const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';

/**
 * Gets a contextual fallback image for a menu item based on its category or name.
 */
export function getMenuItemImage(imageUrl: string | null, category: string | null, name: string | null): string {
    // Check if the image from DB is one of the generic ones we injected globally
    // Basically ANY unsplash image in our DB is a mock image, as real users upload to storage
    // and real places come with google places URLs
    const isGenericDbImage = imageUrl && imageUrl.includes('images.unsplash.com');

    // If it's a real non-generic custom photo, use it (e.g., from Supabase Storage)
    if (imageUrl && !isGenericDbImage) return imageUrl;

    const searchTerms = [
        (category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    ].join(' ');

    for (const [key, url] of Object.entries(MENU_FALLBACK_IMAGES)) {
        const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (searchTerms.includes(normalizedKey)) {
            return url;
        }
    }

    return DEFAULT_FOOD_IMAGE;
}
