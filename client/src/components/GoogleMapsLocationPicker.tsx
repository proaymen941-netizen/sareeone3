import { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, Loader2, X, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import GoogleMapPicker from './maps/GoogleMapPicker';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
  distance?: number;
}

interface GoogleMapsLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  restaurantLocation?: { lat: number; lng: number };
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleMapsLocationPicker({ 
  onLocationSelect, 
  restaurantLocation,
  className = "",
  isOpen,
  onClose
}: GoogleMapsLocationPickerProps) {
  const handleLocationSelect = (location: any) => {
    const finalLocation = {
      ...location,
      area: location.address.split(',')[0], // Simple heuristic for area
      distance: restaurantLocation ? calculateDistance(
        location.lat, 
        location.lng, 
        restaurantLocation.lat, 
        restaurantLocation.lng
      ) : undefined
    };
    onLocationSelect(finalLocation);
  };

  // حساب المسافة بين نقطتين (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <GoogleMapPicker
      isOpen={isOpen}
      onClose={onClose}
      onLocationSelect={handleLocationSelect}
      initialLocation={restaurantLocation}
    />
  );
}
