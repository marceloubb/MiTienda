'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ShoppingCart, User, LogOut, Menu, X, Search } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, cart, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-[#1a1a1a] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">🔧</span>
            <span>
              Mi<span className="text-[#e65c00]">Tienda</span>
            </span>
          </Link>

          {/* Barra de búsqueda - Prominente */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Buscar productos, herramientas, materiales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e65c00]"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#e65c00] text-white p-2 rounded-md hover:bg-[#cc5200] transition-colors">
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Navegación */}
          <nav className="hidden lg:flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-[#e65c00] transition-colors">
              Inicio
            </Link>
            <Link href="/products" className="hover:text-[#e65c00] transition-colors">
              Productos
            </Link>
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/cart"
                  className="relative flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 rounded-lg hover:bg-[#3a3a3a] transition-colors"
                >
                  <ShoppingCart size={20} />
                  <span className="hidden sm:inline text-sm">Carrito</span>
                  {cart && cart.total_items > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#e65c00] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {cart.total_items}
                    </span>
                  )}
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:text-[#e65c00] transition-colors"
                >
                  <User size={20} />
                  <span className="hidden sm:inline text-sm">{user.username}</span>
                </Link>

                <button
                  onClick={logout}
                  className="hover:text-[#e65c00] transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-[#e65c00] text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-[#cc5200] transition-colors"
              >
                Ingresar
              </Link>
            )}

            <button
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#3a3a3a]">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-4 pr-4 py-2.5 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e65c00]"
              />
            </div>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="hover:text-[#e65c00]" onClick={() => setMobileMenuOpen(false)}>
                Inicio
              </Link>
              <Link href="/products" className="hover:text-[#e65c00]" onClick={() => setMobileMenuOpen(false)}>
                Productos
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Barra de categorías */}
      <div className="bg-[#2a2a2a] border-t border-[#3a3a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-2 text-sm overflow-x-auto">
            <Link href="/products?category=1" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              🔨 Herramientas
            </Link>
            <Link href="/products?category=2" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              ⚡ Electricidad
            </Link>
            <Link href="/products?category=3" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              🪛 Fijaciones
            </Link>
            <Link href="/products?category=4" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              🚿 Plomería
            </Link>
            <Link href="/products?category=5" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              🎨 Pinturas
            </Link>
            <Link href="/products?category=6" className="whitespace-nowrap hover:text-[#e65c00] transition-colors">
              🏗️ Construcción
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
