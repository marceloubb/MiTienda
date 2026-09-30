'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Cart, UserRole, APIError, type TOTPChallenge } from '@/lib/api';
import { getProfile, getCart, logout as apiLogout, onTokenChange, onTOTPRequired } from '@/lib/api';
import TotpChallengeDialog from '@/components/TotpChallengeDialog';

interface AuthContextType {
  user: User | null;
  cart: Cart | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateCart: (cart: Cart) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The auth token lives in an httpOnly cookie that JavaScript cannot read, so
// there is nothing to persist client-side and no token string in this state.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  // Always start "loading" and probe the session once on mount: getProfile()
  // succeeds when a valid cookie exists (restoring the session after a page
  // reload) and 401s when there is none (anonymous).
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const userData = await getProfile();
      setUser(userData);
      const cartData = await getCart();
      setCart({
        ...cartData,
        items: cartData.items || [],
        total: cartData.total || '0',
        total_items: cartData.total_items || 0,
      });
    } catch (error) {
      // 401/403: no valid session (or a refresh failure already handled by
      // api.ts) — anonymous. Transient 5xx and network errors leave the user
      // anonymous for this mount instead of blocking the whole app.
      const status = error instanceof APIError ? error.status : undefined;
      if (status === 401 || status === 403) {
        setUser(null);
        setCart(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Attempt to restore the session on mount; the backend cookie authenticates
  // the request.
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Refresh-failure path: api.ts signals an unrecoverable session, so clear
  // the client state. The cookie itself is out of reach and expires naturally.
  useEffect(() => {
    return onTokenChange(() => {
      setUser(null);
      setCart(null);
    });
  }, []);

  // Global 2FA gate. Registered next to the token-change effect so both
  // session-level signals the API client raises are owned by the provider, not
  // by whichever component happened to make the failing request. Mounting the
  // resolver here is what guarantees no authenticated surface is the only one
  // that can answer `totp_required`.
  //
  // The state holds the whole `TOTPChallenge`, not just its replay closure: the
  // replay alone cannot settle the caller parked behind it, so storing only that
  // leaves every gated promise pending forever. The first gated request wins the
  // dialog; a later concurrent one replaces it.
  const [totpChallenge, setTotpChallenge] = useState<TOTPChallenge | null>(null);
  useEffect(() => {
    return onTOTPRequired((challenge) => {
      // Wrapped in an arrow, as in W5b: React treats a bare function argument as
      // a state updater and would call it.
      setTotpChallenge(() => challenge);
    });
  }, []);

  function login(userData: User) {
    // The backend already set the httpOnly cookie in the login/register
    // response; here we only restore the client state.
    setUser(userData);
    getCart().then((cartData) =>
      setCart({
        ...cartData,
        items: cartData.items || [],
        total: cartData.total || '0',
        total_items: cartData.total_items || 0,
      })
    );
  }

  function logout() {
    // Best-effort server-side teardown: deletes the server token and clears
    // the cookie via Set-Cookie. Client state clears regardless; if the API
    // is unreachable the cookie expires naturally (or the next refresh 401s).
    void apiLogout().catch(() => {});
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
    const userData = await getProfile();
    setUser(userData);
  }

  return (
    <AuthContext.Provider
      value={{ user, cart, isLoading, login, logout, updateCart, refreshProfile }}
    >
      {children}
      {/* The dialog is the session's only resolver for the 2FA gate. It renders
          after `children` so it stacks above any page-level surface, and it
          carries no cancel: a gated session's way out is `logout()`, which W5a
          made reachable without a code. `onResolved` is not a cancel — it fires
          only once the parked caller has been resumed, and it is what stops a
          resolved session from sitting behind a blocking overlay. */}
      <TotpChallengeDialog
        open={totpChallenge !== null}
        challenge={totpChallenge}
        onResolved={() => setTotpChallenge(null)}
      />
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