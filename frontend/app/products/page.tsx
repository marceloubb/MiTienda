"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  PackageOpen,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getProducts, getCategories, Product, Category } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIconElement } from "@/lib/category-icons";
import { sileo } from "sileo";

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Más recientes" },
  { value: "price", label: "Precio: menor a mayor" },
  { value: "-price", label: "Precio: mayor a menor" },
  { value: "name", label: "Nombre: A-Z" },
  { value: "-name", label: "Nombre: Z-A" },
];

function parseCategory(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ProductsCatalog />
    </Suspense>
  );
}

function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? ""
  );
  const hasLoadedProducts = useRef(false);

  // Categorías se cargan una sola vez (no dependen de los filtros).
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) {
          sileo.error({
            title: "Error al cargar las categorías",
            description: "Asegúrate de que el backend esté ejecutándose.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Productos: la URL es la fuente de verdad (category/search/ordering).
  const selectedCategory = parseCategory(searchParams.get("category"));
  const search = searchParams.get("search")?.trim() ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getProducts({
          category: selectedCategory ?? undefined,
          search: search || undefined,
          ordering: ordering || undefined,
        });
        if (!cancelled) {
          setProducts(data);
          setError(null);
          hasLoadedProducts.current = true;
        }
      } catch {
        if (!cancelled) {
          if (hasLoadedProducts.current) {
            sileo.error({
              title: "Error al cargar los productos",
              description: "Asegúrate de que el backend esté ejecutándose.",
            });
          } else {
            setError(
              "Error al cargar los productos. Asegúrate de que el backend esté ejecutándose."
            );
          }
        }
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, search, ordering]);

  const selectedCategoryName = categories.find(
    (c) => c.id === selectedCategory
  )?.name;

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `/products?${next}` : "/products", { scroll: false });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim() === (searchParams.get("search") ?? "")) return;
    updateParam("search", searchInput.trim() || null);
  }

  if (isInitialLoading) {
    return <CatalogSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No pudimos cargar el catálogo
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-6"
          >
            <RotateCcw />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="text-foreground">
            Catálogo
          </li>
        </ol>
      </nav>

      {/* Encabezado */}
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCategoryName
              ? `${selectedCategoryName} · ${products.length} producto${
                  products.length === 1 ? "" : "s"
                }`
              : `${products.length} producto${products.length === 1 ? "" : "s"} disponible${
                  products.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Búsqueda */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="h-9 w-full rounded-xl border border-control-border bg-surface-container-lowest pr-8 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateParam("search", null);
                }}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </form>

          {/* Ordenamiento */}
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={ordering}
              onChange={(e) => updateParam("ordering", e.target.value || null)}
              aria-label="Ordenar productos"
              className="h-9 w-full appearance-none rounded-xl border border-control-border bg-surface-container-lowest pr-8 pl-9 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none sm:w-56"
            >
              {ORDERING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateParam("category", null)}
          aria-pressed={selectedCategory === null}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
            selectedCategory === null
              ? "border-primary bg-primary text-primary-foreground shadow-level-1"
              : "border-control-border bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-level-1"
          }`}
        >
          <PackageOpen className="size-4" />
          Todas
        </button>
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() =>
                updateParam("category", isSelected ? null : String(category.id))
              }
              aria-pressed={isSelected}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-level-1"
                  : "border-control-border bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-level-1"
              }`}
            >
              {getCategoryIconElement(category.name, "size-4")}
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {products.length === 0 ? (
        <Card className="mt-8 w-full rounded-2xl p-10 text-center">
          <PackageOpen className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-4 text-sm text-muted-foreground">
            No encontramos productos con los filtros seleccionados.
          </p>
          <Link
            href="/products"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "mt-4",
            })}
          >
            Limpiar filtros
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Píldora de filtros activos */}
      {(selectedCategory || ordering || searchParams.get("search")) && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <SlidersHorizontal className="size-3" />
            Filtros activos
          </Badge>
          {selectedCategoryName && (
            <Badge variant="outline" className="gap-1">
              {getCategoryIconElement(
                selectedCategoryName,
                "size-3 text-muted-foreground"
              )}
              {selectedCategoryName}
              <button
                onClick={() => updateParam("category", null)}
                aria-label={`Quitar filtro de ${selectedCategoryName}`}
                className="ml-0.5 rounded hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("search") && (
            <Badge variant="outline" className="gap-1">
              <Search className="size-3" />
              {searchParams.get("search")}
              <button
                onClick={() => {
                  setSearchInput("");
                  updateParam("search", null);
                }}
                aria-label="Quitar búsqueda"
                className="ml-0.5 rounded hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {ordering && (
            <Badge variant="outline" className="gap-1">
              <SlidersHorizontal className="size-3" />
              {ORDERING_OPTIONS.find((o) => o.value === ordering)?.label}
              <button
                onClick={() => updateParam("ordering", null)}
                aria-label="Quitar ordenamiento"
                className="ml-0.5 rounded hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant">
      <Skeleton className="aspect-[4/3] w-full rounded-none" aria-hidden="true" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" aria-hidden="true" />
        <Skeleton className="h-3 w-4/5" aria-hidden="true" />
        <Skeleton className="h-4 w-1/2" aria-hidden="true" />
        <Skeleton className="h-8 w-full" aria-hidden="true" />
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-6 w-40" aria-hidden="true" />
      <Skeleton className="mt-3 h-10 w-72" aria-hidden="true" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-xl" aria-hidden="true" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}