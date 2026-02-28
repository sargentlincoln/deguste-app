import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

function MapCircle({ radius, center }: { radius: number, center: { lat: number, lng: number } }) {
    const map = useMap();
    const circleRef = useRef<google.maps.Circle | null>(null);

    useEffect(() => {
        if (!map || typeof google === 'undefined') return;

        if (!circleRef.current) {
            circleRef.current = new google.maps.Circle({
                strokeColor: '#F20D0D',
                strokeOpacity: 0.7,
                strokeWeight: 2,
                fillColor: '#F20D0D',
                fillOpacity: 0.12,
                map,
                center,
                radius: radius
            });
        } else {
            circleRef.current.setRadius(radius);
            circleRef.current.setCenter(center);
        }

        // Calculate the correct zoom level for the radius
        // At equator: zoom 15 ≈ 1km view, each zoom level doubles the area
        const metersPerPixel = radius / 120; // we want radius to fill ~120px
        const zoom = Math.round(Math.log2(156543.03392 * Math.cos(center.lat * Math.PI / 180) / metersPerPixel));
        const clampedZoom = Math.max(5, Math.min(zoom, 18));

        map.setCenter(center);
        map.setZoom(clampedZoom);

        // Lock the map
        map.setOptions({
            gestureHandling: 'none',
            zoomControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            draggable: false,
        });
    }, [map, center.lat, center.lng, radius]);

    useEffect(() => {
        return () => {
            if (circleRef.current) {
                circleRef.current.setMap(null);
                circleRef.current = null;
            }
        };
    }, []);

    return null;
}

interface MapWrapperProps {
    latitude: number;
    longitude: number;
    name: string;
    children?: React.ReactNode;
    showStreetView?: boolean;
    radius?: number; // In meters
}

export default function MapWrapper({ latitude, longitude, name, children, showStreetView, radius }: MapWrapperProps) {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        setApiKey((import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '');
    }, []);

    if (!apiKey) {
        return <div className="w-full h-full bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-xs text-gray-400 text-center px-4">Configurando mapa...<br />(Verifique a Chave da API)</div>;
    }

    const isLocked = !!radius;
    const center = { lat: latitude, lng: longitude };

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                center={isLocked ? center : undefined}
                defaultCenter={!isLocked ? center : undefined}
                zoom={isLocked ? 10 : undefined}
                defaultZoom={!isLocked ? 15 : undefined}
                mapId="deguste_app_map"
                gestureHandling={isLocked ? 'none' : 'greedy'}
                disableDefaultUI={true}
                className="w-full h-full rounded-2xl"
            >
                {/* Default restaurant marker (only when no children and no radius) */}
                {!children && !radius && (
                    <AdvancedMarker position={center}>
                        <div className="bg-primary hover:bg-red-600 transition-colors pointer-cursor text-white p-2 rounded-full shadow-lg border-[3px] border-white/20 hover:scale-110 flex flex-col items-center">
                            <span className="material-icons text-white text-lg">restaurant</span>
                        </div>
                    </AdvancedMarker>
                )}

                {/* Center pin when radius mode is active */}
                {radius && (
                    <AdvancedMarker position={center}>
                        <div className="relative flex flex-col items-center">
                            <div className="absolute -inset-2 bg-primary/30 rounded-full animate-ping" />
                            <div className="bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-white/50 z-10">
                                <span className="material-icons text-white text-base">my_location</span>
                            </div>
                        </div>
                    </AdvancedMarker>
                )}

                {children}
                {radius && <MapCircle radius={radius} center={center} />}
            </Map>
            {showStreetView && (
                <div className="w-full h-[200px] mt-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${latitude},${longitude}`}
                    ></iframe>
                </div>
            )}
        </APIProvider>
    );
}
