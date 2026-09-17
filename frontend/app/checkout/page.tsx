"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle,
  CreditCard,
  Loader2,
  Package,
  ShieldCheck,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createOrderFromCart, Cart, User } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sileo } from "sileo";

const PAYMENT_METHODS = [
  {
    value: "credit_card",
    label: "Tarjeta de crédito",
    description: "Visa, Mastercard, American Express",
    icon: CreditCard,
  },
  {
    value: "debit_card",
    label: "Tarjeta de débito",
    description: "Débito directo de tu banco",
    icon: CreditCard,
  },
  {
    value: "paypal",
    label: "PayPal",
    description: "Paga con tu cuenta PayPal",
    icon: Wallet,
  },
  {
    value: "cash",
    label: "Efectivo contra entrega",
    description: "Paga al recibir tu pedido",
    icon: Banknote,
  },
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export default function CheckoutPage() {
  const { user, cart, isLoading } = useAuth();
  const router = useRouter();
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (orderId !== null) {
    return <OrderConfirmation orderId={orderId} />;
  }

  if (isLoading || !user || !cart) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-52" aria-hidden="true" />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Skeleton className="h-80 w-full rounded-xl" aria-hidden="true" />
            <Skeleton className="h-64 w-full rounded-xl" aria-hidden="true" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full p-8 text-center sm:p-12">
          <Package className="mx-auto size-12 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Agrega productos antes de continuar con el pago.
          </p>
          <Link
            href="/products"
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            Ver catálogo
          </Link>
        </Card>
      </div>
    );
  }

  return <CheckoutForm user={user} cart={cart} onOrderComplete={setOrderId} />;
}

function CheckoutForm({
  user,
  cart,
  onOrderComplete,
}: {
  user: User;
  cart: Cart;
  onOrderComplete: (orderId: number) => void;
}) {
  const { token, updateCart } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState(() => ({
    shipping_name: `${user.first_name} ${user.last_name}`.trim(),
    shipping_address: user.profile?.address ?? "",
    shipping_city: user.profile?.city ?? "",
    shipping_postal_code: user.profile?.postal_code ?? "",
    shipping_phone: user.profile?.phone ?? "",
    payment_method: "credit_card",
    notes: "",
  }));

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setIsProcessing(true);
    try {
      const order = await createOrderFromCart(token, formData);
      updateCart({ ...cart, items: [], total: "0", total_items: 0 });
      onOrderComplete(order.id);
    } catch {
      sileo.error({
        title: "Error al procesar el pedido",
        description: "Revisa tus datos e inténtalo de nuevo.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground">Finalizar compra</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Completa tus datos de envío y elige cómo quieres pagar.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Envío */}
            <Card className="gap-4 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Truck className="size-5 text-primary" />
                Información de envío
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="shipping_name" className={labelClass}>
                    Nombre completo
                  </label>
                  <input
                    id="shipping_name"
                    type="text"
                    name="shipping_name"
                    value={formData.shipping_name}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="shipping_address" className={labelClass}>
                    Dirección
                  </label>
                  <input
                    id="shipping_address"
                    type="text"
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleChange}
                    placeholder="Calle, número, colonia..."
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="shipping_city" className={labelClass}>
                      Ciudad
                    </label>
                    <input
                      id="shipping_city"
                      type="text"
                      name="shipping_city"
                      value={formData.shipping_city}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping_postal_code" className={labelClass}>
                      Código postal
                    </label>
                    <input
                      id="shipping_postal_code"
                      type="text"
                      name="shipping_postal_code"
                      value={formData.shipping_postal_code}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="shipping_phone" className={labelClass}>
                    Teléfono
                  </label>
                  <input
                    id="shipping_phone"
                    type="tel"
                    name="shipping_phone"
                    value={formData.shipping_phone}
                    onChange={handleChange}
                    placeholder="10 dígitos"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Pago */}
            <Card className="gap-4 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <CreditCard className="size-5 text-primary" />
                Método de pago
              </h2>

              <div
                role="radiogroup"
                aria-label="Método de pago"
                className="space-y-3"
              >
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = formData.payment_method === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_method: method.value,
                        }))
                      }
                      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-surface-1"
                      }`}
                    >
                      <Icon
                        className={`size-5 shrink-0 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {method.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {method.description}
                        </span>
                      </span>
                      <span
                        className={`size-4 shrink-0 rounded-full border-2 ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="notes" className={labelClass}>
                  Notas (opcional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Instrucciones especiales de entrega..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </Card>

            <Button
              type="submit"
              size="lg"
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Procesando pedido...
                </>
              ) : (
                <>
                  <CheckCircle />
                  Confirmar pedido
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Resumen */}
        <div className="md:col-span-1">
          <Card className="sticky top-24 gap-4 p-6">
            <h2 className="text-lg font-bold text-foreground">
              Resumen del pedido
            </h2>

            <div className="max-h-60 space-y-3 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-1">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-4 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      x{item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

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

            <div className="flex items-center gap-2 rounded-lg bg-surface-1 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-stock" />
              <span>Compra segura y protegida</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OrderConfirmation({ orderId }: { orderId: number }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full p-6 text-center sm:p-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-stock">
          <CheckCircle className="size-10 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Pedido realizado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu pedido{" "}
          <span className="font-bold text-foreground">#{orderId}</span> se
          procesó correctamente.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Recibirás un correo con los detalles de tu compra.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href="/profile"
            className={buttonVariants({ size: "lg" })}
          >
            <UserRound />
            Ir a mi perfil
          </Link>
          <Link
            href="/products"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Seguir comprando
          </Link>
        </div>
      </Card>
    </div>
  );
}