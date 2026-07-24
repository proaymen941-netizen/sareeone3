import { useState, useEffect } from 'react';
import EnhancedDriverDashboard from './EnhancedDriverDashboard';

export default function DriverApp() {
  const [driverId, setDriverId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const driverData = localStorage.getItem('driver_user');

    if (token && driverData) {
      try {
        const user = JSON.parse(driverData);
        setDriverId(user.id);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing driver data:', error);
        handleLogout();
      }
    } else {
      window.location.href = '/driver-login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    window.location.href = '/driver-login';
  };

  if (!isAuthenticated || !driverId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return <EnhancedDriverDashboard driverId={driverId} onLogout={handleLogout} />;
}
