'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Cart } from '@/lib/api';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      loadProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadProfile(authToken: string) {
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
  }

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
