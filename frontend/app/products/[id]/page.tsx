'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProduct, addToCart, Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ShoppingCart, ArrowLeft, Loader2, Tag, Minus, Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, updateCart } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      try {
        const id = Number(params.id);
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        setError('Error al cargar el producto');
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [params.id]);

  async function handleAddToCart() {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!product) return;

    try {
      const cart = await addToCart(token, product.id, quantity);
      updateCart(cart);
      alert('✓ Producto agregado al carrito');
    } catch (err) {
      alert('Error al agregar al carrito');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#e65c00]" size={48} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">⚠️</div>
        <p className="text-[#c0392b] text-lg">{error || 'Producto no encontrado'}</p>
        <Link
          href="/"
          className="flex items-center gap-2 text-[#e65c00] hover:text-[#cc5200]"
        >
          <ArrowLeft size={20} />
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#e65c00] hover:text-[#cc5200] mb-6"
      >
        <ArrowLeft size={20} />
        Volver a productos
      </Link>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#e0e0e0]">
        <div className="md:flex">
          {/* Imagen del producto */}
          <div className="md:w-1/2">
            <div className="relative h-96 bg-[#f5f5f5]">
              {product.is_on_sale && product.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-[#c0392b] text-white text-sm font-bold px-3 py-1 rounded flex items-center gap-1">
                  <Tag size={14} />
                  -{product.discount_percentage}% OFF
                </div>
              )}
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-9xl">
                  {getCategoryEmoji(product.category_name)}
                </div>
              )}
            </div>
          </div>

          {/* Detalles del producto */}
          <div className="md:w-1/2 p-8">
            <p className="text-xs text-[#e65c00] font-medium uppercase tracking-wide mb-2">
              {product.category_name}
            </p>

            <h1 className="text-3xl font-bold text-[#1a1a1a] mb-4">{product.name}</h1>

            {/* Precios */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-[#e65c00]">
                ${parseFloat(product.price).toFixed(2)}
              </span>
              {product.original_price && (
                <span className="text-xl text-[#999999] line-through">
                  ${parseFloat(product.original_price).toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-[#666666] mb-6 leading-relaxed">{product.description}</p>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${
                product.stock > 10 ? 'bg-[#2e7d32]' :
                product.stock > 0 ? 'bg-[#f39c12]' :
                'bg-[#c0392b]'
              }`}></div>
              <span className={`text-sm font-medium ${
                product.stock > 10 ? 'text-[#2e7d32]' :
                product.stock > 0 ? 'text-[#f39c12]' :
                'text-[#c0392b]'
              }`}>
                {product.stock > 10 ? `En stock (${product.stock} unidades)` :
                 product.stock > 0 ? `¡Últimas ${product.stock} unidades!` :
                 'Sin stock'}
              </span>
            </div>

            {/* Cantidad */}
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-medium text-[#1a1a1a]">Cantidad:</label>
              <div className="flex items-center border border-[#e0e0e0] rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-[#f5f5f5] transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="px-6 py-2 font-bold text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 hover:bg-[#f5f5f5] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Total parcial */}
            <div className="bg-[#f5f5f5] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Total:</span>
                <span className="text-2xl font-bold text-[#1a1a1a]">
                  ${(parseFloat(product.price) * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Botón agregar */}
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-[#e65c00] text-white py-4 px-6 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#cc5200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={24} />
              {product.stock === 0 ? 'Sin stock' : 'Agregar al Carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Electrónica: '⚡',
    Ropa: '👕',
    Hogar: '🏠',
    Deportes: '⚽',
    Libros: '📚',
    Juguetes: '🧸',
    Herramientas: '🔨',
    Electricidad: '⚡',
    Fijaciones: '🪛',
    Plomería: '🚿',
    Pinturas: '🎨',
    Construcción: '🏗️',
  };
  return emojis[category] || '📦';
}
