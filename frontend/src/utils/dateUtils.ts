/**
 * Date utilities for Mexico City timezone
 */

export const MEXICO_TIMEZONE = 'America/Mexico_City';

/**
 * Get current date and time in Mexico City timezone
 */
export const getCurrentMexicoCityDateTime = (): Date => {
  const now = new Date();
  // Create a new date with Mexico City timezone
  const mexicoTime = new Date(now.toLocaleString("en-US", {timeZone: MEXICO_TIMEZONE}));
  return mexicoTime;
};

/**
 * Format a date to ISO string in Mexico City timezone
 */
export const toMexicoCityISOString = (date?: Date): string => {
  const targetDate = date || getCurrentMexicoCityDateTime();
  return targetDate.toISOString();
};

/**
 * Format a date for display in Mexico City timezone
 */
export const formatMexicoCityDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: MEXICO_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return dateObj.toLocaleString('es-MX', { ...defaultOptions, ...options });
};

/**
 * Format a date for datetime-local input in Mexico timezone
 */
export const toDateTimeLocalFormat = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to Mexico City timezone
  const mexicoTime = new Date(dateObj.toLocaleString("en-US", {timeZone: MEXICO_TIMEZONE}));
  
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const year = mexicoTime.getFullYear();
  const month = String(mexicoTime.getMonth() + 1).padStart(2, '0');
  const day = String(mexicoTime.getDate()).padStart(2, '0');
  const hours = String(mexicoTime.getHours()).padStart(2, '0');
  const minutes = String(mexicoTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Check if a date is today in Mexico City timezone
 */
export const isToday = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getCurrentMexicoCityDateTime();
  
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Get relative time string (e.g., "hace 2 horas", "ayer")
 */
export const getRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getCurrentMexicoCityDateTime();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'ahora';
  } else if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `hace ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else {
    return formatMexicoCityDate(dateObj, { month: 'short', day: 'numeric' });
  }
};
