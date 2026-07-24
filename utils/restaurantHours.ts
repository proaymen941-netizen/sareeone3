export interface RestaurantStatus {
  isOpen: boolean;
  nextOpenTime?: string;
  closeTime?: string;
  message: string;
  statusColor: 'green' | 'red' | 'yellow';
}

export function getRestaurantStatus(restaurant: any): RestaurantStatus {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  // Check if temporarily closed
  if (restaurant.isTemporarilyClosed) {
    return {
      isOpen: false,
      message: restaurant.temporaryCloseReason || 'مغلق مؤقتاً',
      statusColor: 'red'
    };
  }

  // Check if restaurant is manually set to closed
  if (!restaurant.isOpen) {
    return {
      isOpen: false,
      message: 'مغلق',
      statusColor: 'red'
    };
  }

  // Parse working days
  const workingDays = restaurant.workingDays 
    ? restaurant.workingDays.split(',').map(Number)
    : [0, 1, 2, 3, 4, 5, 6];

  // Check if today is a working day
  if (!workingDays.includes(currentDay)) {
    const nextWorkingDay = getNextWorkingDay(currentDay, workingDays);
    return {
      isOpen: false,
      nextOpenTime: `${getDayName(nextWorkingDay)} ${restaurant.openingTime || '08:00'}`,
      message: `مغلق اليوم - يفتح ${getDayName(nextWorkingDay)} ${restaurant.openingTime || '08:00'}`,
      statusColor: 'red'
    };
  }

  const openingTime = restaurant.openingTime || '08:00';
  const closingTime = restaurant.closingTime || '23:00';

  // Check if currently within working hours
  if (isTimeInRange(currentTime, openingTime, closingTime)) {
    const minutesUntilClose = getMinutesUntilTime(currentTime, closingTime);
    
    if (minutesUntilClose <= 30) {
      return {
        isOpen: true,
        closeTime: closingTime,
        message: `مفتوح - يغلق الساعة ${closingTime}`,
        statusColor: 'yellow'
      };
    }
    
    return {
      isOpen: true,
      closeTime: closingTime,
      message: `مفتوح حتى ${closingTime}`,
      statusColor: 'green'
    };
  }

  // Restaurant is closed - calculate next opening time
  if (currentTime < openingTime) {
    // Will open today
    return {
      isOpen: false,
      nextOpenTime: `اليوم ${openingTime}`,
      message: `مغلق - يفتح اليوم الساعة ${openingTime}`,
      statusColor: 'red'
    };
  } else {
    // Will open tomorrow or next working day
    const nextWorkingDay = getNextWorkingDay(currentDay, workingDays);
    const dayText = nextWorkingDay === (currentDay + 1) % 7 ? 'غداً' : getDayName(nextWorkingDay);
    
    return {
      isOpen: false,
      nextOpenTime: `${dayText} ${openingTime}`,
      message: `مغلق - يفتح ${dayText} الساعة ${openingTime}`,
      statusColor: 'red'
    };
  }
}

function isTimeInRange(current: string, start: string, end: string): boolean {
  const currentMinutes = timeToMinutes(current);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // Handle overnight hours (e.g., 22:00 to 02:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getMinutesUntilTime(currentTime: string, targetTime: string): number {
  const currentMinutes = timeToMinutes(currentTime);
  const targetMinutes = timeToMinutes(targetTime);
  
  if (targetMinutes < currentMinutes) {
    // Next day
    return (24 * 60) - currentMinutes + targetMinutes;
  }
  
  return targetMinutes - currentMinutes;
}

function getNextWorkingDay(currentDay: number, workingDays: number[]): number {
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    if (workingDays.includes(nextDay)) {
      return nextDay;
    }
  }
  return workingDays[0] || 0;
}

function getDayName(day: number): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[day] || '';
}

export function canOrderFromRestaurant(restaurant: any): { canOrder: boolean; message?: string } {
  // If restaurant is manually set to open, allow ordering regardless of hours (for demo)
  if (restaurant.isOpen && !restaurant.isTemporarilyClosed) {
    return { canOrder: true };
  }
  
  const status = getRestaurantStatus(restaurant);
  
  if (!status.isOpen) {
    return {
      canOrder: false,
      message: `عذراً، لا يمكن الطلب الآن. ${status.message}`
    };
  }
  
  return { canOrder: true };
}