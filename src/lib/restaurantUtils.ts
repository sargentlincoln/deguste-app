/**
 * Utility helpers for restaurant display logic.
 */

import { Restaurant } from './types';

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

/**
 * Day name mappings for the weekday_descriptions format from Google Places API.
 */
const WEEKDAY_NAMES_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/**
 * Checks if a restaurant is currently open based on its opening_hours and the device's local time.
 * Supports two formats:
 * - Old format: { segunda: { open: "11:00", close: "22:00" } }
 * - New format: { weekday_descriptions: ["segunda-feira: 11:00 – 15:00", ...], open_now: bool }
 */
export function isRestaurantOpen(restaurant: Restaurant): { isOpen: boolean; opensAt: string | null; closesAt: string | null } {
    try {
        const oh = restaurant.opening_hours;
        if (!oh || typeof oh !== 'object') {
            return { isOpen: false, opensAt: null, closesAt: null };
        }

        const now = new Date();
        const dayIdx = now.getDay(); // 0=Sunday

        // --- NEW FORMAT: weekday_descriptions ---
        if (oh.weekday_descriptions && Array.isArray(oh.weekday_descriptions)) {
            const todayName = WEEKDAY_NAMES_PT[dayIdx];
            const todayDesc = oh.weekday_descriptions.find((d: string) =>
                d.toLowerCase().startsWith(todayName)
            );

            if (!todayDesc) {
                // If open_now is available from Google, use it directly
                if (typeof oh.open_now === 'boolean') {
                    return { isOpen: oh.open_now, opensAt: null, closesAt: null };
                }
                return { isOpen: false, opensAt: null, closesAt: null };
            }

            // Parse format like "segunda-feira: 11:00 – 15:00" or "segunda-feira: 11:00 – 15:00, 18:00 – 22:00"
            const colonIdx = todayDesc.indexOf(':');
            if (colonIdx === -1) {
                return { isOpen: false, opensAt: null, closesAt: null };
            }
            const timePart = todayDesc.substring(colonIdx + 1).trim();

            if (timePart.toLowerCase().includes('fechado') || timePart.toLowerCase().includes('closed')) {
                return { isOpen: false, opensAt: null, closesAt: null };
            }

            // Split by comma for multiple time ranges (e.g., "11:00 – 15:00, 18:00 – 22:00")
            const ranges = timePart.split(',').map((s: string) => s.trim());
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            let firstOpen: string | null = null;
            let lastClose: string | null = null;

            for (const range of ranges) {
                // Parse "11:00 – 15:00" (handles both – and -)
                const parts = range.split(/\s*[–-]\s*/);
                if (parts.length === 2) {
                    const openTime = parts[0].trim();
                    const closeTime = parts[1].trim();
                    if (!firstOpen) firstOpen = openTime;
                    lastClose = closeTime;

                    const openMatch = openTime.match(/(\d{1,2}):(\d{2})/);
                    const closeMatch = closeTime.match(/(\d{1,2}):(\d{2})/);

                    if (openMatch && closeMatch) {
                        const openMin = parseInt(openMatch[1]) * 60 + parseInt(openMatch[2]);
                        const closeMin = parseInt(closeMatch[1]) * 60 + parseInt(closeMatch[2]);

                        if (closeMin > openMin) {
                            if (currentMinutes >= openMin && currentMinutes < closeMin) {
                                return { isOpen: true, opensAt: openTime, closesAt: closeTime };
                            }
                        } else {
                            // Overnight
                            if (currentMinutes >= openMin || currentMinutes < closeMin) {
                                return { isOpen: true, opensAt: openTime, closesAt: closeTime };
                            }
                        }
                    }
                }
            }

            return { isOpen: false, opensAt: firstOpen, closesAt: lastClose };
        }

        // --- OLD FORMAT: { segunda: { open: "11:00", close: "22:00" } } ---
        const dayName = DAY_NAMES[dayIdx];
        const hours = oh[dayName];

        if (!hours || !hours.open || !hours.close) {
            return { isOpen: false, opensAt: null, closesAt: null };
        }

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = hours.open.split(':').map(Number);
        const [closeH, closeM] = hours.close.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        let isOpen: boolean;
        if (closeMinutes > openMinutes) {
            isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        } else {
            isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
        }

        return { isOpen, opensAt: hours.open, closesAt: hours.close };
    } catch (e) {
        // Never crash — return safe default
        console.warn('isRestaurantOpen error:', e);
        return { isOpen: false, opensAt: null, closesAt: null };
    }
}

/**
 * Returns the price range text for a given price level.
 */
export function getPriceRangeText(level: 1 | 2 | 3 | 4): string {
    switch (level) {
        case 1: return 'até R$ 30';
        case 2: return 'R$ 30–60';
        case 3: return 'R$ 60–120';
        case 4: return 'R$ 120+';
        default: return '';
    }
}

/**
 * Returns the $ symbols for a given price level.
 */
export function getPriceSymbols(level: 1 | 2 | 3 | 4): string {
    return '$'.repeat(level);
}

/**
 * Calculates the Haversine distance between two coordinates in kilometers.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Returns the most prominent highlight given a restaurant's attributes.
 */
export function getProminentHighlight(attributes: Record<string, any> | undefined): string | null {
    if (!attributes) return null;

    const priorityMap: Record<string, string> = {
        romantic: '💕 Ótimo para casais',
        good_for_birthdays: '🎂 Bom para aniversários',
        live_music: '🎵 Som ao Vivo',
        pet_friendly: '🐾 Aceita Pets',
        kids_friendly: '🧸 Espaço Kids',
        outdoor_seating: '🌿 Área Externa Aberta',
        vegan_options: '🌱 Opções Veganas',
        upscale: '✨ Experiência Premium',
        wheelchair_accessible: '♿️ Acessibilidade Física',
        parking_available: '🅿️ Estacionamento Fácil',
        delivery: '🛵 Faz Entrega'
    };

    for (const key of Object.keys(priorityMap)) {
        if (attributes[key]) {
            return priorityMap[key];
        }
    }

    return null;
}
