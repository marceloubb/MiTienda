"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  removeFromCart,
  updateCartItem,
  clearCart,
} from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { sileo } from "sileo";

export default function CartPage() {
  const { user, token, cart, updateCart, isLoading } = useAuth();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-40" aria-hidden="true" />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" aria-hidden="true" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  async function handleUpdateQuantity(productId: number, newQuantity: number) {
    if (!token || newQuantity < 1) return;
    setPendingId(productId);
    try {
      const updatedCart = await updateCartItem(token, productId, newQuantity);
      updateCart(updatedCart);
    } catch {
      sileo.error({
        title: "Error al actualizar la cantidad",
        description: "Inténtalo de nuevo en unos segundos.",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemoveItem(productId: number, name: string) {
    if (!token) return;
    setPendingId(productId);
    try {
      const updatedCart = await removeFromCart(token, productId);
      updateCart(updatedCart);
      sileo.success({
        title: "Producto eliminado",
        description: `${name} salió de tu carrito.`,
      });
    } catch {
      sileo.error({
        title: "Error al eliminar el producto",
        description: "Inténtalo de nuevo en unos segundos.",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleClearCart() {
    if (!token) return;
    try {
      const updatedCart = await clearCart(token);
      updateCart(updatedCart);
      sileo.success({
        title: "Carrito vaciado",
        description: "Ya puedes empezar de nuevo.",
      });
    } catch {
      sileo.error({
        title: "Error al vaciar el carrito",
        description: "Inténtalo de nuevo en unos segundos.",
      });
    } finally {
      setConfirmingClear(false);
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full p-8 text-center sm:p-12">
          <ShoppingBag className="mx-auto size-12 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Agrega productos para empezar tu compra.
          </p>
          <Link
            href="/products"
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            <ArrowLeft />
            Ver catálogo
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Mi carrito</h1>
        <span className="text-sm text-muted-foreground">
          {cart.total_items} {cart.total_items === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Lista */}
        <div className="md:col-span-2">
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
            {cart.items.map((item, index) => {
              const isPending = pendingId === item.product.id;
              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center gap-4 p-4 ${
                    index !== cart.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-1 sm:size-20">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-6 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {item.product.category_name}
                    </p>
                    <Link
                      href={`/products/${item.product.id}`}
                      className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-1 text-sm font-bold text-primary">
                      ${parseFloat(item.product.price).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="size-9 sm:size-7"
                      onClick={() =>
                        handleUpdateQuantity(item.product.id, item.quantity - 1)
                      }
                      disabled={isPending || item.quantity <= 1}
                      aria-label={`Restar una unidad de ${item.product.name}`}
                    >
                      <Minus />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="size-9 sm:size-7"
                      onClick={() =>
                        handleUpdateQuantity(item.product.id, item.quantity + 1)
                      }
                      disabled={isPending || item.quantity >= item.product.stock}
                      aria-label={`Sumar una unidad de ${item.product.name}`}
                    >
                      <Plus />
                    </Button>
                  </div>

                  <div className="w-full text-right sm:w-24">
                    <p className="text-sm font-bold text-foreground">
                      ${parseFloat(item.subtotal).toFixed(2)}
                    </p>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        handleRemoveItem(item.product.id, item.product.name)
                      }
                      disabled={isPending}
                      className="mt-1 h-10 text-offer hover:bg-offer/10 hover:text-offer sm:h-6"
                    >
                      <Trash2 />
                      Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Seguir comprando
            </Link>

            {/* Confirmación en UI (reemplaza confirm()) */}
            {confirmingClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ¿Vaciar todo el carrito?
                </span>
                <Button variant="destructive" size="sm" onClick={handleClearCart}>
                  Sí, vaciar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingClear(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingClear(true)}
                className="text-muted-foreground hover:text-offer"
              >
                <Trash2 />
                Vaciar carrito
              </Button>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="md:col-span-1">
          <Card className="sticky top-24 gap-4 p-6">
            <h2 className="text-lg font-bold text-foreground">Resumen</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({cart.total_items})
                </span>
                <span className="font-medium text-foreground">
                  ${parseFloat(cart.total).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className="font-medium text-stock">Gratis</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                ${parseFloat(cart.total).toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              <ShoppingBag />
              Finalizar compra
            </Link>

            <Separator />

            <div>
              <p className="mb-3 text-center text-xs text-muted-foreground">
                Métodos de pago aceptados
              </p>
              <div className="flex justify-center gap-4 text-muted-foreground">
                <span title="Tarjeta de crédito" aria-label="Tarjeta de crédito">
                  <CreditCard className="size-5" />
                </span>
                <span title="Tarjeta de débito" aria-label="Tarjeta de débito">
                  <CreditCard className="size-5" />
                </span>
                <span title="PayPal" aria-label="PayPal">
                  <Wallet className="size-5" />
                </span>
                <span title="Efectivo" aria-label="Efectivo">
                  <Banknote className="size-5" />
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}