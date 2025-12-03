/**
 * Timezone utilities for interview scheduling
 * Uses built-in Intl API for timezone handling
 */

// Common timezones for quick reference
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Johannesburg',
] as const;

export type CommonTimezone = typeof COMMON_TIMEZONES[number];

/**
 * Check if a timezone string is valid
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Get the current UTC offset for a timezone in minutes
 */
export const getTimezoneOffset = (timezone: string, date: Date = new Date()): number => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // Get the offset by comparing UTC time with local time in the given timezone
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
};

/**
 * Convert a date from one timezone to another
 */
export const convertTimezone = (
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date => {
  if (!isValidTimezone(fromTimezone)) {
    throw new Error(`Invalid source timezone: ${fromTimezone}`);
  }
  if (!isValidTimezone(toTimezone)) {
    throw new Error(`Invalid target timezone: ${toTimezone}`);
  }

  // Convert to the target timezone
  const dateString = date.toLocaleString('en-US', { timeZone: toTimezone });
  return new Date(dateString);
};

/**
 * Format a date in a specific timezone
 */
export const formatDateInTimezone = (
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone,
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
};

/**
 * Get timezone abbreviation (e.g., EST, PST, WAT)
 */
export const getTimezoneAbbreviation = (timezone: string, date: Date = new Date()): string => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const tzPart = parts.find(part => part.type === 'timeZoneName');
  return tzPart?.value || timezone;
};

/**
 * Get a human-readable timezone name
 */
export const getTimezoneDisplayName = (timezone: string): string => {
  if (!isValidTimezone(timezone)) {
    return timezone;
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
};

/**
 * Calculate the time difference between two timezones in hours
 */
export const getTimezoneDifference = (
  timezone1: string,
  timezone2: string,
  date: Date = new Date()
): number => {
  const offset1 = getTimezoneOffset(timezone1, date);
  const offset2 = getTimezoneOffset(timezone2, date);
  return (offset2 - offset1) / 60;
};

/**
 * Get all supported timezone names
 */
export const getAllTimezones = (): string[] => {
  // Return a list of commonly used IANA timezone names
  return [
    // Africa
    'Africa/Abidjan',
    'Africa/Accra',
    'Africa/Algiers',
    'Africa/Cairo',
    'Africa/Casablanca',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
    // Americas
    'America/Anchorage',
    'America/Argentina/Buenos_Aires',
    'America/Bogota',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/New_York',
    'America/Phoenix',
    'America/Sao_Paulo',
    'America/Toronto',
    'America/Vancouver',
    // Asia
    'Asia/Bangkok',
    'Asia/Dhaka',
    'Asia/Dubai',
    'Asia/Hong_Kong',
    'Asia/Jakarta',
    'Asia/Jerusalem',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Kuala_Lumpur',
    'Asia/Manila',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Taipei',
    'Asia/Tokyo',
    // Australia & Pacific
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Sydney',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Pacific/Honolulu',
    // Europe
    'Europe/Amsterdam',
    'Europe/Athens',
    'Europe/Berlin',
    'Europe/Brussels',
    'Europe/Dublin',
    'Europe/Helsinki',
    'Europe/Istanbul',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Moscow',
    'Europe/Oslo',
    'Europe/Paris',
    'Europe/Prague',
    'Europe/Rome',
    'Europe/Stockholm',
    'Europe/Vienna',
    'Europe/Warsaw',
    'Europe/Zurich',
    // UTC
    'UTC',
  ];
};

/**
 * Create a date object from date/time components in a specific timezone
 */
export const createDateInTimezone = (
  year: number,
  month: number, // 0-11
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // Create a date string and parse it in the given timezone
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Get the offset for this timezone at this time
  const tempDate = new Date(dateStr);
  const utcDate = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone }));
  const offset = (utcDate.getTime() - tzDate.getTime());
  
  return new Date(new Date(dateStr).getTime() + offset);
};

/**
 * Parse an ISO date string and interpret it in a specific timezone
 */
export const parseInTimezone = (dateString: string, timezone: string): Date => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // If the date string includes a timezone offset, use it directly
  if (dateString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }

  // Otherwise, interpret the date in the given timezone
  const date = new Date(dateString);
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offset = utcDate.getTime() - tzDate.getTime();
  
  return new Date(date.getTime() + offset);
};

/**
 * Format time slots for display in multiple timezones
 */
export const formatTimeSlotForDisplay = (
  date: Date,
  duration: number,
  companyTimezone: string,
  graduateTimezone: string
): {
  companyTime: string;
  graduateTime: string;
  companyTimezoneAbbr: string;
  graduateTimezoneAbbr: string;
  durationLabel: string;
} => {
  const formatOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return {
    companyTime: formatDateInTimezone(date, companyTimezone, formatOptions),
    graduateTime: formatDateInTimezone(date, graduateTimezone, formatOptions),
    companyTimezoneAbbr: getTimezoneAbbreviation(companyTimezone, date),
    graduateTimezoneAbbr: getTimezoneAbbreviation(graduateTimezone, date),
    durationLabel: duration === 60 ? '1 hour' : `${duration} minutes`,
  };
};

