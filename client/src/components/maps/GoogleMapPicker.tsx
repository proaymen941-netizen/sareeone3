import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MapComponent from './MapComponent';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 15.3694,
  lng: 44.1910, // صنعاء، اليمن
};

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
}

interface GoogleMapPickerProps {
  onLocationSelect: (location: LocationData) => void;
  onCancel?: () => void;
  initialLocation?: { lat: number; lng: number };
  isOpen: boolean;
  onClose: () => void;
}

const libraries: ("places")[] = ["places"];

export default function GoogleMapPicker({
  onLocationSelect,
  onCancel,
  initialLocation,
  isOpen,
  onClose
}: GoogleMapPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasApiKey = !!apiKey && apiKey !== 'undefined' && apiKey !== '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries,
    language: 'ar',
    region: 'YE'
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const getAddressFromCoords = async (lat: number, lng: number) => {
    if (!window.google) return;
    setLoading(true);
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        setAddress(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarker(newPos);
      getAddressFromCoords(newPos.lat, newPos.lng);
    }
  }, []);

  const onPlaceSelected = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarker(newPos);
        setAddress(place.formatted_address || '');
        if (map) {
          map.panTo(newPos);
          map.setZoom(17);
        }
      }
    }
  };

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMarker(newPos);
          if (hasApiKey) {
            getAddressFromCoords(newPos.lat, newPos.lng);
          } else {
            setAddress(`${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`);
          }
          if (map) {
            map.panTo(newPos);
            map.setZoom(17);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
          if (isLoaded || !hasApiKey) {
            console.log("Geolocation permission denied or error");
          }
        },
        { enableHighAccuracy: true }
      );
    }
  }, [map, isLoaded, hasApiKey]);

  // Request location automatically when opened if no initial location
  useEffect(() => {
    if (isOpen && (isLoaded || !hasApiKey) && !marker && !initialLocation) {
      getCurrentLocation();
    }
  }, [isOpen, isLoaded, marker, initialLocation, getCurrentLocation, hasApiKey]);

  const handleConfirm = () => {
    if (marker) {
      onLocationSelect({
        lat: marker.lat,
        lng: marker.lng,
        address: address || `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`
      });
      onClose();
    }
  };

  const handleLeafletSelect = (lat: number, lng: number, addr: string) => {
    setMarker({ lat, lng });
    setAddress(addr);
  };

  if (!isOpen) return null;

  // Fallback to Leaflet if API Key is missing or error loading
  if (!hasApiKey || loadError) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 sm:p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-amber-600 text-white">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h2 className="font-bold">تحديد الموقع (نظام بديل)</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {!hasApiKey && (
            <div className="bg-amber-50 p-3 flex items-center gap-3 text-amber-800 text-sm border-b border-amber-100">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>مفتاح خرائط جوجل غير متوفر. تم تفعيل نظام الخرائط المفتوحة (Leaflet) كبديل لضمان استمرارية الخدمة.</p>
            </div>
          )}

          {/* Map */}
          <div className="flex-1 relative">
            <MapComponent
              center={[marker?.lat || initialLocation?.lat || defaultCenter.lat, marker?.lng || initialLocation?.lng || defaultCenter.lng]}
              zoom={15}
              onLocationSelect={handleLeafletSelect}
              height="100%"
            />
            
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-6 left-6 rounded-full shadow-lg z-[1000]"
              onClick={getCurrentLocation}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
            </Button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <MapPin className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-600 mb-1">الموقع المختار:</p>
                  <p className="text-sm text-gray-700 leading-tight">
                    {loading ? "جاري التحديد..." : address || "انقر على الخريطة لتحديد الموقع"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  إلغاء
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  disabled={!marker || loading}
                  onClick={handleConfirm}
                >
                  <Check className="h-4 w-4" />
                  تأكيد الموقع
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">جاري تحميل الخريطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-primary text-white">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <h2 className="font-bold">تحديد الموقع بدقة</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Autocomplete
              onLoad={(ref) => (autocompleteRef.current = ref)}
              onPlaceChanged={onPlaceSelected}
            >
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث عن موقع..."
                  className="pr-10 text-right"
                />
              </div>
            </Autocomplete>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={marker || initialLocation || defaultCenter}
            zoom={15}
            onClick={onMapClick}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {marker && <Marker position={marker} />}
          </GoogleMap>

          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-6 left-6 rounded-full shadow-lg"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <MapPin className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-600 mb-1">الموقع المختار:</p>
                <p className="text-sm text-gray-700 leading-tight">
                  {loading ? "جاري التحديد..." : address || "انقر على الخريطة لتحديد الموقع"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                إلغاء
              </Button>
              <Button 
                className="flex-1 gap-2" 
                disabled={!marker || loading}
                onClick={handleConfirm}
              >
                <Check className="h-4 w-4" />
                تأكيد الموقع
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
