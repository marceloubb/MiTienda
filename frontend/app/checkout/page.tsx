"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
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

// Asistente de 4 pasos (design.md): Envío → Pago → Revisión → Confirmación.
const STEPS = ["Envío", "Pago", "Revisión", "Confirmación"];

type StepIndex = 0 | 1 | 2 | 3;

const inputClass =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
    return <ConfirmationStep orderId={orderId} />;
  }

  if (isLoading || !user || !cart) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-52" aria-hidden="true" />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Skeleton className="h-80 w-full rounded-2xl" aria-hidden="true" />
            <Skeleton className="h-64 w-full rounded-2xl" aria-hidden="true" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full rounded-2xl p-8 text-center sm:p-12">
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

  return <CheckoutWizard user={user} cart={cart} onOrderComplete={setOrderId} />;
}

function CheckoutWizard({
  user,
  cart,
  onOrderComplete,
}: {
  user: User;
  cart: Cart;
  onOrderComplete: (orderId: number) => void;
}) {
  const [step, setStep] = useState<StepIndex>(0);
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

  function nextStep() {
    setStep((current) => Math.min(3, current + 1) as StepIndex);
  }

  function previousStep() {
    setStep((current) => Math.max(0, current - 1) as StepIndex);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground">Finalizar compra</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Completa tus datos de envío y elige cómo quieres pagar.
      </p>

      <CheckoutStepper current={step} />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {step === 0 && (
            <ShippingStep
              formData={formData}
              onChange={handleChange}
              onContinue={nextStep}
            />
          )}
          {step === 1 && (
            <PaymentStep
              formData={formData}
              onChange={handleChange}
              onBack={previousStep}
              onContinue={nextStep}
            />
          )}
          {step === 2 && (
            <ReviewStep
              cart={cart}
              formData={formData}
              onBack={previousStep}
              onOrderComplete={onOrderComplete}
            />
          )}
        </div>

        {/* Resumen (visible en los pasos de datos) */}
        {step < 3 && <OrderSummary cart={cart} />}
      </div>
    </div>
  );
}

function CheckoutStepper({ current }: { current: StepIndex }) {
  return (
    <nav aria-label="Progreso del checkout" className="mt-6">
      <ol className="flex items-center">
        {STEPS.map((label, index) => {
          const isCompleted = index < current;
          const isActive = index === current;
          return (
            <li
              key={label}
              className={`flex items-center ${
                index < STEPS.length - 1 ? "flex-1" : ""
              }`}
            >
              <div className="flex w-16 flex-col items-center gap-1.5 sm:w-20">
                <span
                  aria-hidden="true"
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isCompleted
                      ? "bg-secondary text-on-secondary"
                      : isActive
                        ? "bg-primary-container text-on-primary-container ring-4 ring-on-primary-container/60"
                        : "bg-surface-container-high text-outline"
                  }`}
                >
                  {isCompleted ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={`text-center text-[11px] font-medium ${
                    isActive
                      ? "text-primary-container"
                      : isCompleted
                        ? "text-secondary"
                        : "text-outline"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`h-0.5 flex-1 rounded-full ${
                    isCompleted ? "bg-secondary" : "bg-surface-container-high"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ShippingStep({
  formData,
  onChange,
  onContinue,
}: {
  formData: CheckoutWizardForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onContinue: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
      className="space-y-6"
    >
      <Card className="gap-4 rounded-2xl p-6">
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
              onChange={onChange}
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
              onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
              onChange={onChange}
              placeholder="10 dígitos"
              className={inputClass}
              required
            />
          </div>
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full">
        Continuar a Pago
      </Button>
    </form>
  );
}

function PaymentStep({
  formData,
  onChange,
  onBack,
  onContinue,
}: {
  formData: CheckoutWizardForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Card className="gap-4 rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <CreditCard className="size-5 text-primary" />
        Método de pago
      </h2>

      <div role="radiogroup" aria-label="Método de pago" className="space-y-3">
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
                onChange({
                  target: { name: "payment_method", value: method.value },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant hover:bg-surface-container-low"
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
                  isSelected ? "border-primary bg-primary" : "border-outline"
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
          onChange={onChange}
          rows={3}
          placeholder="Instrucciones especiales de entrega..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          Volver
        </Button>
        <Button size="lg" onClick={onContinue} className="flex-1">
          Continuar a Revisión
        </Button>
      </div>
    </Card>
  );
}

function ReviewStep({
  cart,
  formData,
  onBack,
  onOrderComplete,
}: {
  cart: Cart;
  formData: CheckoutWizardForm;
  onBack: () => void;
  onOrderComplete: (orderId: number) => void;
}) {
  const { updateCart } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSubmit() {
    setIsProcessing(true);
    try {
      const order = await createOrderFromCart(formData);
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

  const paymentLabel =
    PAYMENT_METHODS.find((m) => m.value === formData.payment_method)?.label ??
    formData.payment_method;

  return (
    <Card className="gap-4 rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <CheckCircle className="size-5 text-primary" />
        Revisión del pedido
      </h2>

      <section aria-label="Resumen de envío" className="space-y-1.5 text-sm">
        <h3 className="font-semibold text-foreground">Envío</h3>
        <p className="text-muted-foreground">{formData.shipping_name}</p>
        <p className="text-muted-foreground">{formData.shipping_address}</p>
        <p className="text-muted-foreground">
          {formData.shipping_city}, {formData.shipping_postal_code}
        </p>
        <p className="text-muted-foreground">{formData.shipping_phone}</p>
      </section>

      <Separator />

      <section aria-label="Resumen de pago" className="space-y-1.5 text-sm">
        <h3 className="font-semibold text-foreground">Pago</h3>
        <p className="text-muted-foreground">{paymentLabel}</p>
        {formData.notes?.trim() && (
          <p className="text-muted-foreground">Nota: {formData.notes}</p>
        )}
      </section>

      <Separator />

      <section aria-label="Productos del pedido">
        <h3 className="text-sm font-semibold text-foreground">
          Productos ({cart.total_items})
        </h3>
        <ul className="mt-2 divide-y divide-outline-variant">
          {cart.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="text-foreground">{item.product.name}</span>
                <span className="ml-1 text-xs text-muted-foreground">
                  × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-medium text-foreground">
                ${parseFloat(item.subtotal).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-foreground">Total</span>
        <span className="text-2xl font-bold text-primary">
          ${parseFloat(cart.total).toFixed(2)}
        </span>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          Volver
        </Button>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isProcessing}
          className="flex-1"
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
      </div>
    </Card>
  );
}

interface CheckoutWizardForm {
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_phone: string;
  payment_method: string;
  notes: string;
}

function OrderSummary({ cart }: { cart: Cart }) {
  return (
    <div className="md:col-span-1">
      <Card className="sticky top-24 gap-4 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground">Resumen del pedido</h2>

        <div className="max-h-60 space-y-3 overflow-y-auto">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
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
                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
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

        <div className="flex items-center gap-2 rounded-2xl bg-surface-container-high p-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-stock" />
          <span>Compra segura y protegida</span>
        </div>
      </Card>
    </div>
  );
}

function ConfirmationStep({ orderId }: { orderId: number | null }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full rounded-2xl p-6 text-center sm:p-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-secondary">
          <CheckCircle className="size-10 text-on-secondary" />
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
          Podés seguir el estado de tu entrega desde &quot;Mis pedidos&quot;.
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