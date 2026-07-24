import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency as sharedFormatCurrency, formatDate as sharedFormatDate } from "@shared/utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  return sharedFormatCurrency(amount);
}

export function formatDate(date: string | Date): string {
  return sharedFormatDate(date);
}
