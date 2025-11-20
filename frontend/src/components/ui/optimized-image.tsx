import { useState, useEffect, useRef } from "react";

interface OptimizedImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "src" | "srcSet" | "loading"
  > {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // Para imágenes above-the-fold (LCP)
  sizes?: string; // Para responsive images
  className?: string;
}

/**
 * Componente de imagen optimizado con:
 * - Lazy loading automático (excepto priority)
 * - Responsive images con srcset
 * - Placeholder para prevenir CLS
 * - WebP/AVIF support (requiere backend)
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "100vw",
  className = "",
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority && imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [priority]);

  // Generar srcset para responsive images
  // En producción, esto debería generarse desde el backend
  const generateSrcSet = (baseSrc: string) => {
    // Si es una imagen externa o ya tiene parámetros, no modificar
    if (baseSrc.startsWith("http") || baseSrc.includes("?")) {
      return undefined;
    }
    // Para imágenes locales, generar tamaños comunes
    // En producción, usar un servicio de imágenes o CDN
    return undefined; // Deshabilitado por ahora, requiere backend
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true); // Mostrar placeholder incluso en error
  };

  // Aspect ratio para prevenir CLS
  const aspectRatio = width && height ? height / width : undefined;
  const paddingBottom = aspectRatio ? `${aspectRatio * 100}%` : undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width ? `${width}px` : "100%",
        height: height && !aspectRatio ? `${height}px` : undefined,
        paddingBottom: paddingBottom,
        backgroundColor: "#f3f4f6", // Placeholder color
      }}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-secondary/20 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        style={{
          objectFit: "cover",
        }}
        {...props}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/10">
          <span className="text-xs text-muted-foreground">Imagen no disponible</span>
        </div>
      )}
    </div>
  );
}

