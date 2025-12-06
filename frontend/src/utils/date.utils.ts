/**
 * Format a date string in long format with timezone
 * @param dateString - ISO date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns Formatted date string or original string if formatting fails
 */
export const formatDateLong = (
  dateString: string,
  timezone: string
): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * Calculate and format the time remaining until a deadline
 * @param deadline - ISO date string of the deadline
 * @returns Formatted string like "2 days", "5 hours", "30 minutes", or null if deadline has passed
 */
export const getTimeUntilDeadline = (deadline: string): string | null => {
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } catch {
    return null;
  }
};

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted string like "1 hour" or "30 minutes"
 */
export const formatDuration = (minutes: number): string => {
  return minutes === 60 ? '1 hour' : `${minutes} minutes`;
};
