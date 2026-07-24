
export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = new Intl.NumberFormat('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount || 0);
  return `${formatted} ريال`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}
