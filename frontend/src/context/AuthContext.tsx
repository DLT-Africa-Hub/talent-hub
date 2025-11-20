import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import { AuthResponsePayload, AuthUser as User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthResponsePayload>;
  register: (
    email: string,
    password: string,
    role: string
  ) => Promise<AuthResponsePayload>;
  logout: () => void;
  ingestAuthPayload: (payload: AuthResponsePayload) => AuthResponsePayload;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const persistAuthPayload = (payload: AuthResponsePayload) => {
    setToken(payload.accessToken);
    setUser(payload.user);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('token', payload.accessToken);
      sessionStorage.setItem('user', JSON.stringify(payload.user));
    }
    return payload;
  };

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResponsePayload> => {
    try {
      const response = await authApi.login(email, password);
      return persistAuthPayload(response);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    role: string
  ): Promise<AuthResponsePayload> => {
    try {
      const response = await authApi.register(email, password, role);
      return persistAuthPayload(response);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const ingestAuthPayload = (payload: AuthResponsePayload) =>
    persistAuthPayload(payload);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        ingestAuthPayload,
        updateUser,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
