/**
 * Calculates the distance between two points in kilometers using the Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 100) / 100;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates delivery fee based on distance and settings
 */
export function calculateDeliveryFee(
  distance: number,
  settings: {
    baseFee: number;
    perKmFee: number;
    minFee: number;
    maxFee: number;
    freeDeliveryThreshold?: number;
    subtotal?: number;
  }
): number {
  // Check for free delivery threshold
  if (settings.freeDeliveryThreshold && settings.subtotal && settings.subtotal >= settings.freeDeliveryThreshold) {
    return 0;
  }

  let fee = settings.baseFee + (distance * settings.perKmFee);
  
  // Apply min/max limits
  if (fee < settings.minFee) fee = settings.minFee;
  if (fee > settings.maxFee) fee = settings.maxFee;
  
  return Math.round(fee * 100) / 100;
}
