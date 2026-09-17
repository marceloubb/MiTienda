"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Hammer,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getCategories, Category } from "@/lib/api";
import type { UserRole } from "@/lib/api";
import { getCategoryIconElement } from "@/lib/category-icons";

// Role → staff navigation links (design Navbar role map): admin sees all
// three; bodega/despacho only their own surface; customer none.
const STAFF_LINKS: Record<UserRole, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Administración" },
    { href: "/bodega", label: "Bodega" },
    { href: "/despacho", label: "Despacho" },
  ],
  bodega: [{ href: "/bodega", label: "Bodega" }],
  despacho: [{ href: "/despacho", label: "Despacho" }],
  customer: [],
};

function staffLinksFor(role: UserRole | undefined): { href: string; label: string }[] {
  return role ? (STAFF_LINKS[role] ?? []) : [];
}

export default function Navbar() {
  const { user, cart, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const lastPathnameRef = useRef(pathname);
  const staffLinks = staffLinksFor(user?.role);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        // El navbar no bloquea la navegación si el catálogo no responde.
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cierra el menú móvil al tocar fuera del header o pulsar Escape.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        headerRef.current &&
        event.target instanceof Node &&
        !headerRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Cierra el menú móvil al navegar a otra ruta.
  useEffect(() => {
    if (pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = pathname;
      setMobileMenuOpen(false);
    }
  }, [pathname]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    router.push(
      query ? `/products?search=${encodeURIComponent(query)}` : "/products"
    );
    setMobileMenuOpen(false);
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-[#1a1a1a] text-white shadow-lg"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Hammer className="size-4 text-white" />
            </span>
            <span>
              Mi<span className="text-primary">Tienda</span>
            </span>
          </Link>

          {/* Búsqueda */}
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="mx-8 hidden max-w-xl flex-1 md:flex"
          >
            <div className="relative w-full">
              <label htmlFor="navbar-search" className="sr-only">
                Buscar productos
              </label>
              <input
                id="navbar-search"
                type="search"
                placeholder="Buscar productos, herramientas, materiales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface-0 py-2.5 pr-12 pl-4 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-primary/50"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-white transition-colors outline-none hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-white/50"
              >
                <Search className="size-4" />
              </button>
            </div>
          </form>

          {/* Navegación */}
          <nav className="hidden items-center gap-6 text-sm lg:flex">
            <Link href="/" className="transition-colors hover:text-primary">
              Inicio
            </Link>
            <Link
              href="/products"
              className="transition-colors hover:text-primary"
            >
              Catálogo
            </Link>
            {staffLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  href="/cart"
                  className="relative flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 transition-colors hover:bg-white/20 sm:px-4"
                >
                  <ShoppingCart className="size-5" />
                  <span className="hidden text-sm sm:inline">Carrito</span>
                  {cart && cart.total_items > 0 && (
                    <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {cart.total_items}
                    </span>
                  )}
                </Link>

                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-lg p-2.5 transition-colors hover:text-primary sm:p-0"
                >
                  <ClipboardList className="size-5" />
                  <span className="hidden text-sm sm:inline">Mis pedidos</span>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg p-2.5 transition-colors hover:text-primary sm:p-0"
                >
                  <User className="size-5" />
                  <span className="hidden text-sm sm:inline">
                    {user.username}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="flex size-10 items-center justify-center rounded-lg transition-colors outline-none hover:bg-white/10 hover:text-primary focus-visible:ring-3 focus-visible:ring-white/50"
                >
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80"
              >
                Ingresar
              </Link>
            )}

            <button
              type="button"
              ref={menuToggleRef}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              className="flex size-10 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-white/50 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 py-4 lg:hidden">
            <form onSubmit={handleSearchSubmit} role="search" className="mb-4">
              <label htmlFor="navbar-search-mobile" className="sr-only">
                Buscar productos
              </label>
              <input
                id="navbar-search-mobile"
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface-0 px-4 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-primary/50"
              />
            </form>
            <nav className="flex flex-col gap-3 text-sm">
              <Link
                href="/"
                className="transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/products"
                className="transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Catálogo
              </Link>
              {user && (
                <Link
                  href="/orders"
                  className="transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mis pedidos
                </Link>
              )}
              {staffLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Barra de categorías */}
      {categories.length > 0 && (
        <div className="border-t border-white/10 bg-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="scrollbar-none flex items-center gap-6 overflow-x-auto py-2 text-sm">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.id}`}
                  className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary"
                >
                  {getCategoryIconElement(category.name, "size-4")}
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}