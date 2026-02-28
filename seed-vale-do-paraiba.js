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
    bar: 'Bar',
    steakhouse: 'Churrascaria',
    seafood_restaurant: 'Frutos do Mar',
    italian_restaurant: 'Italiana'
};

function generateSlug(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

const CITIES = [
    "Taubaté",
    "Tremembé",
    "Ubatuba",
    "São José dos Campos",
    "São Luiz do Paraitinga",
    "Santo Antônio do Pinhal",
    "Redenção da Serra",
    "Pindamonhangaba",
    "Natividade da Serra",
    "Campos do Jordão",
    "Caçapava",
    "Aparecida"
];

const SEARCH_TERMS = [
    "restaurantes",
    "pizzaria",
    "hamburgueria",
    "comida japonesa",
    "cafeteria",
    "padaria",
    "fast food",
    "bar",
    "churrascaria",
    "sorveteria"
];

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.nationalPhoneNumber,places.websiteUri,places.types,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.reviews,places.regularOpeningHours,places.editorialSummary,nextPageToken';

async function fetchPlacesForCity(city) {
    console.log(`\n=== Fetching places for ${city} ===`);
    let allPlaces = [];
    const seenIds = new Set();

    for (const term of SEARCH_TERMS) {
        const query = `${term} em ${city}, SP`;
        console.log(`Querying: ${query}`);

        let nextPageToken = null;
        let pageCount = 0;

        do {
            const body = {
                textQuery: query,
                languageCode: "pt-BR",
                maxResultCount: 20
            };
            if (nextPageToken) {
                body.pageToken = nextPageToken;
            }

            try {
                const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_API_KEY,
                        'X-Goog-FieldMask': FIELD_MASK
                    },
                    body: JSON.stringify(body)
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

                nextPageToken = data.nextPageToken;
                pageCount++;

                // Sleep to avoid rate limits
                await new Promise(r => setTimeout(r, 1000));

            } catch (err) {
                console.error(`Error querying ${query}:`, err.message);
                break;
            }
            // Fetch up to 3 pages per term to ensure we get a lot of places
        } while (nextPageToken && pageCount < 3);
    }

    console.log(`Found ${allPlaces.length} unique places in ${city} (raw search).`);
    return allPlaces;
}

// Function to extract attributes/characteristics from text
function extractAttributesFromText(text) {
    if (!text) return {};

    const lowerText = text.toLowerCase();
    const attrs = {};

    if (lowerText.includes('aniversário') || lowerText.includes('festa') || lowerText.includes('comemorar')) attrs.good_for_birthdays = true;
    if (lowerText.includes('romântico') || lowerText.includes('casal') || lowerText.includes('namorados')) attrs.romantic = true;
    if (lowerText.includes('vintage') || lowerText.includes('retrô') || lowerText.includes('antigo')) attrs.vintage = true;
    if (lowerText.includes('música ao vivo') || lowerText.includes('banda') || lowerText.includes('show')) attrs.live_music = true;
    if (lowerText.includes('clássica') || lowerText.includes('piano') || lowerText.includes('jazz')) attrs.classical_music = true;
    if (lowerText.includes('pet friendly') || lowerText.includes('cachorro') || lowerText.includes('pet')) attrs.pet_friendly = true;
    if (lowerText.includes('kids') || lowerText.includes('criança') || lowerText.includes('brinquedo') || lowerText.includes('espaço kids')) attrs.kids_friendly = true;
    if (lowerText.includes('natureza') || lowerText.includes('ar livre') || lowerText.includes('verde') || lowerText.includes('árvores')) attrs.outdoor_seating = true;
    if (lowerText.includes('acessível') || lowerText.includes('cadeirante') || lowerText.includes('acessibilidade')) attrs.wheelchair_accessible = true;
    if (lowerText.includes('estacionamento') || lowerText.includes('vaga') || lowerText.includes('valet')) attrs.parking_available = true;
    if (lowerText.includes('vegano') || lowerText.includes('vegetariano') || lowerText.includes('plant based')) attrs.vegan_options = true;
    if (lowerText.includes('wi-fi') || lowerText.includes('trabalhar') || lowerText.includes('tomada')) attrs.wifi_available = true;
    if (lowerText.includes('requintado') || lowerText.includes('chique') || lowerText.includes('luxo') || lowerText.includes('fino')) attrs.upscale = true;

    return attrs;
}

async function seedToSupabase(places, targetCity) {
    if (places.length === 0) return;

    console.log(`Seeding places to Supabase...`);
    let inserted = 0;

    for (const place of places) {
        // 1. EXTRACT REAL CITY FROM ADDRESS COMPONENTS
        let realCity = targetCity;
        if (place.addressComponents) {
            // Usually city is administrative_area_level_2
            const cityComp = place.addressComponents.find(c => c.types?.includes("administrative_area_level_2"));
            if (cityComp) {
                realCity = cityComp.longText;
            }
        }

        // If the real city doesn't match the target AND isn't another valid city, we might skip to avoid junk, 
        // but let's just save the REAL city. That corrects the previous bug.

        const name = place.displayName?.text || 'Sem nome';
        const slug = generateSlug(name) + '-' + Math.floor(Math.random() * 10000);
        const google_place_id = place.id;
        const address = place.formattedAddress || '';
        const lat = place.location?.latitude || 0;
        const lng = place.location?.longitude || 0;
        const state = 'SP';

        let phone = null;
        if (place.nationalPhoneNumber && place.nationalPhoneNumber.includes(" ")) {
            phone = place.nationalPhoneNumber;
        }

        const website = place.websiteUri || null;
        const price_level = place.priceLevel && place.priceLevel !== "PRICE_LEVEL_FREE"
            ? (place.priceLevel.includes('INEXPENSIVE') ? 1 : place.priceLevel.includes('MODERATE') ? 2 : place.priceLevel.includes('EXPENSIVE') ? 3 : 4)
            : 2;

        const rating_avg = place.rating || 0;
        const rating_count = place.userRatingCount || 0;

        // Extract maximum photos from API (Usually 10)
        let photos = (place.photos || []).map((p, idx) => ({
            name: p.name,
            url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`,
            source: 'google',
            is_cover: idx === 0
        }));

        if (photos.length === 0) {
            photos = [{
                url: "https://lh3.googleusercontent.com/places/AAcXr8oQ9A944H6JItl8f0R1sZpB6W9E94Z7T046E2W1_L7Xz2N2I",
                source: "fallback",
                is_cover: true
            }];
        }

        const types = place.types || [];
        const categories = types.map(t => categoryMap[t]).filter(Boolean);
        if (categories.length === 0) categories.push('Restaurante');

        // Extract AI Summary (Editorial Summary)
        const editorialSummary = place.editorialSummary?.text || null;

        // Extract Opening Hours
        let openingHours = null;
        if (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions) {
            openingHours = {
                weekday_descriptions: place.regularOpeningHours.weekdayDescriptions,
                open_now: place.regularOpeningHours.openNow
            };
        }

        // Extract Reviews
        const reviews = (place.reviews || []).map(r => ({
            author_name: r.authorAttribution?.displayName || 'Usuário Google',
            author_photo: r.authorAttribution?.photoUri || null,
            rating: r.rating,
            text: r.text?.text || '',
            time: r.publishTime
        }));

        // Build composite text block to extract attributes and tags
        const allTextData = [
            editorialSummary || '',
            ...reviews.map(r => r.text)
        ].join(' ');

        const attributes = extractAttributesFromText(allTextData);

        const dbPayload = {
            google_place_id,
            name,
            slug,
            address,
            lat,
            lng,
            city: realCity, // Guaranteed exact city from format
            state,
            phone,
            price_level,
            rating_avg,
            rating_count,
            photos: JSON.stringify(photos),
            categories,
            description: editorialSummary, // Storing AI summary in description
            opening_hours: openingHours ? JSON.stringify(openingHours) : null,
            attributes: JSON.stringify(attributes),
            google_reviews: JSON.stringify(reviews),
            status: 'active',
            is_verified: true
        };

        const { data, error } = await supabase
            .from('restaurants')
            .upsert(dbPayload, { onConflict: 'google_place_id' })
            .select('id');

        if (error) {
            console.error(`Error inserting ${name} (${realCity}):`, error.message);
        } else {
            inserted++;
        }
    }

    console.log(`Successfully inserted/updated ${inserted} restaurants in ${targetCity}.`);
}

async function run() {
    console.log("Starting ENHANCED bulk seed process for Vale do Paraíba...");
    for (const city of CITIES) {
        const places = await fetchPlacesForCity(city);
        await seedToSupabase(places, city);
    }
    console.log("✅ All cities processed.");
    process.exit(0);
}

run();
