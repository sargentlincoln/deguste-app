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
    console.error("Missing env variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_GOOGLE_MAPS_API_KEY)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TAUBATE_LAT = -23.0333;
const TAUBATE_LNG = -45.5500;
const RADIUS_METERS = 50000; // 50km search radius

async function fetchViralPlaces() {
    console.log('Fetching most famous/viral places from Google Places API in Vale do Paraíba...');

    // Queries designed to catch popular matching places in the region
    const queries = [
        "melhores restaurantes vale do paraiba",
        "restaurante famoso vale do paraiba",
        "hamburgueria famosa taubate e regiao",
        "pizzaria mais avaliada vale do paraiba",
        "melhor comida sao jose dos campos e regiao",
        "cafeteria viral vale do paraiba"
    ];

    let allPlaces = [];
    const seenIds = new Set();

    for (const query of queries) {
        console.log(`Querying: "${query}"`);
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types'
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
                maxResultCount: 20 // Max per query
            })
        });

        const data = await response.json();

        if (data.places) {
            for (const place of data.places) {
                // Focus on extremely popular or highly rated
                if (!seenIds.has(place.id) && place.userRatingCount > 100 && place.rating >= 4.0) {
                    seenIds.add(place.id);
                    allPlaces.push(place);
                }
            }
        }
    }

    // Sort by most reviewed (as a proxy for "viral" or famousness)
    allPlaces.sort((a, b) => b.userRatingCount - a.userRatingCount);

    // Take the top 10 most viral
    const topViral = allPlaces.slice(0, 10);

    console.log(`Found ${allPlaces.length} highly rated places. Selected top ${topViral.length} for viral section.`);
    return topViral;
}

// categoryMap to fall back to if needed (copied from seed logic)
const categoryMap = {
    restaurant: 'Restaurante', cafe: 'Cafeteria', bakery: 'Padaria',
    snack_bar: 'Lanchonete', pizza_restaurant: 'Pizzaria',
    brazilian_restaurant: 'Brasileira', japanese_restaurant: 'Japonesa',
    hamburger_restaurant: 'Hamburgueria', bar: 'Bar',
    ice_cream_shop: 'Sorveteria', fast_food_restaurant: 'Fast Food'
};

function generateSlug(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function syncViralToDatabase(places) {
    console.log('Syncing viral places to database...');
    let successCount = 0;

    for (let index = 0; index < places.length; index++) {
        const place = places[index];
        const name = place.displayName?.text || 'Sem nome';
        const google_place_id = place.id;

        // Ensure the restaurant exists in the main table first.
        // We will do a minimal upsert to ensure foreign key constraints hold.
        const photos = (place.photos || []).slice(0, 3).map(p => ({
            url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`,
            source: 'google',
            is_cover: false
        }));
        if (photos.length > 0) photos[0].is_cover = true;

        const categories = (place.types || []).map(t => categoryMap[t]).filter(Boolean);
        if (categories.length === 0) categories.push('Restaurante');

        // Extract basic city from address
        const address = place.formattedAddress || '';
        const parts = address.split(' - ');
        let city = 'Taubaté';
        if (parts.length > 1 && parts[parts.length - 2]) {
            city = parts[parts.length - 2].split(',')[0].trim();
        }

        const restaurantPayload = {
            google_place_id,
            name,
            slug: generateSlug(name) + '-' + Math.floor(Math.random() * 1000),
            address,
            city,
            state: 'SP',
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0,
            rating_avg: place.rating || 0,
            rating_count: place.userRatingCount || 0,
            photos: JSON.stringify(photos),
            categories,
            status: 'active'
        };

        // 1. Insert/Update Restaurant
        const { data: restData, error: restError } = await supabase
            .from('restaurants')
            .upsert(restaurantPayload, { onConflict: 'google_place_id' })
            .select('id')
            .single();

        if (restError || !restData) {
            console.error(`Error ensuring restaurant ${name}:`, restError?.message);
            continue;
        }

        const restaurantId = restData.id;

        // 2. Create a "Viral Video" record mapping to this restaurant
        // This makes the restaurant appear in the "Virais da Semana" section (the videos table)
        // We use the restaurant's best photo as the thumbnail, and we can link to the restaurant itself.

        const thumbnailUrl = photos.length > 0 ? photos[0].url : 'https://lh3.googleusercontent.com/places/AAcXr8oQ9A944H6JItl8f0R1sZpB6W9E94Z7T046E2W1_L7Xz2N2I';

        // Let's create an engaging title based on its rank and name
        const viralTitles = [
            `O queridinho da galera! 😍`,
            `Provamos o famoso ${name} 🔥`,
            `${place.rating} estrelas no ${city}! ⭐`,
            `Você precisa conhecer! 🤤`,
            `Top 10 ${city} 🏆`,
            `O ${categories[0] || 'Restaurante'} do momento! 📈`
        ];

        const randomTitle = viralTitles[Math.floor(Math.random() * viralTitles.length)];

        // Generate a pseudo-video payload
        // We set status to 'viral' or 'active' depending on the constraint. The table supports 'active'.
        const videoPayload = {
            restaurant_id: restaurantId,
            title: randomTitle,
            description: `Restaurante super bem avaliado na região! (${place.userRatingCount} avaliações)`,
            // we don't have a real video right now, we can put a placeholder or maybe an animation later
            video_url: 'https://v.ftcdn.net/06/68/76/93/240_F_668769395_17p3N2L521iZg8CqYnI8A5tM5vYdG4eU_ST.mp4',
            thumbnail_url: thumbnailUrl,
            duration_seconds: 15, // fake duration
            views_count: Math.floor(Math.random() * 50000) + 10000,
            likes_count: Math.floor(Math.random() * 5000) + 500,
            status: 'active'
        };

        // Check if an existing video for this restaurant exists to avoid duplicates
        const { data: existingVideos } = await supabase
            .from('videos')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .limit(1);

        if (existingVideos && existingVideos.length > 0) {
            // Update existing viral video
            const { error: updateError } = await supabase
                .from('videos')
                .update(videoPayload)
                .eq('id', existingVideos[0].id);

            if (updateError) console.error(`Failed to update viral video for ${name}:`, updateError.message);
            else successCount++;
        } else {
            // Insert new viral video
            const { error: insertError } = await supabase
                .from('videos')
                .insert(videoPayload);

            if (insertError) console.error(`Failed to insert viral video for ${name}:`, insertError.message);
            else successCount++;
        }
    }

    console.log(`\n✅ Successfully synced ${successCount} viral restaurants as videos!`);
}

async function run() {
    try {
        const places = await fetchViralPlaces();
        await syncViralToDatabase(places);
    } catch (e) {
        console.error("Error running viral sync:", e);
    }
}

run();
