import { createElement, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  Droplets,
  Dumbbell,
  Hammer,
  Home,
  Package,
  Palette,
  Puzzle,
  Shirt,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  "Electrónica": Zap,
  "Ropa": Shirt,
  "Hogar": Home,
  "Deportes": Dumbbell,
  "Libros": BookOpen,
  "Juguetes": Puzzle,
  "Herramientas": Hammer,
  "Electricidad": Zap,
  "Fijaciones": Wrench,
  "Plomería": Droplets,
  "Pinturas": Palette,
  "Construcción": Building2,
};

export function getCategoryIcon(
  category: string
): LucideIcon {
  return categoryIcons[category] ?? Package;
}

// Returns a rendered icon element so callers never instantiate a component
// during render (react-hooks/static-components).
export function getCategoryIconElement(
  category: string,
  className?: string
): ReactNode {
  const Icon = getCategoryIcon(category);
  return createElement(Icon, { className });
}