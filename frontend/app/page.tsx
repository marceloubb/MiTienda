"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Hammer,
  PackageOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getProducts, getCategories, Product, Category } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIconElement } from "@/lib/category-icons";
import { sileo } from "sileo";

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
        console.error("Error al cargar productos y categorías:", err);
        setError(
          "Error al cargar los productos. Asegúrate de que el backend esté ejecutándose."
        );
        sileo.error({
          title: "Error al cargar los productos",
          description: "Asegúrate de que el backend esté ejecutándose.",
        });
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-56 w-full rounded-2xl md:h-64" aria-hidden="true" />
        <Skeleton className="mt-8 h-6 w-40" aria-hidden="true" />
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" aria-hidden="true" />
          ))}
        </div>
        <Skeleton className="mt-10 h-6 w-32" aria-hidden="true" />
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No pudimos cargar los productos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mx-auto mt-6"
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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-secondary px-6 py-10 text-on-primary md:px-12 md:py-14">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-on-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-secondary-container/15 blur-3xl"
          aria-hidden="true"
        />
        <Hammer
          className="pointer-events-none absolute -right-6 bottom-0 hidden size-48 text-on-primary/5 md:block"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-4 gap-1.5 bg-secondary-container text-on-secondary-container">
            <Sparkles className="size-3.5" />
            Oferta de la semana
          </Badge>
          <h1 className="text-3xl leading-tight font-bold md:text-4xl">
            Todo para tu proyecto, en un{" "}
            <span className="text-secondary-container">solo lugar</span>
          </h1>
          <p className="mt-3 text-on-primary-container">
            Herramientas profesionales y materiales de primera calidad. Envío
            rápido a todo el país.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#products"
              className={buttonVariants({
                size: "lg",
                className: "bg-on-primary text-primary hover:bg-on-primary/90",
              })}
            >
              Ver ofertas
            </a>
            <Link
              href="/products"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "border-on-primary/30 bg-on-primary/10 text-on-primary hover:bg-on-primary/20 hover:text-on-primary",
              })}
            >
              Catálogo completo <ChevronRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Categorías</h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver todas <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={isSelected}
                className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-4 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-control-border bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                {getCategoryIconElement(category.name, "size-6")}
                <span className="text-xs font-medium text-center leading-tight">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">Destacados</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Ofertas */}
      {saleProducts.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Ofertas Especiales
            </h2>
            <Badge variant="destructive">
              Hasta -{Math.max(...saleProducts.map((p) => p.discount_percentage))}% OFF
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {saleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Todos los productos */}
      <section id="products" className="mt-12 scroll-mt-28">
        <Separator className="mb-8" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : "Todos los productos"}
          </h2>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              Ver todos
            </Button>
          )}
        </div>
        {filteredProducts.length === 0 ? (
          <Card className="w-full p-10 text-center">
            <PackageOpen className="mx-auto size-10 text-muted-foreground/60" />
            <p className="mt-4 text-sm text-muted-foreground">
              No hay productos disponibles en esta categoría.
            </p>
            {selectedCategory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="mx-auto mt-4"
              >
                Ver todos
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
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