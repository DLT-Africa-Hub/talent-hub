/**
 * Decode JWT token without verification (to check expiration)
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export const decodeToken = (
  token: string
): { exp?: number; iat?: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired or will expire soon
 * @param token - JWT token string
 * @param bufferSeconds - Buffer time in seconds before expiration (default: 15 minutes for better safety)
 * @returns true if token is expired or will expire soon
 */
export const isTokenExpiringSoon = (
  token: string | null,
  bufferSeconds: number = 15 * 60 // 15 minutes default - refresh well before expiration
): boolean => {
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = bufferSeconds * 1000;

  // Token is expired or will expire within buffer time
  return expirationTime <= currentTime + bufferTime;
};

/**
 * Get time until token expires in milliseconds
 * @param token - JWT token string
 * @returns Milliseconds until expiration, or 0 if expired/invalid
 */
export const getTimeUntilExpiration = (token: string | null): number => {
  if (!token) return 0;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;

  return Math.max(0, timeUntilExpiration);
};
