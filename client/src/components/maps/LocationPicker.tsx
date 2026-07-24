import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check, X, Loader2, Navigation as NavigationIcon, Search, ZoomIn, ZoomOut } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onCancel?: () => void;
  initialLocation?: [number, number];
}

// Component to handle map clicks and move the marker
function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: [number, number] | null; 
  setPosition: (pos: [number, number]) => void;
}) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? <Marker position={position} /> : null;
}

// Component to ensure the map fills its container and handles view changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    // Crucial for Leaflet in modals - ensures map container is correctly calculated
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

export default function LocationPicker({
  onLocationSelect,
  onCancel,
  initialLocation,
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // المركز الافتراضي (صنعاء، اليمن)
  const defaultCenter: [number, number] = [15.3694, 44.1910];
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    position || initialLocation || defaultCenter
  );

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for address with suggestions
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=ar`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        setShowResults(true);
      } else {
        alert('لم يتم العثور على الموقع المطلوب');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('حدث خطأ أثناء البحث عن الموقع');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const newPos: [number, number] = [lat, lon];
    setPosition(newPos);
    setMapCenter(newPos);
    setAddress(result.display_name);
    setShowResults(false);
    setSearchQuery(result.display_name);
  };

  // Update address when position changes
  useEffect(() => {
    if (position && !isSearching) {
      getAddressFromCoordinates(position[0], position[1]);
    }
  }, [position, getAddressFromCoordinates, isSearching]);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم خدمة تحديد الموقع');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos: [number, number] = [lat, lng];
        setPosition(newPos);
        setMapCenter(newPos);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('فشل في الحصول على موقعك الحالي');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (position && address) {
      onLocationSelect(position[0], position[1], address);
    } else {
      alert('الرجاء اختيار موقع على الخريطة');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-4 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">تحديد موقع المطعم بدقة</h2>
              <p className="text-xs text-white/70">يمكنك البحث، التحريك، التكبير، أو النقر على الموقع</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar & Suggestions */}
        <div className="p-4 border-b bg-gray-50/80 relative z-[10001] shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن المدينة، الحي، أو الشارع..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-right"
              />
              
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-[10002]">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSearchResult(result)}
                      className="w-full text-right p-3 hover:bg-primary/5 border-b last:border-0 border-gray-100 transition-colors flex items-start gap-2"
                    >
                      <MapPin className="h-4 w-4 text-primary mt-1 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all font-medium flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">بحث</span>
            </button>
          </form>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={true}
            dragging={true}
            doubleClickZoom={true}
            touchZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>

          {/* Current Location FAB */}
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="absolute bottom-6 left-6 z-[1000] bg-white text-primary rounded-full p-4 shadow-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 border border-gray-100"
            title="تحديد موقعي الحالي"
          >
            {gettingLocation ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <NavigationIcon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Selected Info Footer */}
        <div className="bg-white border-t p-4 sm:p-6 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">الموقع المختار</p>
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">جاري تحديد التفاصيل...</span>
                    </div>
                  ) : position ? (
                    <p className="text-sm text-gray-900 font-medium leading-relaxed">{address}</p>
                  ) : (
                    <p className="text-sm text-gray-400">الرجاء النقر على الخريطة لتحديد الموقع</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onCancel}
                className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                <span>إلغاء</span>
              </button>
              <button
                onClick={handleConfirm}
                disabled={!position || loading}
                className="flex-1 sm:flex-none px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <Check className="h-5 w-5" />
                <span>تأكيد الموقع</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
