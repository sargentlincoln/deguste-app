import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAvailableLocations, getNearestCity } from '@/lib/api/restaurants';
import { AvailableLocation } from '@/lib/types';

interface LocationContextType {
    latitude: number | null;
    longitude: number | null;
    closestCity: string | null;
    closestState: string | null;
    availableLocations: AvailableLocation[];
    error: string | null;
    loading: boolean;
    requestLocation: () => Promise<void>;
    setCoordinates: (lat: number, lng: number) => void;
}
const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [closestCity, setClosestCity] = useState<string | null>(null);
    const [closestState, setClosestState] = useState<string | null>(null);
    const [availableLocations, setAvailableLocations] = useState<AvailableLocation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const requestLocation = async () => {
        setLoading(true);
        setError(null);
        return new Promise<void>((resolve, reject) => {
            if (!navigator.geolocation) {
                setError('Geolocalização não é suportada pelo seu navegador.');
                setLoading(false);
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude);
                    setLongitude(position.coords.longitude);
                    setLoading(false);
                    resolve();
                },
                (err) => {
                    console.error('Error getting location:', err);
                    let errorMessage = 'Erro ao obter localização.';
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            errorMessage = 'Permissão de localização negada.';
                            break;
                        case err.POSITION_UNAVAILABLE:
                            errorMessage = 'Informação de localização indisponível.';
                            break;
                        case err.TIMEOUT:
                            errorMessage = 'Tempo esgotado para obter localização.';
                            break;
                    }
                    setError(errorMessage);
                    setLoading(false);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    useEffect(() => {
        // Attempt to get location on mount
        requestLocation().catch(() => {
            // Errors are handled in state, no need to log here
        });

        // Fetch locations dict from Supabase
        getAvailableLocations().then(locs => {
            setAvailableLocations(locs);
        });
    }, []);

    useEffect(() => {
        if (latitude != null && longitude != null && availableLocations.length > 0) {
            const nearest = getNearestCity(latitude, longitude, availableLocations);
            setClosestCity(nearest.city);
            setClosestState(nearest.state);
        }
    }, [latitude, longitude, availableLocations]);

    const setCoordinates = (lat: number, lng: number) => {
        setLatitude(lat);
        setLongitude(lng);
    };

    const value = {
        latitude,
        longitude,
        closestCity,
        closestState,
        availableLocations,
        error,
        loading,
        requestLocation,
        setCoordinates,
    };

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
