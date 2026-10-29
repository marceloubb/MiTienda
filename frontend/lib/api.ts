const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type FetchOptions = RequestInit & {
  /**
   * One-off TOTP code for this single request. Used by the login probe, where
   * the code is not established as the session code yet. Stripped before the
   * options reach `fetch` so it never leaks into the request payload.
   */
  totpCode?: string;
};

// Error de API con detalle estructurado. `fields` contiene los errores por
// campo del backend (DRF 400), p. ej. { username: ["Ya existe."] }. `code`
// es el identificador de máquina que el backend adjunta a algunos errores;
// hoy lo usa la gate de 2FA, que responde 401 con code === 'totp_required'.
export class APIError extends Error {
  status?: number;
  fields?: Record<string, string[]>;
  code?: string;

  constructor(
    message: string,
    details?: { status?: number; fields?: Record<string, string[]>; code?: string },
  ) {
    super(message);
    this.name = 'APIError';
    this.status = details?.status;
    this.fields = details?.fields;
    this.code = details?.code;
  }
}

function formatFieldMessage(fields: Record<string, string[]>): string {
  const parts = Object.entries(fields).map(([field, messages]) => `${field}: ${messages.join(', ')}`);
  return parts.join(' · ') || 'Error en la petición';
}

// --- Session lifecycle (security hardening) --------------------------------
//
// The DRF token lives in an httpOnly SameSite=Lax cookie set by the backend
// (login/register/refresh responses) and cleared on logout; the SPA never
// persists the token string client-side, so an XSS cannot steal it at rest.
// (The login/register/refresh responses still carry the token in the JSON body
// for non-browser header clients; the browser path only reads the responses'
// Set-Cookie.) The frontend calls the API cross-origin in dev (localhost:3000
// -> localhost:8000) but that is SAME-SITE — the port does not change the
// site — so Lax cookies are sent on those fetches and received back. Every
// request therefore uses `credentials: 'include'`; the Authorization header is
// kept only as a fallback for non-browser clients.
//
// The API client owns the single retry-on-401 policy: one refresh attempt
// (also cookie-authenticated), then one retry of the original request. When
// the refresh fails the session is unrecoverable, and the change hook below
// clears the client state (the cookie itself expires or 401s on its own).

type TokenChangeHandler = () => void;

let tokenChangeHandler: TokenChangeHandler | null = null;

/**
 * Register a handler called when the API client's session becomes
 * unrecoverable (refresh failure). Returns an unregister function for
 * effect cleanup.
 */
export function onTokenChange(handler: TokenChangeHandler): () => void {
  tokenChangeHandler = handler;
  return () => {
    if (tokenChangeHandler === handler) tokenChangeHandler = null;
  };
}

/** Signal the app that the session ended (refresh failure). */
export function setActiveToken(): void {
  tokenChangeHandler?.();
}

// Credential endpoints must never be auto-refreshed: a 401 there means bad
// credentials (or an invalid refresh token / active logout), not an expired
// session. Logout with an already-expired session is still fine: the server
// token is gone either way and the cookie clears on the next Set-Cookie.
const NON_RETRYABLE_ENDPOINTS = [
  '/users/login/',
  '/users/register/',
  '/users/token/refresh/',
  '/users/logout/',
];

// --- TOTP (H10) -------------------------------------------------------------
//
// Backend: when DJANGO_2FA_ENFORCED is on, every token-authenticated request
// from a user with a confirmed TOTP device must carry the current code in the
// `X-TOTP` header. A missing/invalid code is a 401 whose body is
// { detail: 'Código TOTP requerido', code: 'totp_required' }.
//
// The code is held in module memory only: never in a cookie, localStorage or
// sessionStorage, so an XSS cannot read it at rest and the browser drops it on
// reload. It lives exactly as long as the authenticated session and is cleared
// on logout.

// Credential endpoints never carry X-TOTP: the second factor belongs to an
// already-established session, so sending it there is meaningless to the
// backend and would leak the code on every login attempt.
const NO_TOTP_HEADER_ENDPOINTS = ['/users/login/', '/users/register/'];

let totpCode: string | null = null;

/** Store the session TOTP code and send it as `X-TOTP` on authenticated calls. */
export function setTOTPCode(code: string): void {
  totpCode = code;
}

/** Forget the TOTP code (logout, or a code the backend rejected). */
export function clearTOTPCode(): void {
  totpCode = null;
}

/** Current session TOTP code, or null. Exposed for tests/diagnostics only. */
export function getTOTPCode(): string | null {
  return totpCode;
}

/** True when `error` is the backend's 2FA gate asking for a second factor. */
export function isTOTPCodeRequired(error: unknown): boolean {
  return error instanceof APIError && error.status === 401 && error.code === 'totp_required';
}

// --- Global 2FA challenge ---------------------------------------------------
//
// The login page resolves the gate inline (its own `TOTPChallengeStep`), because
// at that point no session exists yet and the challenge is a step of the login
// form rather than an interruption. Every OTHER surface can be gated
// mid-session: a cart request, a profile save, an admin page. If each of those
// had to own a challenge, no authenticated surface could be the only resolver —
// and a user in a fresh tab whose cookie outlived their TOTP code would be
// locked out of the app entirely, with no way back.
//
// So the API client raises the gate to whoever registered a handler, and replays
// the original request once a code is supplied. What crosses the boundary is a
// `TOTPChallenge`: the one-shot replay plus the caller parked behind it. Both
// are closures the handler controls; the client keeps no reference beyond the
// dispatch, because they are only valid while the dialog that owns them is
// mounted.

/**
 * One gated request, parked until the challenge resolves it.
 *
 * `settled` is the ORIGINAL caller's promise — `getCart()` has to come back with
 * cart data, not `undefined`. It is resolve-only and never rejects, because the
 * spec requires a wrong code to leave the prompt open and the session unset: a
 * failed attempt must re-prompt, never surface as a caller failure.
 *
 * `replay` is the rejected request's own replay, one-shot.
 *
 * `resolve` hands the parked caller the replay's value. Only the dialog calls
 * it, and only once its replay resolved — i.e. once the backend accepted the
 * code.
 */
export interface TOTPChallenge {
  readonly settled: Promise<unknown>;
  replay: () => Promise<unknown>;
  resolve: (value: unknown) => void;
}

type TOTPRequiredHandler = (challenge: TOTPChallenge) => void;

let totpRequiredHandler: TOTPRequiredHandler | null = null;

/**
 * Register a handler invoked when the backend answers 401 `totp_required` on any
 * request. Returns an unregister function for effect cleanup. Mirrors
 * `onTokenChange`'s contract exactly: a single module-level slot, last
 * registration wins, unregistering only clears if still the same handler.
 */
export function onTOTPRequired(handler: TOTPRequiredHandler): () => void {
  totpRequiredHandler = handler;
  return () => {
    if (totpRequiredHandler === handler) totpRequiredHandler = null;
  };
}

/**
 * Resolve the `X-TOTP` header for an endpoint: an explicit one-off code wins
 * over the session code, and the credential endpoints never get one.
 */
function totpHeaderFor(endpoint: string, oneOffCode?: string): Record<string, string> {
  if (NO_TOTP_HEADER_ENDPOINTS.some((path) => endpoint.endsWith(path))) return {};
  const code = oneOffCode ?? totpCode;
  return code ? { 'X-TOTP': code } : {};
}

// A burst of parallel 401s (e.g. profile + cart) shares one in-flight refresh:
// the backend rotates the token on every refresh, so concurrent refreshes would
// invalidate each other. Every waiting request retries once with the cookie the
// rotated Set-Cookie response installed.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        // No Authorization header: the httpOnly cookie authenticates this
        // request, and the backend sets the rotated cookie on the response.
        const response = await fetch(`${API_URL}/users/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // The refresh endpoint is token-authenticated, so a gated session
            // must present its code here too or the rotation 401s.
            ...(totpCode ? { 'X-TOTP': totpCode } : {}),
          },
          credentials: 'include',
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function performFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { totpCode: oneOffCode, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
    ...totpHeaderFor(endpoint, oneOffCode),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    if (body && typeof body === 'object') {
      const payload = body as {
        detail?: unknown;
        code?: unknown;
        message?: unknown;
        error?: unknown;
      };
      // Machine-readable error id when the backend sends one: the 2FA gate
      // answers 401 { detail, code: 'totp_required' }.
      const code = typeof payload.code === 'string' ? payload.code : undefined;

      if (typeof payload.detail === 'string') {
        throw new APIError(payload.detail, { status: response.status, code });
      }

      const fields = Object.fromEntries(
        Object.entries(body).filter(
          (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].every((item) => typeof item === 'string'),
        ),
      );
      if (Object.keys(fields).length > 0) {
        throw new APIError(formatFieldMessage(fields), { status: response.status, code, fields });
      }
    }

    // Message conventions used by this backend: `message` (logout) and `error`
    // (token refresh, both 2FA endpoints). Read both so the Spanish message
    // the backend wrote always reaches the UI.
    const payload = (body && typeof body === 'object' ? body : {}) as {
      message?: unknown;
      error?: unknown;
      code?: unknown;
    };
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : typeof payload.error === 'string'
          ? payload.error
          : 'Error en la petición';
    throw new APIError(message, {
      status: response.status,
      code: typeof payload.code === 'string' ? payload.code : undefined,
    });
  }

  return response.json();
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  try {
    return await performFetch<T>(endpoint, options);
  } catch (error) {
    // Intercept the 2FA gate BEFORE the refresh policy. A `totp_required` 401
    // means the session is valid but the second factor is missing, so
    // refreshing would 401 identically and tear the session down.
    if (isTOTPCodeRequired(error)) {
      // The login page handles its own challenge (no session exists yet, so it
      // calls the endpoints directly rather than through this path). If a login
      // probe ever did route here with no handler mounted, rethrow unchanged and
      // let the caller decide — swallowing it would break a working flow.
      if (!totpRequiredHandler) throw error;
      // Park this caller behind a resolve-only deferred. The client keeps the
      // executor and hands the handler only the resolver, so a handler that
      // returns `undefined` — the `(retry) => void` signature this path used to
      // expose — can never become this caller's value.
      let resolveChallenge!: (value: unknown) => void;
      const settled = new Promise<unknown>((resolve) => {
        resolveChallenge = resolve;
      });
      // Hand over the one-shot replay together with that resolver. The handler
      // decides when to call the replay (after the user enters a code), and the
      // client keeps no reference, so a dismissed dialog cannot replay a stale
      // request later.
      totpRequiredHandler({
        settled,
        replay: () => performFetch<T>(endpoint, options),
        resolve: resolveChallenge,
      });
      // Park until the dialog resolves `settled` with the replay's result.
      // Parking is what lets several concurrent gated requests share the single
      // mounted dialog instead of each racing to open their own challenge. The
      // cast is sound rather than convenient: the value that arrives is whatever
      // this same `performFetch<T>` produced, and nothing else can reach it.
      return settled as Promise<T>;
    }

    const status = error instanceof APIError ? error.status : undefined;
    const canRetry =
      status === 401 && !NON_RETRYABLE_ENDPOINTS.some((path) => endpoint.endsWith(path));

    if (!canRetry) throw error;

    const refreshed = await refreshToken();
    if (!refreshed) {
      // Refresh failed: the session is unrecoverable. Notify listeners
      // (auth-context) so they clear the user; the cookie is out of the
      // browser's reach and expires naturally.
      setActiveToken();
      throw error;
    }

    // Exactly one retry of the original request, now authenticated by the
    // rotated cookie the refresh response installed. A second 401/403 is
    // surfaced to the caller unchanged.
    return performFetch<T>(endpoint, options);
  }
}

// Products
export async function getProducts(params?: {
  category?: number;
  is_featured?: boolean;
  search?: string;
  ordering?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', String(params.category));
  if (params?.is_featured !== undefined) searchParams.set('is_featured', String(params.is_featured));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.ordering) searchParams.set('ordering', params.ordering);

  const query = searchParams.toString();
  return fetchAPI<Product[]>(`/products/${query ? `?${query}` : ''}`);
}

export async function getProduct(id: number) {
  return fetchAPI<Product>(`/products/${id}/`);
}

export async function getFeaturedProducts() {
  return fetchAPI<Product[]>('/products/featured/');
}

export async function getOnSaleProducts() {
  return fetchAPI<Product[]>('/products/on_sale/');
}

// Categories
export async function getCategories() {
  return fetchAPI<Category[]>('/categories/');
}

// Auth
export async function login(username: string, password: string) {
  return fetchAPI<{ user: User; token: string }>('/users/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}) {
  return fetchAPI<{ user: User; token: string }>('/users/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logout() {
  // The backend 2FA gate now exempts `/users/logout/` (see
  // `TOTP_EXEMPT_PATHS` in `users/authentication.py`), so this request no longer
  // needs the code at all and a gated user can always sign out.
  //
  // The code is still cleared only AFTER the request is sent, and that ordering
  // is kept deliberately. `/users/logout/` is in `NON_RETRYABLE_ENDPOINTS`, so a
  // transient failure here does not retry; clearing first would drop the code
  // from a session the server may still hold, and the user would land on a page
  // that thinks it signed them out while the token stays valid until it expires.
  // The exemption removed the reason the code was required here — it did not
  // change which order is safer.
  try {
    return await fetchAPI<{ message: string }>('/users/logout/', {
      method: 'POST',
    });
  } finally {
    // The code belongs to the session that is ending: drop it so it is never
    // attached to the next session's requests.
    clearTOTPCode();
  }
}

/**
 * GET /users/profile/. `totp` sends a one-off code with this request only; the
 * login page uses it to probe the session right after login, before the code
 * has been accepted as the session-wide TOTP code.
 */
export async function getProfile(params?: { totp?: string }) {
  return fetchAPI<User>('/users/profile/', params?.totp ? { totpCode: params.totp } : {});
}

export async function updateProfile(data: Partial<User>) {
  return fetchAPI<User>('/users/profile/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Cart
export async function getCart() {
  return fetchAPI<Cart>('/cart/');
}

export async function addToCart(productId: number, quantity = 1) {
  return fetchAPI<Cart>('/cart/add_item/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function removeFromCart(productId: number) {
  return fetchAPI<Cart>('/cart/remove_item/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function updateCartItem(productId: number, quantity: number) {
  return fetchAPI<Cart>('/cart/update_item/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function clearCart() {
  return fetchAPI<Cart>('/cart/clear/', {
    method: 'POST',
  });
}

// Orders
export async function getOrders() {
  return fetchAPI<Order[]>('/orders/');
}

export async function getOrder(id: number) {
  return fetchAPI<Order>(`/orders/${id}/`);
}

export async function createOrderFromCart(data: {
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_phone: string;
  payment_method: string;
  notes?: string;
}) {
  return fetchAPI<Order>('/orders/create_from_cart/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Staff orders (roles: admin, bodega, despacho — enforced server-side via DRF)
export async function getStaffOrders() {
  return fetchAPI<Order[]>('/staff/orders/');
}

export async function advanceOrder(id: number, toStatus?: OrderStatus) {
  return fetchAPI<Order>(`/staff/orders/${id}/advance/`, {
    method: 'POST',
    ...(toStatus ? { body: JSON.stringify({ to_status: toStatus }) } : {}),
  });
}

export async function cancelOrder(id: number) {
  return fetchAPI<Order>(`/staff/orders/${id}/cancel/`, {
    method: 'POST',
  });
}

export async function flagDiscrepancy(id: number, reason: DiscrepancyReason) {
  return fetchAPI<Order>(`/staff/orders/${id}/discrepancy/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function resolveDiscrepancy(id: number) {
  return fetchAPI<Order>(`/staff/orders/${id}/resolve-discrepancy/`, {
    method: 'POST',
  });
}

// Staff users (admin only)
export async function createStaffUser(data: {
  username: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'customer'>;
}) {
  return fetchAPI<User>('/staff/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Staff users list (admin only). El GET llega en el slice 2 del cambio
// admin-ux-reorganization; hasta entonces el resumen lo tolera con su estado
// de error.
export async function listStaffUsers() {
  return fetchAPI<StaffUser[]>('/staff/users/');
}

// Two-factor authentication (H10, admin only — the backend enforces the role).
// Both endpoints run through the standard fetchAPI path, so a rejected call
// rejects with an APIError carrying the backend's own Spanish message:
// 400 'Ya existe un dispositivo 2FA confirmado.' / 'El dispositivo ya está
// confirmado.' / 'Código TOTP inválido.', 403 for a non-admin.

/** Device material issued by a successful enrollment. */
export interface TwoFAEnrollment {
  device_id: number;
  /** Base32 secret, safe to show so it can be typed by hand. */
  secret: string;
  /** `otpauth://totp/...` URI — the payload a QR code would encode. */
  provisioning_uri: string;
}

/** POST /users/2fa/enroll/ — starts enrollment and returns the device material. */
export async function enroll2FA() {
  return fetchAPI<TwoFAEnrollment>('/users/2fa/enroll/', {
    method: 'POST',
  });
}

/** POST /users/2fa/confirm/ — activates a pending device with a valid code. */
export async function confirm2FA(deviceId: number, code: string) {
  return fetchAPI<{ confirmed: boolean }>('/users/2fa/confirm/', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, code }),
  });
}

// Types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  original_price: string | null;
  image: string;
  category: number;
  category_name: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  discount_percentage: number;
  is_on_sale: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  image: string;
  is_active: boolean;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'customer' | 'admin' | 'bodega' | 'despacho';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'discrepancy';

export type DiscrepancyReason = 'missing' | 'damaged';

// Append-only order event trail (backend OrderEvent): the single source of
// truth for an order's timeline (design D4). Timestamps come from the server
// clock; the frontend never invents them.
export type OrderEventType =
  | 'created'
  | 'advanced'
  | 'discrepancy'
  | 'resolved'
  | 'cancelled';

export interface OrderEvent {
  event_type: OrderEventType;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  timestamp: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  is_staff?: boolean;
  profile: UserProfile;
}

export interface UserProfile {
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

// Proyección del listado de staff (GET /staff/users/): sin datos extra de PII
// más allá del contrato del endpoint.
export interface StaffUser {
  id: number;
  username: string;
  email: string;
  role: Exclude<UserRole, 'customer'>;
  is_staff: boolean;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total: string;
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  product: Product;
  product_id: number;
  quantity: number;
  subtotal: string;
  created_at: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  status_display: string;
  discrepancy_reason?: string;
  customer?: string;
  total: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_phone: string;
  payment_method: string;
  notes: string;
  items: OrderItem[];
  events: OrderEvent[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
}
