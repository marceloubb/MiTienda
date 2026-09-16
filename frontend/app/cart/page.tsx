'use client';

import { useAuth } from '@/lib/auth-context';
import { removeFromCart, updateCartItem } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CartPage() {
  const { user, token, cart, updateCart } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user || !cart || !cart.items) {
    return null;
  }

  async function handleUpdateQuantity(productId: number, newQuantity: number) {
    if (!token) return;

    try {
      const updatedCart = await updateCartItem(token, productId, newQuantity);
      updateCart(updatedCart);
    } catch (error) {
      alert('Error al actualizar la cantidad');
    }
  }

  async function handleRemoveItem(productId: number) {
    if (!token) return;

    if (confirm('¿Estás seguro de eliminar este producto del carrito?')) {
      try {
        const updatedCart = await removeFromCart(token, productId);
        updateCart(updatedCart);
      } catch (error) {
        alert('Error al eliminar el producto');
      }
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-12">
          <ShoppingBag size={64} className="mx-auto text-[#e0e0e0] mb-4" />
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Tu carrito está vacío</h1>
          <p className="text-[#666666] mb-6">¡Agrega algunos productos para empezar!</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#e65c00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#cc5200] transition-colors"
          >
            <ArrowLeft size={20} />
            Ver Productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Mi Carrito</h1>
        <span className="text-[#666666]">{cart.total_items} productos</span>
      </div>

      <div className="md:flex gap-6">
        {/* Lista de productos */}
        <div className="md:w-2/3">
          <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
            {cart.items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 ${
                  index !== cart.items.length - 1 ? 'border-b border-[#e0e0e0]' : ''
                }`}
              >
                {/* Imagen */}
                <div className="w-20 h-20 bg-[#f5f5f5] rounded-lg flex-shrink-0 overflow-hidden">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-[#999999]" />
                    </div>
                  )}
                </div>

                {/* Info del producto */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#999999] uppercase tracking-wide">
                    {item.product.category_name}
                  </p>
                  <h3 className="font-medium text-[#1a1a1a] text-sm truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-[#e65c00] font-bold text-sm mt-1">
                    ${parseFloat(item.product.price).toFixed(2)}
                  </p>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Subtotal y eliminar */}
                <div className="text-right">
                  <p className="font-bold text-[#1a1a1a]">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                  <button
                    onClick={() => handleRemoveItem(item.product.id)}
                    className="text-[#c0392b] hover:text-[#a93226] mt-2 flex items-center gap-1 text-xs"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Continuar comprando */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#e65c00] hover:text-[#cc5200] mt-4 font-medium"
          >
            <ArrowLeft size={18} />
            Seguir comprando
          </Link>
        </div>

        {/* Resumen */}
        <div className="md:w-1/3 mt-6 md:mt-0">
          <div className="bg-white rounded-xl border border-[#e0e0e0] p-6 sticky top-24">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Resumen</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Subtotal ({cart.total_items} productos)</span>
                <span className="font-medium">${parseFloat(cart.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Envío</span>
                <span className="font-medium text-[#2e7d32]">Gratis</span>
              </div>
            </div>

            <div className="border-t border-[#e0e0e0] pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-[#e65c00]">
                  ${parseFloat(cart.total).toFixed(2)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full bg-[#e65c00] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#cc5200] transition-colors"
            >
              <ShoppingBag size={20} />
              Finalizar Compra
            </Link>

            {/* Métodos de pago */}
            <div className="mt-6 pt-4 border-t border-[#e0e0e0]">
              <p className="text-xs text-[#999999] text-center mb-3">Métodos de pago aceptados</p>
              <div className="flex justify-center gap-4 text-2xl">
                <span title="Visa">💳</span>
                <span title="Mastercard">💳</span>
                <span title="PayPal">🅿️</span>
                <span title="Efectivo">💵</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
