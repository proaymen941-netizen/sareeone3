import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom driver icon
const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white"/>
      <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" fill="none"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Custom destination icon
const destinationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

interface MapComponentProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    type: 'driver' | 'destination' | 'default';
    popup?: string;
  }>;
  driverPosition?: [number, number];
  showDriverRadius?: boolean;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  height?: string;
}

// Component to handle map events
function MapEvents({ onLocationSelect }: { onLocationSelect?: MapComponentProps['onLocationSelect'] }) {
  const map = useMap();
  
  useEffect(() => {
    if (onLocationSelect) {
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        // Reverse geocoding using Nominatim (OpenStreetMap)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await response.json();
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onLocationSelect(lat, lng, address);
        } catch (error) {
          console.error('Error getting address:', error);
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      });
    }
    
    return () => {
      map.off('click');
    };
  }, [map, onLocationSelect]);
  
  return null;
}

// Component to update map view
function UpdateMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export default function MapComponent({
  center,
  zoom = 13,
  markers = [],
  driverPosition,
  showDriverRadius = false,
  onLocationSelect,
  height = '400px'
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <UpdateMapView center={center} zoom={zoom} />
        <MapEvents onLocationSelect={onLocationSelect} />
        
        {/* Driver position with radius */}
        {driverPosition && (
          <>
            <Marker position={driverPosition} icon={driverIcon}>
              <Popup>موقع السائق الحالي</Popup>
            </Marker>
            {showDriverRadius && (
              <Circle
                center={driverPosition}
                radius={1000} // 1km radius
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.1,
                }}
              />
            )}
          </>
        )}
        
        {/* Markers */}
        {markers.map((marker, index) => {
          const icon = marker.type === 'driver' 
            ? driverIcon 
            : marker.type === 'destination' 
            ? destinationIcon 
            : undefined;
          
          return (
            <Marker key={index} position={marker.position} icon={icon}>
              <Popup>
                <div>
                  <strong>{marker.title}</strong>
                  {marker.popup && <p>{marker.popup}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
