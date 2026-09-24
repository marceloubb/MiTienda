import {
  ArrowLeft,
  Check,
  Clock,
  Navigation,
  QrCode,
  Route,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Material Symbols -> lucide-react icon map (Vibrant Retail Clean).
 *
 * Design screens reference Material Symbols names; the frontend must render
 * lucide equivalents and must NOT load the Material Symbols webfont. This
 * module is the single documented mapping for those screens, so restyled
 * components can resolve an icon by its Material Symbol name:
 *
 *   const Icon = materialToLucide["local_shipping"];
 *   <Icon className="size-5" />
 */
export const materialToLucide: Record<string, LucideIcon> = {
  /** arrow_back -> back navigation */
  arrow_back: ArrowLeft,
  /** local_shipping -> order/delivery truck */
  local_shipping: Truck,
  /** route -> tracking route / dispatch */
  route: Route,
  /** schedule -> timestamps and delivery windows */
  schedule: Clock,
  /** check -> completed step / confirmation */
  check: Check,
  /** shopping_bag -> cart / orders */
  shopping_bag: ShoppingBag,
  /** qr_code_scanner -> 2FA QR enrollment */
  qr_code_scanner: QrCode,
  /** navigation -> delivery directions */
  navigation: Navigation,
};

/** Resolve a Material Symbols name to its lucide component (undefined when unmapped). */
export function materialIcon(name: string): LucideIcon | undefined {
  return materialToLucide[name];
}