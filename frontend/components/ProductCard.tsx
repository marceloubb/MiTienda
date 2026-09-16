'use client';

import { Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { addToCart } from '@/lib/api';
import { ShoppingCart, Tag } from 'lucide-react';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { token, updateCart } = useAuth();

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const cart = await addToCart(token, product.id);
      updateCart(cart);
      alert('✓ Producto agregado al carrito');
    } catch (error) {
      alert('Error al agregar al carrito');
    }
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-xl overflow-hidden border border-[#e0e0e0] hover:border-[#e65c00] hover:shadow-lg transition-all duration-200 group">
        {/* Imagen */}
        <div className="relative h-40 bg-[#f5f5f5] overflow-hidden">
          {product.is_on_sale && product.discount_percentage > 0 && (
            <div className="absolute top-2 left-2 z-10 bg-[#c0392b] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
              <Tag size={10} />
              -{product.discount_percentage}%
            </div>
          )}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {getCategoryEmoji(product.category_name)}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-3">
          <p className="text-[10px] text-[#999999] uppercase tracking-wide mb-1">
            {product.category_name}
          </p>
          <h3 className="text-xs font-medium text-[#1a1a1a] mb-2 line-clamp-2 min-h-[32px]">
            {product.name}
          </h3>

          {/* Precios */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-bold text-[#e65c00]">
              ${parseFloat(product.price).toFixed(2)}
            </span>
            {product.original_price && (
              <span className="text-[10px] text-[#999999] line-through">
                ${parseFloat(product.original_price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock indicator */}
          <div className="flex items-center gap-1 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              product.stock > 10 ? 'bg-[#2e7d32]' :
              product.stock > 0 ? 'bg-[#f39c12]' :
              'bg-[#c0392b]'
            }`}></div>
            <span className={`text-[10px] ${
              product.stock > 10 ? 'text-[#2e7d32]' :
              product.stock > 0 ? 'text-[#f39c12]' :
              'text-[#c0392b]'
            }`}>
              {product.stock > 10 ? 'En stock' :
               product.stock > 0 ? `Últimas ${product.stock} unidades` :
               'Sin stock'}
            </span>
          </div>

          {/* Botón agregar */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="w-full bg-[#e65c00] text-white py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-[#cc5200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={12} />
            {product.stock === 0 ? 'Sin stock' : '+ Agregar'}
          </button>
        </div>
      </div>
    </Link>
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
