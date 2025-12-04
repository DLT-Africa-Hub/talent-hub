/**
 * Timezone utilities for interview scheduling
 * Uses date-fns-tz for reliable timezone handling
 */
import { formatInTimeZone } from 'date-fns-tz';

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

  const formatStr = 'EEE, MMM d, yyyy h:mm a zzz';
  return formatInTimeZone(date, timezone, formatStr);
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
  const formatStr = 'EEE, MMM d, h:mm a';
  const tzFormat = 'zzz';

  return {
    companyTime: formatInTimeZone(date, companyTimezone, formatStr),
    graduateTime: formatInTimeZone(date, graduateTimezone, formatStr),
    companyTimezoneAbbr: formatInTimeZone(date, companyTimezone, tzFormat),
    graduateTimezoneAbbr: formatInTimeZone(date, graduateTimezone, tzFormat),
    durationLabel: duration === 60 ? '1 hour' : `${duration} minutes`,
  };
};
