import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sileo";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Nonce-based CSP (frontend/proxy.ts) requires every page to render per
// request: static pages have no request headers, so no nonce can be injected.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MiTienda - Todo para tu proyecto",
  description: "Herramientas y materiales profesionales con envío rápido",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f5f5f5]">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Toaster position="top-right" theme="light" offset={{ top: 112 }} options={{ duration: 3000 }} />
          <footer className="bg-[#1a1a1a] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center gap-2 text-xl font-bold mb-4">
                    <span className="text-2xl">🔧</span>
                    <span>
                      Mi<span className="text-[#e65c00]">Tienda</span>
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Todo para tu proyecto en un solo lugar. Herramientas profesionales y materiales de primera calidad.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-4 text-[#e65c00]">Productos</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-white transition-colors">Herramientas</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Electricidad</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Plomería</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Pinturas</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-4 text-[#e65c00]">Ayuda</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Envíos</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Devoluciones</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Garantías</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-4 text-[#e65c00]">Contacto</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <span>📧</span> info@mitienda.com
                    </li>
                    <li className="flex items-center gap-2">
                      <span>📞</span> +52 55 1234 5678
                    </li>
                    <li className="flex items-center gap-2">
                      <span>🕐</span> Lun-Sáb 8am-8pm
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-[#3a3a3a] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-500 text-sm">
                  © 2026 MiTienda. Todos los derechos reservados.
                </p>
                <div className="flex gap-4 text-2xl">
                  <a href="#" className="hover:scale-110 transition-transform">📘</a>
                  <a href="#" className="hover:scale-110 transition-transform">📷</a>
                  <a href="#" className="hover:scale-110 transition-transform">🐦</a>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
