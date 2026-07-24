import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
}

interface MapPickerProps {
  onLocationSelect: (location: LocationData) => void;
  defaultLocation?: LocationData;
  className?: string;
}

export function MapPicker({ onLocationSelect, defaultLocation, className = '' }: MapPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(defaultLocation || null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [address, setAddress] = useState(defaultLocation?.address || '');

  // محاكي الخريطة - في التطبيق الحقيقي سنستخدم Google Maps أو Mapbox
  const mockLocations: LocationData[] = [
    { lat: 24.7136, lng: 46.6753, address: 'الرياض، حي الملز', area: 'الملز', city: 'الرياض' },
    { lat: 24.7504, lng: 46.7751, address: 'الرياض، حي العليا', area: 'العليا', city: 'الرياض' },
    { lat: 24.6877, lng: 46.7219, address: 'الرياض، حي الورود', area: 'الورود', city: 'الرياض' },
    { lat: 24.7760, lng: 46.7386, address: 'الرياض، حي الصحافة', area: 'الصحافة', city: 'الرياض' },
    { lat: 24.7136, lng: 46.6753, address: 'الرياض، حي المربع', area: 'المربع', city: 'الرياض' },
  ];

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `الموقع الحالي (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
            area: 'الموقع الحالي',
            city: 'الرياض'
          };
          setCurrentLocation(location);
          setSelectedLocation(location);
          onLocationSelect(location);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('لا يمكن الحصول على موقعك الحالي. الرجاء اختيار موقع من القائمة.');
          setIsGettingLocation(false);
        }
      );
    } else {
      alert('المتصفح لا يدعم خدمة تحديد الموقع');
      setIsGettingLocation(false);
    }
  };

  const selectLocation = (location: LocationData) => {
    setSelectedLocation(location);
    setAddress(location.address);
    onLocationSelect(location);
  };

  const handleAddressSearch = () => {
    // في التطبيق الحقيقي، هنا نستخدم geocoding API
    const found = mockLocations.find(loc => 
      loc.address.toLowerCase().includes(address.toLowerCase()) ||
      loc.area?.toLowerCase().includes(address.toLowerCase())
    );
    
    if (found) {
      selectLocation(found);
    } else {
      alert('لم يتم العثور على الموقع. جرب كتابة اسم الحي أو المنطقة.');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center mb-4">
        <MapPin className="text-red-500 ml-2" size={20} />
        <h3 className="text-lg font-semibold">تحديد موقع التوصيل</h3>
      </div>

      {/* البحث عن العنوان */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="اكتب عنوانك أو اسم الحي"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
          />
          <button
            onClick={handleAddressSearch}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            بحث
          </button>
        </div>
      </div>

      {/* زر الموقع الحالي */}
      <button
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        <Navigation size={16} />
        {isGettingLocation ? 'جاري تحديد الموقع...' : 'استخدام موقعي الحالي'}
      </button>

      {/* خريطة مبسطة - المواقع المتاحة */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">المواقع المتاحة:</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {mockLocations.map((location, index) => (
            <div
              key={index}
              onClick={() => selectLocation(location)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{location.area}</div>
                  <div className="text-xs text-gray-600">{location.address}</div>
                </div>
                {selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng && (
                  <CheckCircle className="text-red-500" size={16} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* الموقع المحدد */}
      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={16} />
            <span className="text-sm font-medium text-green-700">تم تحديد الموقع:</span>
          </div>
          <div className="text-sm text-green-600 mt-1">{selectedLocation.address}</div>
        </div>
      )}
    </div>
  );
}