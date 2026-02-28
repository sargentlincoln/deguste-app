import { supabase } from '../supabase';
import { MOCK_RESTAURANTS } from '../mock-data';
import { Restaurant, SearchFilters, SearchResult, RestaurantWithDish } from '../types';
import { interpretSearchQuery } from '../gemini';
import { fetchPlacesByQuery } from './places';
import { cachePlaces } from './placesCache';
import { isRestaurantOpen, calculateDistance } from '../restaurantUtils';

export async function searchRestaurants(filters: SearchFilters): Promise<SearchResult> {
    // Save the original raw query BEFORE AI processing (for Google Places)
    const originalQuery = filters.query || '';
    let aiInterpretation = '';

    if (filters.query && filters.query.length > 2) {
        try {
            const aiFilters = await interpretSearchQuery(filters.query);
            if (aiFilters) {
                console.log("AI Filters:", aiFilters);

                // Build human-readable interpretation for UI feedback
                const parts: string[] = [];
                if (aiFilters.categories?.length) parts.push(`Tipo: ${aiFilters.categories.join(', ')}`);
                if (aiFilters.city) parts.push(`Cidade: ${aiFilters.city}`);
                if (aiFilters.price_level) parts.push(`Preço: ${'$'.repeat(aiFilters.price_level)}`);
                if (aiFilters.open_now) parts.push('Aberto agora');
                if (aiFilters.max_distance_km) parts.push(`Até ${aiFilters.max_distance_km}km`);
                if (aiFilters.sort_by) parts.push(`Ordenar: ${aiFilters.sort_by}`);
                if (aiFilters.is_perola) parts.push('Pérolas');
                if (aiFilters.has_promotions) parts.push('Com promoção');
                if (aiFilters.vibes?.length) parts.push(`Vibe: ${aiFilters.vibes.join(', ')}`);
                if (aiFilters.attributes) parts.push(`Diferenciais: ${Object.keys(aiFilters.attributes).join(', ')}`);
                if (parts.length > 0) aiInterpretation = parts.join(' • ');

                // If AI returned a "search" term (keyword extraction), use that for text match
                if (aiFilters.query) filters.query = aiFilters.query;
                else if (aiFilters.categories?.length || aiFilters.city || aiFilters.attributes) {
                    // If AI fully parsed it into structured data without a specific text query, remove the raw text to avoid double filtering
                    delete filters.query;
                }

                // Merge categories (additive)
                if (aiFilters.categories) {
                    filters.categories = [...(filters.categories || []), ...aiFilters.categories];
                }
                // Merge city (AI enhances, user overrides)
                if (aiFilters.city && !filters.city) filters.city = aiFilters.city;
                // Merge state
                if (aiFilters.state && !filters.state) filters.state = aiFilters.state;
                // Merge attributes (additive)
                if (aiFilters.attributes) {
                    filters.attributes = { ...filters.attributes, ...aiFilters.attributes };
                }
                // Merge price_level (AI fills if user hasn't set)
                if (aiFilters.price_level && !filters.price_level) filters.price_level = aiFilters.price_level;
                // Merge open_now
                if (aiFilters.open_now && !filters.open_now) filters.open_now = true;
                // Merge max_distance_km
                if (aiFilters.max_distance_km && !filters.max_distance_km) filters.max_distance_km = aiFilters.max_distance_km;
                // Merge sort_by
                if (aiFilters.sort_by && !filters.sort_by) filters.sort_by = aiFilters.sort_by as any;
                // Merge is_perola
                if (aiFilters.is_perola && !filters.is_perola) filters.is_perola = true;
                // Merge has_promotions
                if (aiFilters.has_promotions && !filters.has_promotions) filters.has_promotions = true;
                // Merge vibes
                if (aiFilters.vibes?.length) {
                    filters.vibes = [...(filters.vibes || []), ...aiFilters.vibes];
                }
            }
        } catch (error) {
            console.warn("AI interpretation failed, falling back to basic search", error);
        }
    }

    if (supabase) {
        let query = supabase.from('restaurants').select('*').eq('status', 'active');

        if (filters.categories?.length) {
            // Use overlaps to match restaurants that have ANY of the specified categories
            query = query.overlaps('categories', filters.categories);
        }

        if (filters.vibes?.length) {
            // Use overlaps to match restaurants that have ANY of the specified vibes in their tags
            query = query.overlaps('tags', filters.vibes);
        }

        if (filters.price_level) {
            query = query.lte('price_level', filters.price_level);
        }

        if (filters.city) {
            query = query.eq('city', filters.city);
        }

        if (filters.state) {
            query = query.eq('state', filters.state);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error(error);
            return { restaurants: [], distance: 0 };
        }

        let results = data as RestaurantWithDish[];

        // Broad text filter: matches name, description, OR categories
        if (filters.query) {
            const q = filters.query.toLowerCase();
            results = results.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.categories.some(c => c.toLowerCase().includes(q))
            );
        }

        // --- DISH SEARCH: Search menu_items for matching dish names ---
        const dishQuery = originalQuery.trim();
        if (dishQuery.length > 2) {
            try {
                const { data: menuMatches } = await supabase
                    .from('menu_items')
                    .select('restaurant_id, name')
                    .eq('is_active', true)
                    .or(`name.ilike.%${dishQuery}%,description.ilike.%${dishQuery}%`)
                    .limit(30);

                if (menuMatches && menuMatches.length > 0) {
                    // Get unique restaurant IDs from menu matches not already in results
                    const existingIds = new Set(results.map(r => r.id));
                    const dishMap = new Map<string, string>(); // restaurant_id -> matched dish name
                    for (const m of menuMatches) {
                        if (!dishMap.has(m.restaurant_id)) {
                            dishMap.set(m.restaurant_id, m.name);
                        }
                    }

                    // Tag existing results that have a dish match
                    for (const r of results) {
                        if (dishMap.has(r.id)) {
                            r.matched_dish = dishMap.get(r.id);
                        }
                    }

                    // Fetch restaurants not yet in results (respecting city filter)
                    const newIds = [...dishMap.keys()].filter(id => !existingIds.has(id));
                    if (newIds.length > 0) {
                        let dishQuery = supabase
                            .from('restaurants')
                            .select('*')
                            .in('id', newIds)
                            .eq('status', 'active');

                        if (filters.city) dishQuery = dishQuery.eq('city', filters.city);

                        const { data: dishRestaurants } = await dishQuery;

                        if (dishRestaurants) {
                            for (const r of dishRestaurants) {
                                const rwd = r as RestaurantWithDish;
                                rwd.matched_dish = dishMap.get(r.id);
                                results.push(rwd);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Dish search failed, continuing with standard results', err);
            }
        }

        // Client-side filtering for attributes
        if (filters.attributes) {
            results = results.filter(r => {
                return Object.entries(filters.attributes!).every(([key, value]) => {
                    // @ts-ignore
                    return r.attributes[key] === value;
                });
            });
        }

        // --- GOOGLE PLACES API: Only search if we have a text query and no good Supabase results ---
        // Since we now have a complete database, prioritize Supabase results.
        // Only call Google Places as a fallback when Supabase returns very few results.
        let googlePlaces: Restaurant[] = [];
        if (results.length < 3 && originalQuery.length > 2) {
            let searchTerm = originalQuery;
            if (filters.city) {
                searchTerm += ` em ${filters.city}`;
            } else if (filters.state) {
                searchTerm += ` em ${filters.state}`;
            }
            googlePlaces = await fetchPlacesByQuery(searchTerm, filters.city || 'Taubaté', filters.lat, filters.lng);

            // CRITICAL: Filter Google results by selected city to prevent cross-city pollution
            if (filters.city) {
                googlePlaces = googlePlaces.filter(r =>
                    r.city?.toLowerCase() === filters.city!.toLowerCase()
                );
            }

            if (googlePlaces.length > 0) {
                cachePlaces(googlePlaces);
            }
        }


        // Merge Supabase results with Google Places (Supabase first = priority)
        const allResults = [...results, ...googlePlaces];
        // Deduplicate by name (case-insensitive)
        const uniqueNames = new Set();
        let finalResults: Restaurant[] = [];
        for (const item of allResults) {
            if (!uniqueNames.has(item.name.toLowerCase())) {
                uniqueNames.add(item.name.toLowerCase());
                finalResults.push(item);
            }
        }

        if (filters.open_now) {
            finalResults = finalResults.filter(r => isRestaurantOpen(r).isOpen);
        }

        if (filters.lat && filters.lng && filters.max_distance_km) {
            finalResults = finalResults.filter(r => {
                if (!r.lat || !r.lng) return false;
                const dist = calculateDistance(filters.lat!, filters.lng!, r.lat, r.lng);
                r.distance_meters = Math.round(dist * 1000); // Inject for UI sorting/display if needed
                return dist <= filters.max_distance_km!;
            });
        }

        // Sort results based on sort_by parameter
        switch (filters.sort_by) {
            case 'rating':
                finalResults.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
                break;
            case 'distance':
                finalResults.sort((a, b) => (a.distance_meters || 999999) - (b.distance_meters || 999999));
                break;
            case 'price':
                finalResults.sort((a, b) => (a.price_level || 4) - (b.price_level || 4));
                break;
            case 'popularity':
            default:
                // Default sort order: Most famous (highest rating_count) to least famous
                finalResults.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
                break;
        }

        if (filters.is_perola) {
            finalResults = finalResults.filter(r => (r.rating_avg || 0) >= 4.7 && (r.rating_count || 0) >= 30);
        }

        if (filters.has_promotions) {
            finalResults = finalResults.filter(r => r.id.charCodeAt(0) % 3 === 0);
        }

        return { restaurants: finalResults, distance: filters.max_distance_km || 50, ai_interpretation: aiInterpretation || undefined };
    }

    // Fallback: Client-side filter on Mock data
    return new Promise((resolve) => {
        setTimeout(() => {
            let results = MOCK_RESTAURANTS;

            if (filters.query) {
                const q = filters.query.toLowerCase();
                results = results.filter(r =>
                    r.name.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q) ||
                    r.categories.some(c => c.toLowerCase().includes(q))
                );
            }

            if (filters.categories?.length) {
                results = results.filter(r => r.categories.some(c => filters.categories!.includes(c)));
            }

            if (filters.price_level) {
                results = results.filter(r => r.price_level <= filters.price_level!);
            }

            if (filters.attributes) {
                results = results.filter(r => {
                    return Object.entries(filters.attributes!).every(([key, value]) => {
                        // @ts-ignore
                        return r.attributes[key] === value;
                    });
                });
            }

            if (filters.open_now) {
                results = results.filter(r => isRestaurantOpen(r).isOpen);
            }

            if (filters.lat && filters.lng && filters.max_distance_km) {
                results = results.filter(r => {
                    if (!r.lat || !r.lng) return false;
                    const d = calculateDistance(filters.lat!, filters.lng!, r.lat, r.lng);
                    return d <= filters.max_distance_km!;
                });
            }

            // Default sort order: Most famous (highest rating_count) to least famous
            results.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));

            if (filters.is_perola) {
                results = results.filter(r => (r.rating_avg || 0) >= 4.7 && (r.rating_count || 0) >= 30);
            }

            if (filters.has_promotions) {
                results = results.filter(r => r.id.charCodeAt(0) % 3 === 0);
            }

            resolve({ restaurants: results, distance: filters.max_distance_km || 50, ai_interpretation: aiInterpretation || undefined });
        }, 500);
    });
}
