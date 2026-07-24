import { useState, useEffect } from 'react';
import { MapPin, Navigation, ChevronDown, Check, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import MapComponent from './maps/MapComponent';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
}

interface LocationPickerProps {
  onLocationSelect?: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
}

export function LocationPicker({ 
  onLocationSelect, 
  placeholder = "حدد موقع التوصيل...",
  className = "" 
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [savedLocations] = useState<LocationData[]>([
    { lat: 15.3694, lng: 44.1910, address: 'صنعاء القديمة، باب اليمن', area: 'باب اليمن', city: 'صنعاء' },
    { lat: 15.3547, lng: 44.2066, address: 'صنعاء الجديدة، شارع الزبيري', area: 'الزبيري', city: 'صنعاء' },
    { lat: 15.3400, lng: 44.1947, address: 'صنعاء، حي السبعين', area: 'السبعين', city: 'صنعاء' },
    { lat: 15.3333, lng: 44.2167, address: 'صنعاء، شارع الستين', area: 'الستين', city: 'صنعاء' },
    { lat: 15.3250, lng: 44.2083, address: 'صنعاء، شارع الخمسين', area: 'الخمسين', city: 'صنعاء' },
  ]);

  useEffect(() => {
    // Try to get user's current location on component mount
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('تم منح الإذن للموقع:', position);
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `الموقع المختار: (${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)})`,
            area: 'الموقع الحالي',
            city: 'صنعاء'
          };
          setSelectedLocation(location);
          onLocationSelect?.(location);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('خطأ في تحديد الموقع:', error);
          // Set default location if geolocation fails
          const defaultLocation = savedLocations[0];
          setSelectedLocation(defaultLocation);
          onLocationSelect?.(defaultLocation);
          setIsGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Set default location if geolocation not supported
      const defaultLocation = savedLocations[0];
      setSelectedLocation(defaultLocation);
      onLocationSelect?.(defaultLocation);
      setIsGettingLocation(false);
    }
  };

  const selectLocation = (location: LocationData) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
    setShowLocationMenu(false);
  };

  const refreshCurrentLocation = () => {
    getCurrentLocation();
  };

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    const location: LocationData = {
      lat,
      lng,
      address,
      area: address.split(',')[0],
      city: 'صنعاء'
    };
    setSelectedLocation(location);
    onLocationSelect?.(location);
    setIsMapOpen(false);
    setShowLocationMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Location Picker Button */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-full justify-between h-12 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
          onClick={() => setShowLocationMenu(!showLocationMenu)}
          disabled={isGettingLocation}
          data-testid="button-location-picker"
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-orange-500" />
            <div className="text-right">
              {isGettingLocation ? (
                <span className="text-sm text-gray-600 dark:text-gray-300">جاري تحديد الموقع...</span>
              ) : selectedLocation ? (
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block truncate max-w-[200px]">
                    {selectedLocation.area || selectedLocation.address}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedLocation.city}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>
              )}
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
        </Button>

        {/* Location Menu */}
        {showLocationMenu && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-3">
              {/* Current Location Option */}
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={refreshCurrentLocation}
                disabled={isGettingLocation}
                data-testid="button-current-location"
              >
                <Navigation className="h-4 w-4 text-blue-500 ml-3" />
                <div className="text-right">
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {isGettingLocation ? 'جاري تحديد الموقع...' : 'استخدام الموقع الحالي'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    GPS دقيق
                  </div>
                </div>
              </Button>

              {/* Map Selection Option */}
              <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setShowLocationMenu(false)}
                    data-testid="button-open-map"
                  >
                    <MapIcon className="h-4 w-4 text-orange-500 ml-3" />
                    <div className="text-right">
                      <div className="font-medium text-orange-600 dark:text-orange-400">
                        تحديد من الخريطة
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        اختر موقعك بدقة على الخريطة
                      </div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle>اختر موقع التوصيل</DialogTitle>
                  </DialogHeader>
                  <div className="h-[400px] w-full">
                    <MapComponent 
                      center={[selectedLocation?.lat || 15.3694, selectedLocation?.lng || 44.1910]}
                      zoom={14}
                      onLocationSelect={handleMapSelect}
                    />
                  </div>
                  <div className="p-4 bg-gray-50 text-xs text-center text-gray-500">
                    انقر على الخريطة لتحديد موقعك بدقة
                  </div>
                </DialogContent>
              </Dialog>

              <div className="border-t border-gray-100 dark:border-gray-700 my-2" />

              {/* Saved Locations */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">المواقع المحفوظة</p>
                {savedLocations.map((location, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-between h-auto p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => selectLocation(location)}
                    data-testid={`button-location-${index}`}
                  >
                    <div className="flex items-center gap-3 flex-1 text-right">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {location.area}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {location.address}
                        </div>
                      </div>
                    </div>
                    {selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  📍 سيتم توصيل طلبك للموقع المحدد
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Click outside to close */}
      {showLocationMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowLocationMenu(false)}
        />
      )}
    </div>
  );
}