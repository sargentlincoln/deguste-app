/**
 * =============================================================================
 * DEGUSTE — Script de Ingestão de Estabelecimentos Gastronômicos
 * Cidade: Taubaté/SP
 * =============================================================================
 *
 * REGRAS DE ENGENHARIA ENXUTA (Lean):
 *   1. Sem importação textual de reviews — apenas rating_avg e rating_count
 *   2. Download de no máximo 7 fotos por local → Upload para Supabase Storage
 *   3. Coluna video_url: null incluída (para embeds manuais de YouTube Shorts)
 *
 * COMO RODAR:
 *   npx tsx tools/import-taubate-places.ts
 *
 * PRÉ-REQUISITOS:
 *   - .env com VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEGUSTE_BACKEND_MAPS_KEY
 *   - Bucket "restaurants_media" criado e público no Supabase Storage
 *   - Colunas google_place_id (text, unique) e video_url (text) na tabela restaurants
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_KEY = process.env.DEGUSTE_BACKEND_MAPS_KEY!;

const CITY = 'Taubaté';
const STATE = 'SP';
const MAX_PHOTOS_PER_PLACE = 7;
const STORAGE_BUCKET = 'restaurants_media';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Queries de busca — cobrindo todos os tipos de estabelecimento food/dine-in
// ---------------------------------------------------------------------------
const SEARCH_QUERIES = [
    `restaurantes em ${CITY}`,
    `comer no local em ${CITY}`,
    `lanchonetes em ${CITY}`,
    `barraquinhas de rua comida ${CITY}`,
    `food trucks ${CITY}`,
    `trailers de lanches ${CITY}`,
    `pesqueiros com restaurante ${CITY}`,
    `cafeterias em ${CITY}`,
    `padarias em ${CITY}`,
    `docerias e confeitarias ${CITY}`,
    `pizzarias em ${CITY}`,
    `hamburguerias em ${CITY}`,
    `sorveterias em ${CITY}`,
    `churrascarias ${CITY}`,
    `comida japonesa ${CITY}`,
    `comida italiana ${CITY}`,
    `açaí e espetinhos ${CITY}`,
    `bares e petiscos ${CITY}`,
    `comida caseira ${CITY}`,
    `comida árabe ${CITY}`,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

function parsePriceLevel(priceLevel: string | undefined): number | null {
    if (!priceLevel) return null;
    const map: Record<string, number> = {
        PRICE_LEVEL_FREE: 1,
        PRICE_LEVEL_INEXPENSIVE: 1,
        PRICE_LEVEL_MODERATE: 2,
        PRICE_LEVEL_EXPENSIVE: 3,
        PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };
    return map[priceLevel] ?? null;
}

function parseOpeningHours(hours: any): Record<string, any> | null {
    if (!hours || !hours.periods) return null;

    const dayNames = [
        'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday',
    ];

    const result: Record<string, any> = {};

    for (const period of hours.periods) {
        const dayIndex = period.open?.day;
        if (dayIndex === undefined) continue;

        const dayName = dayNames[dayIndex];
        if (!dayName) continue;

        const openHour = String(period.open?.hour ?? 0).padStart(2, '0');
        const openMinute = String(period.open?.minute ?? 0).padStart(2, '0');
        const closeHour = String(period.close?.hour ?? 23).padStart(2, '0');
        const closeMinute = String(period.close?.minute ?? 59).padStart(2, '0');

        result[dayName] = {
            open: `${openHour}:${openMinute}`,
            close: `${closeHour}:${closeMinute}`,
        };
    }

    return Object.keys(result).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Google Places API — Text Search (New)
// ---------------------------------------------------------------------------
async function searchPlaces(query: string): Promise<string[]> {
    const allIds: string[] = [];
    let nextPageToken: string | undefined;

    do {
        const body: any = { textQuery: query, pageSize: 20 };
        if (nextPageToken) body.pageToken = nextPageToken;

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
                'X-Goog-FieldMask': 'places.id,nextPageToken',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error(`❌ Erro na busca "${query}": ${response.status} ${response.statusText}`);
            break;
        }

        const data: any = await response.json();
        const places = data.places || [];
        places.forEach((p: any) => allIds.push(p.id));

        nextPageToken = data.nextPageToken;
        if (nextPageToken) await sleep(300);
    } while (nextPageToken);

    return allIds;
}

// ---------------------------------------------------------------------------
// Google Places API — Place Details (New)
// ---------------------------------------------------------------------------
const DETAIL_FIELDS = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'regularOpeningHours',
    'rating',
    'userRatingCount',
    'photos',
    'editorialSummary',
    'priceLevel',
    'primaryType',
    'primaryTypeDisplayName',
    'googleMapsUri',
].join(',');

async function fetchPlaceDetails(placeId: string): Promise<any | null> {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const response = await fetch(url, {
        headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
            'X-Goog-FieldMask': DETAIL_FIELDS,
        },
    });

    if (!response.ok) {
        console.error(`  ⚠️ Erro Place Details (${placeId}): ${response.status}`);
        return null;
    }

    return response.json();
}

// ---------------------------------------------------------------------------
// Download foto do Google → Upload para Supabase Storage
// ---------------------------------------------------------------------------
async function uploadPhotoToStorage(
    photoName: string,
    baseName: string,
    index: number,
): Promise<string | null> {
    const mediaUrl =
        `https://places.googleapis.com/v1/${photoName}/media` +
        `?key=${GOOGLE_MAPS_KEY}&maxHeightPx=800&maxWidthPx=800`;

    try {
        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${baseName}-${index}-${uuidv4().substring(0, 8)}.jpg`;
        const storagePath = `places/${fileName}`;

        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, buffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        return publicUrl;
    } catch (err: any) {
        console.error(`  ⚠️ Falha upload foto #${index}: ${err.message}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Processar um único Place → montar row + salvar
// ---------------------------------------------------------------------------
async function processPlace(placeId: string, index: number, total: number) {
    console.log(`\n▶️  [${index}/${total}] Processando ${placeId}...`);

    const place = await fetchPlaceDetails(placeId);
    if (!place || !place.displayName) {
        console.log('  ⏭️  Sem dados — pulando');
        return;
    }

    const name = place.displayName.text;
    console.log(`  📍 ${name}`);

    // --- Fotos (máx 7) -------------------------------------------------------
    const googlePhotos = (place.photos || []).slice(0, MAX_PHOTOS_PER_PLACE);
    const uploadedPhotos: Array<{
        id: string;
        url: string;
        source: string;
        is_cover: boolean;
    }> = [];

    const safeBase = slugify(name);

    for (let i = 0; i < googlePhotos.length; i++) {
        const url = await uploadPhotoToStorage(googlePhotos[i].name, safeBase, i);
        if (url) {
            uploadedPhotos.push({
                id: uuidv4(),
                url,
                source: 'upload',
                is_cover: i === 0,
            });
        }
        await sleep(200); // breathing room
    }

    console.log(`  📸 ${uploadedPhotos.length} fotos enviadas ao Storage`);

    // --- Montar objeto alinhado à Constituição --------------------------------
    const slug = slugify(name);

    const row: Record<string, any> = {
        google_place_id: place.id,
        name,
        slug,
        description: place.editorialSummary?.text ?? null,
        address: place.formattedAddress ?? '',
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
        city: CITY,
        state: STATE,
        phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        categories: place.primaryType ? [place.primaryType] : [],
        tags: place.primaryTypeDisplayName?.text
            ? [place.primaryTypeDisplayName.text]
            : [],
        price_level: parsePriceLevel(place.priceLevel),
        rating_avg: place.rating ?? 0,
        rating_count: place.userRatingCount ?? 0,
        photos: uploadedPhotos,
        opening_hours: parseOpeningHours(place.regularOpeningHours),
        status: 'active',
        video_url: null,
        last_synced_at: new Date().toISOString(),
    };

    // --- Upsert ---------------------------------------------------------------
    // Se já existir pelo google_place_id, preserva o UUID original
    const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .eq('google_place_id', place.id)
        .maybeSingle();

    if (existing) {
        row.id = existing.id;
    }

    const { error } = await supabase
        .from('restaurants')
        .upsert(row, { onConflict: 'google_place_id' });

    if (error) {
        console.error(`  ❌ Erro ao salvar "${name}": ${error.message}`);
    } else {
        console.log(`  ✅ Salvo com sucesso!`);
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('='.repeat(60));
    console.log('  DEGUSTE — Importação de Estabelecimentos');
    console.log(`  Cidade: ${CITY}/${STATE}`);
    console.log(`  Queries: ${SEARCH_QUERIES.length}`);
    console.log('='.repeat(60));

    // 1. Coletar IDs únicos ---------------------------------------------------
    const uniqueIds = new Set<string>();

    console.log('\n🔍 [FASE 1] Coletando IDs do Google Places...\n');

    for (const query of SEARCH_QUERIES) {
        console.log(`  🔎 "${query}"`);
        const ids = await searchPlaces(query);
        ids.forEach((id) => uniqueIds.add(id));
        console.log(`     → ${ids.length} resultados (total único: ${uniqueIds.size})`);
        await sleep(400);
    }

    console.log(`\n📊 Total de locais únicos encontrados: ${uniqueIds.size}`);

    // 2. Extrair detalhes + fotos + salvar ------------------------------------
    console.log('\n📥 [FASE 2] Extraindo detalhes e importando...\n');

    const allIds = Array.from(uniqueIds);
    for (let i = 0; i < allIds.length; i++) {
        await processPlace(allIds[i], i + 1, allIds.length);
        await sleep(600); // Rate-limit safety
    }

    // 3. Resumo ---------------------------------------------------------------
    console.log('\n' + '='.repeat(60));
    console.log('  🎉 Importação concluída!');
    console.log(`  Total processado: ${allIds.length} estabelecimentos`);
    console.log('='.repeat(60));
}

main().catch((err) => {
    console.error('\n💥 Erro fatal:', err);
    process.exit(1);
});
