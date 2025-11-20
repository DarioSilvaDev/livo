import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

export default function HeaderSection() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary/60 bg-background/80 backdrop-blur-sm supports-backdrop-filter:bg-background/60 will-change-transform">
      {/* Prevenir CLS: altura fija */}
      <div className="container mx-auto px-4" style={{ minHeight: "56px" }}>
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            aria-label="Ir al inicio"
          >
            <img
              src="/logo2.png"
              alt="Livo - Licuadora Portátil"
              className="h-10 sm:h-16 w-auto object-contain rounded-lg"
              width="64"
              height="64"
              loading="eager"
              fetchPriority="high"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              Inicio
            </Link>
            <Link
              to="/shop"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              Tienda
            </Link>
            <a
              href="#features"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              Características
            </a>
          </nav>

          {/* CTA Button */}
          <Link
            to="/shop"
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-semibold hover:bg-accent/90 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Comprar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
