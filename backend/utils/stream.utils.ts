import jwt from 'jsonwebtoken';

/**
 * Generate a Stream video token for a user
 * Stream tokens are JWTs signed with the Stream secret
 */
export function generateStreamToken(userId: string): string {
    const streamSecret = process.env.STREAM_API_SECRET;

    if (!streamSecret) {
        throw new Error('STREAM_SECRET_KEY environment variable is not configured');
    }

    // Stream token payload structure
    const payload = {
        user_id: userId,
        // Stream tokens typically expire in 24 hours, but can be adjusted
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours from now
        iat: Math.floor(Date.now() / 1000), // Issued at time
    };

    // Sign the token with Stream secret using HS256 algorithm
    return jwt.sign(payload, streamSecret, {
        algorithm: 'HS256',
    });
}

