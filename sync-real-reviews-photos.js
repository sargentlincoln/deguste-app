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

async function syncRealData() {
    console.log('Fetching restaurants from database (that have a valid google_place_id)...');
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, google_place_id, name')
        .not('google_place_id', 'is', null);

    if (error || !restaurants) {
        console.error("Error fetching restaurants from DB:", error);
        return;
    }

    console.log(`Found ${restaurants.length} restaurants to sync.`);

    let successCount = 0;

    for (let i = 0; i < restaurants.length; i++) {
        const r = restaurants[i];
        console.log(`[${i + 1}/${restaurants.length}] Fetching rich data for: ${r.name}`);

        try {
            const url = `https://places.googleapis.com/v1/places/${r.google_place_id}?languageCode=pt-BR`;
            const response = await fetch(url, {
                headers: {
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    'X-Goog-FieldMask': 'id,displayName,photos,reviews,editorialSummary,regularOpeningHours'
                }
            });

            if (!response.ok) {
                console.error(`  -> Failed API call for ${r.name}: ${response.statusText}`);
                continue;
            }

            const place = await response.json();

            if (!place) {
                console.log(`  -> No data returned for ${r.name}.`);
                continue;
            }

            // Sync photos - limit to max 3 to prevent massive UI loading costs ($0.007 per photo)
            const photos = (place.photos || []).slice(0, 3).map((p, idx) => ({
                id: String(idx),
                url: `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`,
                source: 'google',
                is_cover: idx === 0
            }));

            // Sync editorial summary
            const editorialSummary = place.editorialSummary?.text || null;

            // Sync opening hours
            let openingHours = null;
            if (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions) {
                openingHours = {
                    weekday_descriptions: place.regularOpeningHours.weekdayDescriptions,
                    open_now: place.regularOpeningHours.openNow
                };
            }

            // Map the reviews
            const google_reviews = (place.reviews || []).slice(0, 5).map(rev => ({
                name: rev.name || Math.random().toString(),
                rating: rev.rating || 5,
                text: { text: rev.text?.text || rev.originalText?.text || '' },
                authorAttribution: {
                    displayName: rev.authorAttribution?.displayName || 'Usuário Google',
                    photoUri: rev.authorAttribution?.photoUri || null
                },
                relativePublishTimeDescription: rev.relativePublishTimeDescription || '',
                photos: []
            }));

            // Calculate attributes from text
            const allTextData = [editorialSummary || '', ...google_reviews.map(rev => rev.text?.text || '')].join(' ');

            const lowerText = allTextData.toLowerCase();
            const attributes = {};
            if (lowerText.includes('aniversário') || lowerText.includes('festa') || lowerText.includes('comemorar')) attributes.good_for_birthdays = true;
            if (lowerText.includes('romântico') || lowerText.includes('casal') || lowerText.includes('namorados')) attributes.romantic = true;
            if (lowerText.includes('vintage') || lowerText.includes('retrô') || lowerText.includes('antigo')) attributes.vintage = true;
            if (lowerText.includes('música ao vivo') || lowerText.includes('banda') || lowerText.includes('show')) attributes.live_music = true;
            if (lowerText.includes('clássica') || lowerText.includes('piano') || lowerText.includes('jazz')) attributes.classical_music = true;
            if (lowerText.includes('pet friendly') || lowerText.includes('cachorro') || lowerText.includes('pet')) attributes.pet_friendly = true;
            if (lowerText.includes('kids') || lowerText.includes('criança') || lowerText.includes('brinquedo') || lowerText.includes('espaço kids')) attributes.kids_friendly = true;
            if (lowerText.includes('natureza') || lowerText.includes('ar livre') || lowerText.includes('verde') || lowerText.includes('árvores')) attributes.outdoor_seating = true;
            if (lowerText.includes('acessível') || lowerText.includes('cadeirante') || lowerText.includes('acessibilidade')) attributes.wheelchair_accessible = true;
            if (lowerText.includes('estacionamento') || lowerText.includes('vaga') || lowerText.includes('valet')) attributes.parking_available = true;
            if (lowerText.includes('vegano') || lowerText.includes('vegetariano') || lowerText.includes('plant based')) attributes.vegan_options = true;
            if (lowerText.includes('wi-fi') || lowerText.includes('trabalhar') || lowerText.includes('tomada')) attributes.wifi_available = true;
            if (lowerText.includes('requintado') || lowerText.includes('chique') || lowerText.includes('luxo') || lowerText.includes('fino')) attributes.upscale = true;

            // Debug prints
            console.log(`  -> Photos: ${photos.length} | Has Summary: ${!!editorialSummary} | Has Hours: ${!!openingHours} | Attributes found: ${Object.keys(attributes).length}`);

            const payload = {
                google_reviews: google_reviews,
                attributes: JSON.stringify(attributes)
            };

            if (photos.length > 0) payload.photos = JSON.stringify(photos);
            if (editorialSummary) payload.description = editorialSummary;
            if (openingHours) payload.opening_hours = JSON.stringify(openingHours);

            // Update Database
            const { error: updateError } = await supabase
                .from('restaurants')
                .update(payload)
                .eq('id', r.id);

            if (updateError) {
                console.error(`  -> Supabase update error for ${r.name}:`, updateError.message);
            } else {
                successCount++;
            }

        } catch (e) {
            console.error(`  -> Exception processing ${r.name}:`, e.message);
        }

        // Delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n✅ Finished sync. ${successCount}/${restaurants.length} updated successfully.`);
}

syncRealData();
