'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { Stop } from '@/lib/types';

export default function Map({
  origin,
  destination,
  stops = [],
}: {
  origin: string;
  destination: string;
  stops?: Stop[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !ref.current) return;

    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.load().then(async (google) => {
      const { Map: GoogleMap } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary('routes') as google.maps.RoutesLibrary;

      const map = new GoogleMap(ref.current!, {
        zoom: 10,
        center: { lat: 51.5, lng: -0.1 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        ],
      });

      const directionsService = new DirectionsService();
      const directionsRenderer = new DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 4 },
      });

      const waypointStops = stops.slice(0, 8).map((s) => ({
        location: new google.maps.LatLng(s.location.lat, s.location.lng),
        stopover: true,
      }));

      directionsService.route(
        {
          origin,
          destination,
          waypoints: waypointStops,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) directionsRenderer.setDirections(result);
        }
      );
    });
  }, [origin, destination, stops]);

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] rounded-xl overflow-hidden bg-slate-800" />
  );
}
