import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // assuming node 18+ where fetch is global, or we can just use global fetch if supported
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_API_KEY) {
    console.error("Missing env variables");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TAUBATE_LAT = -23.0333;
const TAUBATE_LNG = -45.5500;
// Radius 50km
const RADIUS_METERS = 50000;

// Mapping google types to our categories
const categoryMap = {
    restaurant: 'Restaurante',
    cafe: 'Cafeteria',
    bakery: 'Padaria',
    ice_cream_shop: 'Sorveteria',
    convenience_store: 'Conveniência',
    snack_bar: 'Lanchonete',
    pizza_restaurant: 'Pizzaria',
    brazilian_restaurant: 'Brasileira',
    japanese_restaurant: 'Japonesa',
    fast_food_restaurant: 'Fast Food',
    hamburger_restaurant: 'Hamburgueria',
    bar: 'Bar'
};

function generateSlug(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function fetchPlaces() {
    console.log('Fetching places from Google Places API...');

    // We'll run a few text searches with locations to get some variety
    const queries = [
        "restaurantes em Taubaté",
        "pizzaria Vale do Paraiba",
        "cafeteria São José dos Campos",
        "sorveteria Pindamonhangaba",
        "padaria Taubaté",
        "hamburgueria Campos do Jordão",
        "comida de rua Taubaté"
    ];

    let allPlaces = [];
    const seenIds = new Set(); // to remove duplicates

    for (const query of queries) {
        console.log(`Querying: ${query}`);
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.types,places.rating,places.userRatingCount,places.priceLevel,places.photos'
            },
            body: JSON.stringify({
                textQuery: query,
                languageCode: "pt-BR",
                locationBias: {
                    circle: {
                        center: { latitude: TAUBATE_LAT, longitude: TAUBATE_LNG },
                        radius: RADIUS_METERS
                    }
                },
                maxResultCount: 20
            })
        });

        const data = await response.json();
        if (data.places) {
            for (const place of data.places) {
                if (!seenIds.has(place.id)) {
                    seenIds.add(place.id);
                    allPlaces.push(place);
                }
            }
        }
    }

    console.log(`Found ${allPlaces.length} unique places.`);
    return allPlaces;
}

async function seedToSupabase(places) {
    console.log('Seeding to Supabase...');
    let inserted = 0;

    for (const place of places) {
        // Generate data
        const name = place.displayName?.text || 'Sem nome';
        const slug = generateSlug(name) + '-' + Math.floor(Math.random() * 10000);
        const google_place_id = place.id;
        const address = place.formattedAddress || '';
        const lat = place.location?.latitude || 0;
        const lng = place.location?.longitude || 0;

        // Extract city heuristically (usually the last or second to last component in Brazil's address)
        const parts = address.split(' - ');
        let city = 'Taubaté'; // fallback
        if (parts.length > 1) {
            const cityState = parts[parts.length - 2];
            if (cityState && cityState.includes(',')) {
                city = cityState.split(',')[0].trim();
            } else {
                city = cityState.trim();
            }
        }

        const state = 'SP';
        const phone = place.nationalPhoneNumber || null;
        const website = place.websiteUri || null;
        const price_level = place.priceLevel && place.priceLevel !== "PRICE_LEVEL_FREE" ? (place.priceLevel.includes('INEXPENSIVE') ? 1 : place.priceLevel.includes('MODERATE') ? 2 : place.priceLevel.includes('EXPENSIVE') ? 3 : 4) : 2;
        const rating_avg = place.rating || 0;
        const rating_count = place.userRatingCount || 0;

        // Photos
        const photos = (place.photos || []).slice(0, 3).map(p => ({
            url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`,
            source: 'google',
            is_cover: false
        }));
        if (photos.length > 0) photos[0].is_cover = true;
        else photos.push({ url: "https://lh3.googleusercontent.com/places/AAcXr8oQ9A944H6JItl8f0R1sZpB6W9E94Z7T046E2W1_L7Xz2N2I", source: "fallback", is_cover: true });

        // Categories
        const types = place.types || [];
        const categories = types.map(t => categoryMap[t]).filter(Boolean);
        if (categories.length === 0) categories.push('Restaurante');

        const dbPayload = {
            google_place_id,
            name,
            slug,
            address,
            lat,
            lng,
            city,
            state,
            phone,
            website,
            price_level,
            rating_avg,
            rating_count,
            photos: JSON.stringify(photos),
            categories,
            status: 'active',
            is_verified: true // Marking as verified for highlight testing
        };

        // Insert or update
        const { data, error } = await supabase
            .from('restaurants')
            .upsert(dbPayload, { onConflict: 'google_place_id' })
            .select('id');

        if (error) {
            console.error(`Error inserting ${name}:`, error.message);
        } else {
            inserted++;
        }
    }

    console.log(`Successfully inserted/updated ${inserted} restaurants.`);
}

async function run() {
    const places = await fetchPlaces();
    await seedToSupabase(places);
}

run();
