'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Cart, UserRole } from '@/lib/api';
import { getProfile, getCart } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  cart: Cart | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateCart: (cart: Cart) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(() => getInitialToken() !== null);

  const loadProfile = useCallback(async (authToken: string) => {
    try {
      const userData = await getProfile(authToken);
      setUser(userData);
      const cartData = await getCart(authToken);
      setCart({
        ...cartData,
        items: cartData.items || [],
        total: cartData.total || '0',
        total_items: cartData.total_items || 0,
      });
    } catch {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void loadProfile(token);
    }
  }, [token, loadProfile]);

  function login(newToken: string, userData: User) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    getCart(newToken).then((cartData) =>
      setCart({
        ...cartData,
        items: cartData.items || [],
        total: cartData.total || '0',
        total_items: cartData.total_items || 0,
      })
    );
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCart(null);
  }

  function updateCart(cartData: Cart) {
    setCart({
      ...cartData,
      items: cartData.items || [],
      total: cartData.total || '0',
      total_items: cartData.total_items || 0,
    });
  }

  async function refreshProfile() {
    if (token) {
      const userData = await getProfile(token);
      setUser(userData);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, token, cart, isLoading, login, logout, updateCart, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Session user role (null while loading or when the user is not authenticated).
export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
