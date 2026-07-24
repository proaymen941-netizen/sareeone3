import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, User, Phone, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح مشكلة أيقونات Leaflet الافتراضية
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// أيقونة مخصصة للسائقين النشطين
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

function MapFocusHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function AdminDriverTracking() {
  const { data: drivers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/drivers'],
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([15.3694, 44.1910]); // صنعاء كمثال
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [liveDrivers, setLiveDrivers] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  // تتبع حي عبر WebSocket
  useEffect(() => {
    const ws = (window as any).WS_MANAGER;
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'driver_location') {
          const { driverId, latitude, longitude, currentLocation } = message.payload;
          setLiveDrivers(prev => ({
            ...prev,
            [driverId]: {
              latitude,
              longitude,
              currentLocation,
              lastUpdate: new Date()
            }
          }));
          
          // إذا كان السائق المختار هو نفسه، نقوم بتحديث إحداثياته في الواجهة
          if (selectedDriver?.id === driverId) {
            setSelectedDriver((prev: any) => ({
              ...prev,
              latitude,
              longitude,
              currentLocation
            }));
          }
        } else if (message.type === 'driver_status_update') {
          queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
        }
      } catch (err) {
        console.error('Error processing live tracking message:', err);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [selectedDriver, queryClient]);

  // دمج بيانات السائقين من الـ API مع التحديثات الحية
  const driversWithLive = drivers.map(d => {
    if (liveDrivers[d.id]) {
      return {
        ...d,
        latitude: liveDrivers[d.id].latitude,
        longitude: liveDrivers[d.id].longitude,
        currentLocation: liveDrivers[d.id].currentLocation || d.currentLocation
      };
    }
    return d;
  });

  // السائقون الذين لديهم إحداثيات
  const activeDrivers = driversWithLive.filter(d => d.latitude && d.longitude && d.isActive);

  const focusOnDriver = (driver: any) => {
    const lat = parseFloat(driver.latitude);
    const lng = parseFloat(driver.longitude);
    setMapCenter([lat, lng]);
    setSelectedDriver(driver);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Navigation className="w-8 h-8 text-primary" />
          تتبع السائقين المباشر
        </h1>
        <Badge variant="outline" className="text-lg py-1 px-4 font-bold border-2">
          {activeDrivers.length} سائق متصل حالياً
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
        {/* قائمة السائقين */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col border-none shadow-xl rounded-2xl">
          <CardHeader className="bg-white border-b py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-500" />
              قائمة السائقين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-gray-50/50">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
            ) : activeDrivers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold">
                لا يوجد سائقون نشطون حالياً على الخريطة
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => focusOnDriver(driver)}
                    className={`p-4 cursor-pointer transition-all hover:bg-white flex items-start gap-3 ${
                      selectedDriver?.id === driver.id ? 'bg-white border-r-4 border-primary shadow-sm' : ''
                    }`}
                  >
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{driver.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {driver.phone}
                      </p>
                      <Badge 
                        variant="secondary"
                        className={driver.isAvailable ? "mt-2 text-[10px] bg-green-100 text-green-800" : "mt-2 text-[10px]"}
                      >
                        {driver.isAvailable ? 'متاح' : 'مشغول'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* الخريطة */}
        <Card className="lg:col-span-3 border-none shadow-xl rounded-2xl overflow-hidden relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="w-full h-full z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocusHandler center={mapCenter} />
            
            {activeDrivers.map((driver) => (
              <Marker
                key={driver.id}
                position={[parseFloat(driver.latitude), parseFloat(driver.longitude)]}
                icon={driverIcon}
                eventHandlers={{
                  click: () => setSelectedDriver(driver),
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-right p-1" dir="rtl">
                    <p className="font-bold text-lg text-primary mb-1">{driver.name}</p>
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {driver.phone}
                    </p>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-bold text-gray-500 mb-1">الموقع الحالي:</p>
                      <p className="text-xs text-gray-700 bg-gray-100 p-2 rounded">
                        {driver.currentLocation || 'غير محدد'}
                      </p>
                    </div>
                    <Badge className="w-full mt-3 justify-center py-1">
                      {driver.isAvailable ? 'متاح للطلبات' : 'في مهمة عمل'}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {!selectedDriver && activeDrivers.length > 0 && (
            <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border-2 border-primary/20 animate-bounce">
              <p className="text-xs font-bold text-primary flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                اختر سائقاً من القائمة لمتابعة حركته
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
