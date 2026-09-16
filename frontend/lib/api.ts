const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
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
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.detail || error.message || 'Error en la petición');
  }

  return response.json();
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

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}

export interface UserProfile {
  phone: string;
  address: string;
  city: string;
  postal_code: string;
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
  status: string;
  status_display: string;
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
