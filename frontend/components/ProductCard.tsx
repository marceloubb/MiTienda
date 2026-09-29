"use client";

import { Product } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { addToCart } from "@/lib/api";
import { ShoppingCart, Tag } from "lucide-react";
import { sileo } from "sileo";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryIconElement } from "@/lib/category-icons";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user, updateCart } = useAuth();
  const router = useRouter();

  async function handleAddToCart() {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const cart = await addToCart(product.id);
      updateCart(cart);
      sileo.success({
        title: "Agregado al carrito",
        description: product.name,
      });
    } catch {
      sileo.error({
        title: "Error al agregar al carrito",
        description: "Inténtalo de nuevo en unos segundos.",
      });
    }
  }

  const price = `$${parseFloat(product.price).toFixed(2)}`;
  const originalPrice = product.original_price
    ? `$${parseFloat(product.original_price).toFixed(2)}`
    : null;

  const stockStyles = {
    color:
      product.stock > 10
        ? "text-stock"
        : product.stock > 0
          ? "text-stock-low"
          : "text-error",
    dot:
      product.stock > 10
        ? "bg-stock"
        : product.stock > 0
          ? "bg-stock-low"
          : "bg-error",
    label:
      product.stock > 10
        ? "En stock"
        : product.stock > 0
          ? `Últimas ${product.stock} unidades`
          : "Sin stock",
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest text-sm text-on-surface shadow-level-1 ring-1 ring-outline-variant transition-all duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/30">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-container-low"
      >
        {product.is_on_sale && product.discount_percentage > 0 && (
          <Badge className="absolute top-2 left-2 z-10 gap-1 bg-secondary-container text-on-secondary-container">
            <Tag className="size-3" />
            -{product.discount_percentage}%
          </Badge>
        )}
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {getCategoryIconElement(
              product.category_name,
              "size-12 text-muted-foreground/40"
            )}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {product.category_name}
        </p>
        <h3 className="line-clamp-2 min-h-[32px] text-xs leading-snug font-medium text-foreground">
          {product.name}
        </h3>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-bold text-primary">{price}</span>
          {originalPrice && (
            <span className="text-[10px] text-muted-foreground line-through">
              {originalPrice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${stockStyles.dot}`} />
          <span className={`text-[10px] ${stockStyles.color}`}>
            {stockStyles.label}
          </span>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="mt-auto w-full"
        >
          <ShoppingCart />
          {product.stock === 0 ? "Sin stock" : "Agregar"}
        </Button>
      </div>
    </div>
  );
}