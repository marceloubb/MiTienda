'use client';

import { useEffect, useState } from 'react';
import { getProducts, getCategories, Product, Category } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err) {
        setError('Error al cargar los productos. Asegúrate de que el backend esté ejecutándose.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const featuredProducts = products.filter((p) => p.is_featured);
  const saleProducts = products.filter((p) => p.is_on_sale);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#e65c00]" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-6xl">⚠️</div>
        <p className="text-[#c0392b] text-lg text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#e65c00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#cc5200] transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] rounded-2xl p-8 md:p-12 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-4 right-4 bg-[#ffd600] text-[#1a1a1a] text-xs font-bold px-3 py-1 rounded">
          Oferta de la semana
        </div>
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Todo para tu proyecto, en un{' '}
            <span className="text-[#e65c00]">solo lugar</span>
          </h1>
          <p className="text-gray-300 mb-6">
            Herramientas profesionales y materiales de primera calidad. Envío rápido a todo el país.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#products"
              className="bg-[#e65c00] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#cc5200] transition-colors"
            >
              Ver ofertas
            </a>
            <Link
              href="/products"
              className="bg-white/10 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              Catálogo completo
            </Link>
          </div>
        </div>
        <div className="hidden md:flex absolute right-12 top-1/2 -translate-y-1/2 text-8xl opacity-20">
          🔧
        </div>
      </div>

      {/* Categorías */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1a1a1a]">Categorías</h2>
          <Link href="/products" className="text-sm text-[#e65c00] flex items-center gap-1 hover:underline">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                selectedCategory === category.id
                  ? 'bg-[#e65c00] text-white border-[#e65c00]'
                  : 'bg-white text-[#1a1a1a] border-[#e0e0e0] hover:border-[#e65c00]'
              }`}
            >
              <span className="text-2xl mb-2">{getCategoryEmoji(category.name)}</span>
              <span className="text-xs font-medium text-center">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1a1a1a]">Destacados</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Ofertas */}
      {saleProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1a1a1a]">🔥 Ofertas Especiales</h2>
            <span className="bg-[#c0392b] text-white text-xs font-bold px-3 py-1 rounded">
              Hasta -{Math.max(...saleProducts.map((p) => p.discount_percentage))}% OFF
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Todos los productos */}
      <section id="products">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1a1a1a]">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : 'Todos los productos'}
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-[#e65c00] hover:underline"
            >
              Ver todos
            </button>
          )}
        </div>
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-[#e0e0e0]">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-[#666666]">No hay productos disponibles en esta categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
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
