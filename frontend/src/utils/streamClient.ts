import { StreamVideoClient, User } from '@stream-io/video-react-sdk';

/**
 * Create a Stream video client instance
 * @param userId - The current user ID from authentication state
 * @param token - Authentication token generated on the server-side
 * @param userName - Optional user name
 * @param userImage - Optional user image URL
 * @returns StreamVideoClient instance
 */
export const createStreamClient = (
  userId: string,
  token: string,
  userName?: string,
  userImage?: string
): StreamVideoClient => {
  const apiKey = import.meta.env.VITE_STREAM_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_STREAM_API_KEY is not configured');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const user: User = {
    id: userId,
    name: userName,
    image: userImage,
  };

  // Initialize the client
  const client = new StreamVideoClient({ apiKey, token, user });

  return client;
};

export default createStreamClient;
