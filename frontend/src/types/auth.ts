export interface AuthUser {
  id: string;
  email: string;
  role: 'graduate' | 'company' | 'admin';
  emailVerified?: boolean;
}

export interface AuthResponsePayload {
  message: string;
  accessToken: string;
  refreshToken: string;
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
    ipAddress?: string;
    userAgent?: string;
  };
  user: AuthUser;
}
