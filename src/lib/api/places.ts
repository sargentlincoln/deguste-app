import { Restaurant } from '../types';
import { getMenuItemImage } from '../photoUtils';

/**
 * Returns a valid Google Places API photo URL if a generic resource name is provided.
 */
export function getPlacePhotoUrl(photoName: string | undefined): string | undefined {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!photoName || !apiKey) return undefined;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`;
}

/**
 * Food-related place types from the Google Places API.
 */
const FOOD_TYPES = new Set([
    'restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop',
    'fast_food_restaurant', 'meal_delivery', 'meal_takeaway',
    'pizza_restaurant', 'hamburger_restaurant', 'sushi_restaurant',
    'ice_cream_shop', 'sandwich_shop', 'steak_house',
    'seafood_restaurant', 'japanese_restaurant', 'italian_restaurant',
    'brazilian_restaurant', 'mexican_restaurant', 'chinese_restaurant',
    'indian_restaurant', 'thai_restaurant', 'korean_restaurant',
    'french_restaurant', 'greek_restaurant', 'turkish_restaurant',
    'vegetarian_restaurant', 'vegan_restaurant', 'brunch_restaurant',
    'breakfast_restaurant', 'dessert_restaurant', 'food_court',
    'juice_shop', 'tea_house', 'pub', 'wine_bar', 'buffet_restaurant',
    'barbecue_restaurant', 'ramen_restaurant', 'acai_shop',
    'american_restaurant', 'asian_restaurant', 'middle_eastern_restaurant',
    'spanish_restaurant', 'indonesian_restaurant', 'vietnamese_restaurant',
    'mediterranean_restaurant', 'lebanese_restaurant'
]);

/**
 * Converts Google Places regularOpeningHours to our opening_hours format.
 */
function mapOpeningHours(place: any): Record<string, { open: string; close: string }> {
    const hours: Record<string, { open: string; close: string }> = {};
    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    try {
        const periods = place.regularOpeningHours?.periods;
        if (periods && Array.isArray(periods)) {
            for (const period of periods) {
                const dayIdx = period.open?.day;
                if (dayIdx === undefined || dayIdx === null) continue;
                const dayName = dayNames[dayIdx] || `dia${dayIdx}`;
                const openH = String(period.open?.hour ?? 0).padStart(2, '0');
                const openM = String(period.open?.minute ?? 0).padStart(2, '0');
                const closeH = String(period.close?.hour ?? 23).padStart(2, '0');
                const closeM = String(period.close?.minute ?? 59).padStart(2, '0');
                hours[dayName] = { open: `${openH}:${openM}`, close: `${closeH}:${closeM}` };
            }
        }
    } catch (e) {
        // Silently fail — hours will be empty
    }
    return hours;
}

/**
 * Maps raw Google Places JSON to the Deguste App Restaurant schema.
 */
export function mapGooglePlaceToRestaurant(p: any, fallbackCity: string = 'Taubaté'): Restaurant {
    // Try to find the city in address components
    let detectedCity = '';

    if (p.addressComponents && Array.isArray(p.addressComponents)) {
        // Order of preference: locality, sublocality_level_1, administrative_area_level_2
        const locality = p.addressComponents.find((c: any) => c.types?.includes('locality'));
        const sublocality = p.addressComponents.find((c: any) => c.types?.includes('sublocality_level_1'));
        const adminArea2 = p.addressComponents.find((c: any) => c.types?.includes('administrative_area_level_2'));

        if (locality) detectedCity = locality.longName || locality.longText || '';
        else if (sublocality) detectedCity = sublocality.longName || sublocality.longText || '';
        else if (adminArea2) detectedCity = adminArea2.longName || adminArea2.longText || '';
    }

    // Last resort: search in formatted address for known cities
    if (!detectedCity) {
        const addr = (p.formattedAddress || "").toLowerCase();
        const cities = ['campos do jordão', 'são josé dos campos', 'taubaté', 'pindamonhangaba', 'tremembé', 'caçapava', 'ubatuba', 'juiz de fora'];
        const found = cities.find(c => addr.includes(c));
        if (found) {
            detectedCity = found.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else {
            detectedCity = addr.split('-')[0].trim() || 'Desconhecida';
        }
    }

    const catName = p.primaryType ? p.primaryType.replace(/_/g, ' ') : "Restaurante";

    // Map maximum of 3 photos to drastically reduce Google Places Photo API costs ($0.007 per photo)
    const MAX_PHOTOS = 3;
    const photos = (p.photos && Array.isArray(p.photos))
        ? p.photos.slice(0, MAX_PHOTOS).map((photo: any, idx: number) => ({
            id: String(idx),
            url: getPlacePhotoUrl(photo.name) || '',
            source: 'google' as const,
            is_cover: idx === 0
        }))
        : [{ id: '0', url: getMenuItemImage(null, catName, p.displayName?.text || ''), source: 'google' as const, is_cover: true }];

    let convertedPriceLevel: 1 | 2 | 3 | 4 = 2;
    if (p.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') convertedPriceLevel = 1;
    else if (p.priceLevel === 'PRICE_LEVEL_MODERATE') convertedPriceLevel = 2;
    else if (p.priceLevel === 'PRICE_LEVEL_EXPENSIVE') convertedPriceLevel = 3;
    else if (p.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') convertedPriceLevel = 4;


    // Extract phone number
    const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || null;

    // Map opening hours
    const openingHours = mapOpeningHours(p);

    return {
        id: `gplace_${p.id || Math.random().toString(36).substr(2, 9)}`,
        name: p.displayName?.text || "Estabelecimento",
        slug: p.id || Math.random().toString(),
        description: p.formattedAddress || "",
        photos,
        rating_avg: p.rating || 4.5,
        rating_count: p.userRatingCount || 0,
        address: p.formattedAddress || "",
        phone,
        whatsapp: null,
        instagram: null,
        website: p.websiteUri || null,
        city: detectedCity,
        state: 'SP',
        lat: p.location?.latitude || -23.023419,
        lng: p.location?.longitude || -45.556276,
        price_level: convertedPriceLevel,
        categories: [catName.charAt(0).toUpperCase() + catName.slice(1)],
        tags: [],
        opening_hours: openingHours,
        status: 'active',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attributes: {
            pet_friendly: false,
            outdoor_seating: false,
            wheelchair_accessible: false,
            reservation_available: false,
            live_music: false,
            parking: false,
            vegan_options: false,
            vegetarian_options: false,
            delivery: false,
            wifi: false
        },
        google_reviews: p.reviews || []
    };
}

export async function fetchPlacesByQuery(query: string, cityFallback: string = 'Taubaté', lat?: number | null, lng?: number | null): Promise<Restaurant[]> {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !query || query.length < 2) return [];

    try {
        let searchQuery = query.trim();
        searchQuery = searchQuery
            .replace(/perto\s+de\s+mim/gi, '')
            .replace(/pra\s+mim/gi, '')
            .replace(/aberto\s+agora/gi, '')
            .replace(/próximo/gi, '')
            .trim();

        if (!searchQuery || searchQuery.length < 2) {
            searchQuery = 'restaurante';
        }

        const knownCities = ['taubaté', 'taubate', 'pindamonhangaba', 'pinda', 'tremembé', 'tremembe', 'caçapava', 'cacapava', 'são josé dos campos', 'sjc', 'ubatuba', 'campos do jordão', 'juiz de fora'];
        const hasCity = knownCities.some(city => searchQuery.toLowerCase().includes(city));

        if (!hasCity && cityFallback) {
            searchQuery = `${searchQuery} em ${cityFallback}`;
        }

        // Use provided coordinates or fallback to Taubaté
        const biasLat = lat ?? -23.023419;
        const biasLng = lng ?? -45.556276;

        const url = `https://places.googleapis.com/v1/places:searchText`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.location,places.photos,places.reviews,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.regularOpeningHours,places.currentOpeningHours,places.addressComponents'
            },
            body: JSON.stringify({
                textQuery: searchQuery,
                locationBias: {
                    circle: {
                        center: { latitude: biasLat, longitude: biasLng },
                        radius: 5000.0 // 5km search radius
                    }
                },
                languageCode: 'pt-BR'
            })
        });

        if (response.ok) {
            const placeData = await response.json();
            if (placeData.places && Array.isArray(placeData.places)) {
                // Expanded acceptable types to allow bakeries, dessert shops, generic food places
                const expandedFoodTypes = new Set([
                    ...FOOD_TYPES, 'food', 'store', 'grocery_or_supermarket', 'supermarket', 'convenience_store'
                ]);

                const foodPlaces = placeData.places.filter((p: any) => {
                    if (!p.primaryType) return true;
                    return expandedFoodTypes.has(p.primaryType);
                }).filter((p: any) => {
                    // Filter out places that are currently closed if we have opening hours data
                    if (p.currentOpeningHours && p.currentOpeningHours.openNow === false) return false;
                    return true;
                });

                // Map the results
                const mappedPlaces = foodPlaces.map((p: any) => mapGooglePlaceToRestaurant(p, cityFallback));

                // If we have precise coordinates (lat/lng), do NOT filter strictly by city string.
                // Trust the 5km locationBias radius.
                // If we DON'T have user coordinates (using the fallback default), then apply strict city filter
                // to avoid showing SP places in Taubaté if the text search goes crazy.
                if (lat && lng) {
                    return mappedPlaces;
                } else {
                    const normalizedTargetCity = cityFallback.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    return mappedPlaces.filter(r => {
                        const normalizedResultCity = r.city.toLowerCase()
                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return normalizedResultCity.includes(normalizedTargetCity);
                    });
                }
            }
        } else {
            console.error("fetchPlacesByQuery API error:", response.status, await response.text());
        }
    } catch (err) {
        console.error("fetchPlacesByQuery Exception:", err);
    }
    return [];
}
