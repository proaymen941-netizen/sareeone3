
export function coerceRequestData(data: any) {
  const coerced = { ...data };
  
  // Convert decimal fields to strings (Zod expects strings for decimal fields)
  const decimalFields = [
    'minimumOrder', 'deliveryFee', 'perKmFee', 'latitude', 'longitude', 
    'discountAmount', 'rating', 'commissionRate', 'salary', 'hoursWorked', 
    'salaryAmount', 'earnings', 'price', 'originalPrice', 'amount', 
    'subtotal', 'total', 'totalAmount', 'distance', 'driverEarnings', 
    'restaurantEarnings', 'companyEarnings', 'totalBalance', 'availableBalance', 
    'withdrawnAmount', 'pendingAmount', 'balanceBefore', 'balanceAfter', 'bundlePrice'
  ];
  
  decimalFields.forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null && coerced[field] !== '') {
      coerced[field] = String(coerced[field]);
    } else if (coerced[field] === null || coerced[field] === '') {
      coerced[field] = undefined; // Use undefined instead of null for optional fields
    }
  });
  
  // Convert integer fields properly
  const intFields = ['reviewCount', 'discountPercent', 'sortOrder', 'quantity'];
  intFields.forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null && coerced[field] !== '') {
      const parsed = parseInt(coerced[field]);
      coerced[field] = isNaN(parsed) ? undefined : parsed;
    } else if (coerced[field] === null || coerced[field] === '') {
      coerced[field] = undefined;
    }
  });
  
  // Properly parse boolean fields
  const boolFields = [
    'isOpen', 'isActive', 'isFeatured', 'isNew', 'isTemporarilyClosed', 
    'isAvailable', 'isSpecialOffer', 'isApproved', 'isRead'
  ];
  boolFields.forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null) {
      const value = coerced[field];
      if (typeof value === 'string') {
        coerced[field] = value === 'true' || value === '1';
      } else if (typeof value === 'number') {
        coerced[field] = !!value;
      } else {
        coerced[field] = Boolean(value);
      }
    }
  });
  
  // Handle permissions array
  if (Array.isArray(coerced.permissions)) {
    coerced.permissions = JSON.stringify(coerced.permissions);
  } else if (coerced.permissions === null || coerced.permissions === '') {
    coerced.permissions = undefined;
  }
  
  // Parse date fields
  const dateFields = ['validUntil', 'hireDate', 'checkIn', 'checkOut', 'startDate', 'endDate', 'date'];
  dateFields.forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null && coerced[field] !== '') {
      const date = new Date(coerced[field]);
      coerced[field] = isNaN(date.getTime()) ? undefined : date;
    } else if (coerced[field] === null || coerced[field] === '') {
      coerced[field] = undefined;
    }
  });
  
  // Convert optional text/UUID fields to undefined instead of null
  const optionalTextFields = ['categoryId', 'temporaryCloseReason', 'address', 'restaurantId', 'sectionId', 'menuItemId'];
  optionalTextFields.forEach(field => {
    if (coerced[field] === null || coerced[field] === '') {
      coerced[field] = undefined;
    }
  });
  
  return coerced;
}
