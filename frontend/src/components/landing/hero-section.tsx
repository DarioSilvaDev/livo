import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function HeroSection() {
  const [typed, setTyped] = useState("");
  const fullText = "estés donde estés";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setTyped(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 70);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative min-h-[85vh] sm:min-h-screen flex items-center justify-center overflow-hidden bg-center border border-border/60"
      style={{
        backgroundImage: "url('/producto.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        // Prevenir CLS con altura mínima responsive
        minHeight: "clamp(500px, 85vh, 100vh)",
        maxHeight: "100vh",
        // Compensar espacio del header removido
        paddingTop: "clamp(3.5rem, 8vh, 4rem)",
      }}
    >
      <div className="absolute inset-0 bg-linear-to-b from-background/70 via-background/40 to-background/85" />
      <div className="relative container mx-auto px-4 py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-block mb-6 sm:mb-8 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-secondary/50 border border-secondary text-xs sm:text-sm">
            Tecnología Premium • Diseño Minimalista
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl hero-title mb-4 sm:mb-6 text-pretty">
            {/* La licuadora portátil que te acompaña */}
            Batidos frescos, <br />
            <span className="gradient-text">
              {typed}
              <span className="ml-1 inline-block w-[2px] h-[1em] align-[-0.1em] bg-accent animate-pulse" />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto px-4">
            Smoothies, batidos y jugos frescos, en cualquier momento, en
            cualquier lugar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 md:mb-16 px-4">
            <Link
              to="/shop"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-accent text-accent-foreground rounded-full font-semibold hover:bg-accent/90 transition-colors text-sm sm:text-base min-h-[44px] flex items-center justify-center"
            >
              Comprar Ahora
            </Link>
            <button
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-6 sm:px-8 py-3 sm:py-4 border border-secondary rounded-full font-semibold hover:bg-secondary/80 transition-colors text-sm sm:text-base min-h-[44px]"
            >
              Descubre Más
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
