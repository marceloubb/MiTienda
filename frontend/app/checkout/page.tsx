'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createOrderFromCart } from '@/lib/api';
import { Loader2, CreditCard, Truck, CheckCircle, Package } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { user, token, cart, updateCart } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    shipping_name: '',
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_phone: '',
    payment_method: 'credit_card',
    notes: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !cart) return;

    setIsProcessing(true);

    try {
      const order = await createOrderFromCart(token, formData);
      setOrderId(order.id);
      setOrderComplete(true);
      updateCart({ ...cart, items: [], total: '0', total_items: 0 });
    } catch (err) {
      alert('Error al procesar el pedido');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!user || !cart || !cart.items) {
    return null;
  }

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-12">
          <div className="w-20 h-20 bg-[#2e7d32] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a1a1a] mb-4">¡Pedido Realizado!</h1>
          <p className="text-[#666666] mb-2">
            Tu pedido <span className="font-bold text-[#1a1a1a]">#{orderId}</span> ha sido procesado correctamente.
          </p>
          <p className="text-[#666666] mb-8">
            Recibirás un correo electrónico con los detalles de tu compra.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#e65c00] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#cc5200] transition-colors"
          >
            <Package size={20} />
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-12">
          <Package size={64} className="mx-auto text-[#e0e0e0] mb-4" />
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Tu carrito está vacío</h1>
          <p className="text-[#666666] mb-6">Agrega productos antes de continuar.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#e65c00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#cc5200] transition-colors"
          >
            Ver Productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1a1a1a] mb-6">Finalizar Compra</h1>

      <div className="md:flex gap-8">
        <div className="md:w-2/3">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de envío */}
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
              <h2 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Truck size={20} className="text-[#e65c00]" />
                Información de Envío
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="shipping_name"
                    value={formData.shipping_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none"
                    placeholder="Calle, número, colonia..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="shipping_city"
                      value={formData.shipping_city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="shipping_postal_code"
                      value={formData.shipping_postal_code}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="shipping_phone"
                    value={formData.shipping_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none"
                    placeholder="10 dígitos"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
              <h2 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-[#e65c00]" />
                Método de Pago
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                    Selecciona método de pago
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none bg-white"
                  >
                    <option value="credit_card">💳 Tarjeta de Crédito</option>
                    <option value="debit_card">💳 Tarjeta de Débito</option>
                    <option value="paypal">🅿️ PayPal</option>
                    <option value="cash">💵 Efectivo contra entrega</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#e65c00] focus:border-transparent outline-none resize-none"
                    placeholder="Instrucciones especiales de entrega..."
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#e65c00] text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#cc5200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Procesando pedido...
                </>
              ) : (
                <>
                  <CheckCircle size={24} />
                  Confirmar Pedido
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resumen del pedido */}
        <div className="md:w-1/3 mt-6 md:mt-0">
          <div className="bg-white rounded-xl border border-[#e0e0e0] p-6 sticky top-24">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Resumen del Pedido</h2>

            {/* Lista de productos */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#f5f5f5] rounded-lg flex-shrink-0 overflow-hidden">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-[#999999]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{item.product.name}</p>
                    <p className="text-xs text-[#666666]">x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold">${parseFloat(item.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[#e0e0e0] pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Subtotal ({cart.total_items} productos)</span>
                <span className="font-medium">${parseFloat(cart.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Envío</span>
                <span className="font-medium text-[#2e7d32]">Gratis</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-[#e0e0e0]">
                <span>Total</span>
                <span className="text-[#e65c00]">${parseFloat(cart.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Información de seguridad */}
            <div className="mt-6 pt-4 border-t border-[#e0e0e0]">
              <div className="flex items-center gap-2 text-xs text-[#666666]">
                <span>🔒</span>
                <span>Compra segura y protegida</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
