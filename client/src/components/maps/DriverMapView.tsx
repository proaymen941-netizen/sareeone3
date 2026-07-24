import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Phone, Package } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#10b981" stroke="white" stroke-width="2"/>
      <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2.5" fill="none"/>
    </svg>
  `),
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const destinationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#f59e0b" stroke="white" stroke-width="2"/>
      <path d="M8 6v12M12 6v6M16 6v2" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `),
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  restaurantLat?: string;
  restaurantLng?: string;
  status: string;
  totalAmount: string;
}

interface DriverMapViewProps {
  orders: Order[];
  driverLocation?: [number, number] | null;
  height?: string;
  onNavigate?: (order: Order) => void;
  onCall?: (phone: string) => void;
}

// Component to auto-fit bounds
function AutoFitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  
  return null;
}

// Component to track driver location
function useDriverLocation() {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  
  return { location, error };
}

export default function DriverMapView({
  orders,
  driverLocation: propDriverLocation,
  height = '500px',
  onNavigate,
  onCall,
}: DriverMapViewProps) {
  const { location: autoDriverLocation } = useDriverLocation();
  const driverLocation = propDriverLocation || autoDriverLocation;
  
  // Default center (Sanaa, Yemen)
  const defaultCenter: [number, number] = [15.3694, 44.1910];
  const mapCenter = driverLocation || defaultCenter;
  
  // Calculate route and bounds
  const allPoints: [number, number][] = [];
  if (driverLocation) allPoints.push(driverLocation);
  
  orders.forEach(order => {
    if (order.restaurantLat && order.restaurantLng) {
      allPoints.push([parseFloat(order.restaurantLat), parseFloat(order.restaurantLng)]);
    }
    if (order.customerLocationLat && order.customerLocationLng) {
      allPoints.push([parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)]);
    }
  });
  
  const bounds = allPoints.length > 0 
    ? L.latLngBounds(allPoints) 
    : null;
  
  // Calculate optimal route (simple - can be enhanced with routing API)
  const routePoints: [number, number][] = [];
  if (driverLocation) {
    routePoints.push(driverLocation);
    orders.forEach(order => {
      if (order.status === 'picked_up' || order.status === 'on_way') {
        if (order.customerLocationLat && order.customerLocationLng) {
          routePoints.push([parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)]);
        }
      } else if (order.status === 'ready' || order.status === 'assigned') {
        if (order.restaurantLat && order.restaurantLng) {
          routePoints.push([parseFloat(order.restaurantLat), parseFloat(order.restaurantLng)]);
        }
      }
    });
  }
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  return (
    <div className="space-y-4">
      <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {bounds && <AutoFitBounds bounds={bounds} />}
          
          {/* Driver location */}
          {driverLocation && (
            <Marker position={driverLocation} icon={driverIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-green-600">موقعك الحالي</p>
                  <p className="text-sm text-gray-600">يتم تحديث الموقع تلقائياً</p>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Route polyline */}
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
          
          {/* Order markers */}
          {orders.map((order) => {
            const needsPickup = order.status === 'ready' || order.status === 'assigned';
            const needsDelivery = order.status === 'picked_up' || order.status === 'on_way';
            
            // Restaurant marker
            if (needsPickup && order.restaurantLat && order.restaurantLng) {
              const restaurantPos: [number, number] = [parseFloat(order.restaurantLat), parseFloat(order.restaurantLng)];
              const distance = driverLocation 
                ? calculateDistance(driverLocation[0], driverLocation[1], restaurantPos[0], restaurantPos[1])
                : null;
              
              return (
                <Marker key={`restaurant-${order.id}`} position={restaurantPos} icon={restaurantIcon}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <p className="font-bold text-orange-600 mb-2">استلام من المطعم</p>
                      <p className="text-sm"><strong>الطلب:</strong> #{order.orderNumber || order.id.slice(0, 8)}</p>
                      <p className="text-sm"><strong>العميل:</strong> {order.customerName}</p>
                      {distance && (
                        <p className="text-sm"><strong>المسافة:</strong> {distance.toFixed(2)} كم</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate(order)}
                            className="flex-1 bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700"
                          >
                            <Navigation size={12} className="inline mr-1" />
                            توجيه
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            
            // Customer marker
            if (needsDelivery && order.customerLocationLat && order.customerLocationLng) {
              const customerPos: [number, number] = [parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)];
              const distance = driverLocation 
                ? calculateDistance(driverLocation[0], driverLocation[1], customerPos[0], customerPos[1])
                : null;
              
              return (
                <Marker key={`customer-${order.id}`} position={customerPos} icon={destinationIcon}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <p className="font-bold text-red-600 mb-2">توصيل للعميل</p>
                      <p className="text-sm"><strong>الطلب:</strong> #{order.orderNumber || order.id.slice(0, 8)}</p>
                      <p className="text-sm"><strong>العميل:</strong> {order.customerName}</p>
                      <p className="text-sm"><strong>الهاتف:</strong> {order.customerPhone}</p>
                      <p className="text-sm"><strong>العنوان:</strong> {order.deliveryAddress}</p>
                      {distance && (
                        <p className="text-sm"><strong>المسافة:</strong> {distance.toFixed(2)} كم</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        {onCall && (
                          <button
                            onClick={() => onCall(order.customerPhone)}
                            className="flex-1 bg-green-600 text-white text-xs py-1 px-2 rounded hover:bg-green-700"
                          >
                            <Phone size={12} className="inline mr-1" />
                            اتصال
                          </button>
                        )}
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate(order)}
                            className="flex-1 bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700"
                          >
                            <Navigation size={12} className="inline mr-1" />
                            توجيه
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            
            return null;
          })}
        </MapContainer>
      </div>
      
      {/* Map legend */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-around text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white"></div>
            <span>موقعك</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white"></div>
            <span>المطعم</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white"></div>
            <span>العميل</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 bg-blue-500 border-dashed"></div>
            <span>المسار</span>
          </div>
        </div>
      </div>
    </div>
  );
}
