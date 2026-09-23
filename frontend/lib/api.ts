const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

// Error de API con detalle estructurado. `fields` contiene los errores por
// campo del backend (DRF 400), p. ej. { username: ["Ya existe."] }.
export class APIError extends Error {
  status?: number;
  fields?: Record<string, string[]>;

  constructor(message: string, details?: { status?: number; fields?: Record<string, string[]> }) {
    super(message);
    this.name = 'APIError';
    this.status = details?.status;
    this.fields = details?.fields;
  }
}

function formatFieldMessage(fields: Record<string, string[]>): string {
  const parts = Object.entries(fields).map(([field, messages]) => `${field}: ${messages.join(', ')}`);
  return parts.join(' · ') || 'Error en la petición';
}

// --- Token lifecycle (H3, F1, F3) -------------------------------------------
//
// The API client owns the single retry-on-401 policy: one refresh attempt,
// then one retry of the original request. When the refresh fails, the token is
// cleared through the change hook below, which logs the user out.

type TokenChangeHandler = (token: string | null) => void;

let tokenChangeHandler: TokenChangeHandler | null = null;

/**
 * Register a handler called whenever the API client's active token changes
 * (rotation on refresh, clearing on refresh failure). Returns an unregister
 * function for effect cleanup.
 */
export function onTokenChange(handler: TokenChangeHandler): () => void {
  tokenChangeHandler = handler;
  return () => {
    if (tokenChangeHandler === handler) tokenChangeHandler = null;
  };
}

/** Propagate token changes from the application into the API client. */
export function setActiveToken(token: string | null): void {
  tokenChangeHandler?.(token);
}

// Endpoints authenticated by credentials rather than a token must never be
// auto-refreshed: a 401 there means bad credentials, not an expired token.
const NON_RETRYABLE_ENDPOINTS = ['/users/login/', '/users/register/', '/users/token/refresh/'];

// A burst of parallel 401s (e.g. profile + cart) shares one in-flight refresh:
// the backend rotates the token on every refresh, so concurrent refreshes would
// invalidate each other. Every waiting request retries once with the new token.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshToken(token: string): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/users/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        });
        if (!response.ok) return null;
        const body = (await response.json()) as { token?: unknown };
        return typeof body.token === 'string' ? body.token : null;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function performFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    if (body && typeof body === 'object') {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === 'string') {
        throw new APIError(detail, { status: response.status });
      }

      const fields = Object.fromEntries(
        Object.entries(body).filter(
          (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].every((item) => typeof item === 'string'),
        ),
      );
      if (Object.keys(fields).length > 0) {
        throw new APIError(formatFieldMessage(fields), { status: response.status, fields });
      }
    }

    const message =
      body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string'
        ? (body as { message: string }).message
        : 'Error en la petición';
    throw new APIError(message, { status: response.status });
  }

  return response.json();
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  try {
    return await performFetch<T>(endpoint, options);
  } catch (error) {
    const status = error instanceof APIError ? error.status : undefined;
    const canRetry =
      status === 401 &&
      options.token != null &&
      !NON_RETRYABLE_ENDPOINTS.some((path) => endpoint.endsWith(path));

    if (!canRetry || options.token == null) throw error;

    const freshToken = await refreshToken(options.token);
    if (!freshToken) {
      // Refresh failed: the session is unrecoverable. Clear the token so
      // listeners (auth-context) log the user out.
      setActiveToken(null);
      throw error;
    }

    setActiveToken(freshToken);

    // Exactly one retry of the original request with the rotated token. A
    // second 401/403 is surfaced to the caller unchanged.
    return performFetch<T>(endpoint, { ...options, token: freshToken });
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

export async function getProfile(token: string) {
  return fetchAPI<User>('/users/profile/', { token });
}

export async function updateProfile(token: string, data: Partial<User>) {
  return fetchAPI<User>('/users/profile/', {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  });
}

// Cart
export async function getCart(token: string) {
  return fetchAPI<Cart>('/cart/', { token });
}

export async function addToCart(token: string, productId: number, quantity = 1) {
  return fetchAPI<Cart>('/cart/add_item/', {
    method: 'POST',
    token,
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function removeFromCart(token: string, productId: number) {
  return fetchAPI<Cart>('/cart/remove_item/', {
    method: 'POST',
    token,
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function updateCartItem(token: string, productId: number, quantity: number) {
  return fetchAPI<Cart>('/cart/update_item/', {
    method: 'POST',
    token,
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function clearCart(token: string) {
  return fetchAPI<Cart>('/cart/clear/', {
    method: 'POST',
    token,
  });
}

// Orders
export async function getOrders(token: string) {
  return fetchAPI<Order[]>('/orders/', { token });
}

export async function getOrder(token: string, id: number) {
  return fetchAPI<Order>(`/orders/${id}/`, { token });
}

export async function createOrderFromCart(
  token: string,
  data: {
    shipping_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_postal_code: string;
    shipping_phone: string;
    payment_method: string;
    notes?: string;
  }
) {
  return fetchAPI<Order>('/orders/create_from_cart/', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

// Staff orders (roles: admin, bodega, despacho — enforced server-side via DRF)
export async function getStaffOrders(token: string) {
  return fetchAPI<Order[]>('/staff/orders/', { token });
}

export async function advanceOrder(token: string, id: number, toStatus?: OrderStatus) {
  return fetchAPI<Order>(`/staff/orders/${id}/advance/`, {
    method: 'POST',
    token,
    ...(toStatus ? { body: JSON.stringify({ to_status: toStatus }) } : {}),
  });
}

export async function cancelOrder(token: string, id: number) {
  return fetchAPI<Order>(`/staff/orders/${id}/cancel/`, {
    method: 'POST',
    token,
  });
}

export async function flagDiscrepancy(token: string, id: number, reason: DiscrepancyReason) {
  return fetchAPI<Order>(`/staff/orders/${id}/discrepancy/`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function resolveDiscrepancy(token: string, id: number) {
  return fetchAPI<Order>(`/staff/orders/${id}/resolve-discrepancy/`, {
    method: 'POST',
    token,
  });
}

// Staff users (admin only)
export async function createStaffUser(
  token: string,
  data: {
    username: string;
    email: string;
    password: string;
    role: Exclude<UserRole, 'customer'>;
  }
) {
  return fetchAPI<User>('/staff/users/', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

// Staff users list (admin only). El GET llega en el slice 2 del cambio
// admin-ux-reorganization; hasta entonces el resumen lo tolera con su estado
// de error.
export async function listStaffUsers(token: string) {
  return fetchAPI<StaffUser[]>('/staff/users/', { token });
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
