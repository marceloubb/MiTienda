"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { getProduct, getProducts, addToCart, Product } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProductCard from "@/components/ProductCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIconElement } from "@/lib/category-icons";
import { sileo } from "sileo";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, updateCart } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const data = await getProduct(Number(params.id));
        if (!cancelled) {
          setProduct(data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("No pudimos cargar este producto.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Productos relacionados: mismo endpoint de productos filtrado por categoría.
  useEffect(() => {
    if (!product) return;
    const current = product;
    let cancelled = false;

    async function loadRelated() {
      try {
        const data = await getProducts({ category: current.category });
        if (!cancelled) {
          setRelated(data.filter((p) => p.id !== current.id).slice(0, 4));
        }
      } catch {
        if (!cancelled) setRelated([]);
      }
    }

    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [product]);

  async function handleAddToCart() {
    if (!product) return;

    if (!user) {
      sileo.info({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para agregar productos al carrito.",
      });
      router.push("/login");
      return;
    }

    setIsAdding(true);
    try {
      const cart = await addToCart(product.id, quantity);
      updateCart(cart);
      sileo.success({
        title: "Agregado al carrito",
        description: `${quantity} × ${product.name}`,
      });
    } catch {
      sileo.error({
        title: "Error al agregar al carrito",
        description: "Inténtalo de nuevo en unos segundos.",
      });
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-56" aria-hidden="true" />
        <div className="mt-6 overflow-hidden rounded-2xl bg-card ring-1 ring-border md:grid md:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-none md:aspect-auto md:h-full" aria-hidden="true" />
          <div className="space-y-4 p-8">
            <Skeleton className="h-3 w-24" aria-hidden="true" />
            <Skeleton className="h-8 w-3/4" aria-hidden="true" />
            <Skeleton className="h-6 w-32" aria-hidden="true" />
            <Skeleton className="h-20 w-full" aria-hidden="true" />
            <Skeleton className="h-9 w-full" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Producto no disponible
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Producto no encontrado."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RotateCcw />
              Reintentar
            </Button>
            <Link
              href="/products"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft />
              Ver catálogo
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const price = parseFloat(product.price);
  const originalPrice = product.original_price
    ? parseFloat(product.original_price)
    : null;
  const hasDiscount = product.is_on_sale && product.discount_percentage > 0;

  const stockStyles = {
    color:
      product.stock > 10
        ? "text-stock"
        : product.stock > 0
          ? "text-stock-low"
          : "text-offer",
    dot:
      product.stock > 10
        ? "bg-stock"
        : product.stock > 0
          ? "bg-stock-low"
          : "bg-offer",
    label:
      product.stock > 10
        ? `En stock (${product.stock} unidades)`
        : product.stock > 0
          ? `Últimas ${product.stock} unidades`
          : "Sin stock",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link href="/products" className="hover:text-primary">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="truncate text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <Card className="mt-6 gap-0 py-0 md:grid md:grid-cols-2">
        {/* Imagen */}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-1 md:aspect-auto md:h-full">
          {hasDiscount && (
            <Badge className="absolute top-4 left-4 z-10 gap-1 bg-offer text-white">
              <Tag className="size-3" />
              -{product.discount_percentage}% OFF
            </Badge>
          )}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {getCategoryIconElement(
                product.category_name,
                "size-16 text-muted-foreground/40"
              )}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {product.category_name}
          </p>

          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              ${price.toFixed(2)}
            </span>
            {originalPrice && (
              <span className="text-lg text-muted-foreground line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {/* Stock */}
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${stockStyles.dot}`} />
            <span className={`text-sm font-medium ${stockStyles.color}`}>
              {stockStyles.label}
            </span>
          </div>

          {/* Cantidad */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Cantidad</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                className="size-9 sm:size-7"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Restar una unidad"
              >
                <Minus />
              </Button>
              <span className="w-10 text-center text-base font-bold">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-9 sm:size-7"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
                aria-label="Sumar una unidad"
              >
                <Plus />
              </Button>
            </div>
          </div>

          {/* Subtotal */}
          <div className="rounded-lg bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">
                ${(price * quantity).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            className="w-full"
          >
            <ShoppingCart />
            {product.stock === 0
              ? "Sin stock"
              : isAdding
                ? "Agregando..."
                : "Agregar al carrito"}
          </Button>

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Seguir explorando el catálogo
          </Link>
        </div>
      </Card>

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-foreground">
            Productos relacionados
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}