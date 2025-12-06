import { StreamClient } from '@stream-io/node-sdk';

/**
 * Get Stream client instance
 */
export function getStreamClient(): StreamClient {
  const streamApiKey = process.env.STREAM_API_KEY;
  const streamSecret =
    process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY;

  if (!streamApiKey || !streamSecret) {
    throw new Error(
      'STREAM_API_KEY and STREAM_SECRET_KEY environment variables must be configured'
    );
  }

  return new StreamClient(streamApiKey, streamSecret, { timeout: 3000 });
}

/**
 * Generate a Stream video token for a user using the Stream SDK
 */
export function generateStreamToken(
  userId: string,
  expirationInSeconds: number = 60 * 60,
  callCids: string[] = []
): string {
  const streamClient = getStreamClient();

  // Generate token with expiration (default 1 hour)
  // call_cids is required - use empty array for general tokens or specific call IDs
  const token = streamClient.generateCallToken({
    user_id: userId,
    call_cids: callCids,
    validity_in_seconds: expirationInSeconds,
  });

  return token;
}
