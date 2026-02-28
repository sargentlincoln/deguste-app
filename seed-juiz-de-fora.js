import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import path from 'path';

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

const JF_LAT = -21.7642;
const JF_LNG = -43.3496;
const RADIUS_METERS = 20000;

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
    console.log('Fetching places from Google Places API for Juiz de Fora...');

    const queries = [
        "restaurantes em Juiz de Fora",
        "pizzaria Juiz de Fora",
        "cafeteria Juiz de Fora",
        "sorveteria Juiz de Fora",
        "padaria Juiz de Fora",
        "hamburgueria Juiz de Fora"
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
                        center: { latitude: JF_LAT, longitude: JF_LNG },
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

    console.log(`Found ${allPlaces.length} unique places in JF.`);
    return allPlaces;
}

async function seedToSupabase(places) {
    console.log('Seeding to Supabase...');
    let inserted = 0;

    for (const place of places) {
        const name = place.displayName?.text || 'Sem nome';
        const slug = generateSlug(name) + '-' + Math.floor(Math.random() * 10000);
        const google_place_id = place.id;
        const address = place.formattedAddress || 'Juiz de Fora - MG';
        const lat = place.location?.latitude || JF_LAT;
        const lng = place.location?.longitude || JF_LNG;

        const city = 'Juiz de Fora';
        const state = 'MG';
        const phone = place.nationalPhoneNumber || null;
        const website = place.websiteUri || null;
        const price_level = place.priceLevel && place.priceLevel !== "PRICE_LEVEL_FREE" ? (place.priceLevel.includes('INEXPENSIVE') ? 1 : place.priceLevel.includes('MODERATE') ? 2 : place.priceLevel.includes('EXPENSIVE') ? 3 : 4) : 2;
        const rating_avg = place.rating || 0;
        const rating_count = place.userRatingCount || 0;

        const photos = (place.photos || []).slice(0, 3).map(p => ({
            url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`,
            source: 'google',
            is_cover: false
        }));
        if (photos.length > 0) photos[0].is_cover = true;
        else photos.push({ url: "https://lh3.googleusercontent.com/places/AAcXr8oQ9A944H6JItl8f0R1sZpB6W9E94Z7T046E2W1_L7Xz2N2I", source: "fallback", is_cover: true });

        const open_status = place.currentOpeningHours ? (place.currentOpeningHours.openNow ? 'open' : 'closed') : 'open';
        const opening_hours = place.currentOpeningHours?.weekdayDescriptions || [];

        let categories = [];
        if (place.types) {
            for (const type of place.types) {
                if (categoryMap[type]) categories.push(categoryMap[type]);
            }
        }
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
            is_verified: true
        };

        const { data, error } = await supabase
            .from('restaurants')
            .upsert(dbPayload, { onConflict: 'google_place_id' })
            .select('id');

        if (error) {
            console.error(`Error inserting ${name}:`, error.message);
        } else if (data && data.length > 0) {
            inserted++;

            const restaurantId = data[0].id;

            // Seed some random menu items
            const items = [
                { name: "Prato Principal " + Math.floor(Math.random() * 10), description: "Delicioso prato feito com ingredientes frescos.", price: Math.floor(Math.random() * 50) + 30, category: "Pratos" },
                { name: "Sobremesa Especial", description: "Doces artesanais", price: Math.floor(Math.random() * 15) + 15, category: "Sobremesas" },
                { name: "Drink Refrescante", description: "Bebida elaborada com frutas da estação", price: Math.floor(Math.random() * 10) + 10, category: "Bebidas" }
            ];

            for (const item of items) {
                await supabase.from('menu_items').insert({
                    restaurant_id: restaurantId,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image_url: null,
                    category: item.category,
                    is_popular: Math.random() > 0.5
                });
            }
        }
    }

    console.log(`Successfully inserted ${inserted} restaurants with menu items.`);
}

async function run() {
    try {
        const places = await fetchPlaces();
        if (places.length > 0) {
            await seedToSupabase(places);
            console.log("Seeding Juiz de Fora complete!");
        } else {
            console.log("No places found to seed.");
        }
    } catch (e) {
        console.error("Fatal error:", e);
    }
}

run();
