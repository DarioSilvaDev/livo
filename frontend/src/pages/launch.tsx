import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Mail, Gift, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

interface VariantData {
  variantId: string;
  variantLabel: string;
  quantity: number;
}

interface LocationState {
  variants?: VariantData[];
  isPreorder?: boolean;
}

export default function LaunchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<VariantData[]>([]);

  // Obtener variantes del state de navegación
  useEffect(() => {
    if (state?.variants && state.variants.length > 0) {
      setSelectedVariants(state.variants);
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Por favor, ingresa tu email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, ingresa un email válido");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/launch/early-access", {
        method: "POST",
        body: JSON.stringify({
          email,
          variants: selectedVariants,
          isPreorder: state?.isPreorder ?? false,
        }),
      });

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Error registering email:", error);
      setError(
        error.message ||
          "Error al registrar tu email. Por favor, intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-green-500/20 border-2 border-green-500/50">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              ¡Gracias por tu interés!
            </h1>
            <p className="text-xl text-muted-foreground">
              Te hemos registrado exitosamente
            </p>
          </div>

          <div className="p-8 rounded-xl bg-accent/10 border-2 border-accent/30 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Gift className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-bold">Lo que obtienes:</h2>
            </div>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <span>Acceso anticipado al primer lote</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <span>Descuento exclusivo del 20%</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <span>Notificación cuando el producto esté disponible</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/shop")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a la tienda
            </Button>
            <Button
              onClick={() => {
                setEmail("");
                setIsSuccess(false);
              }}
              className="bg-accent hover:bg-accent/90"
            >
              Registrar otro email
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-accent/10 border-2 border-accent/30">
              <Sparkles className="w-12 h-12 text-accent" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            ¡Gracias por tu interés!
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Estamos preparando el primer lote de la nueva{" "}
            <strong className="text-foreground">
              Licuadora Portátil Livo A11 Pro
            </strong>
            . Déjanos tu email y obtendrás acceso anticipado + un descuento
            exclusivo.
          </p>
        </div>

        {/* Selected Variants Summary */}
        {selectedVariants.length > 0 && (
          <div className="p-6 rounded-xl bg-accent/10 border-2 border-accent/30">
            <h3 className="font-semibold mb-3">Variantes seleccionadas:</h3>
            <div className="space-y-2">
              {selectedVariants.map((variant, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 rounded bg-secondary/30"
                >
                  <span className="font-medium">
                    {variant.variantLabel} (x{variant.quantity})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="p-6 rounded-xl bg-secondary/20 border border-secondary/50">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-bold">Lo que obtienes:</h2>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span>Acceso anticipado al primer lote</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span>Descuento exclusivo del 20%</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span>Notificación cuando el producto esté disponible</span>
            </li>
          </ul>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 bg-secondary/30 border-secondary focus:border-accent"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="bg-accent hover:bg-accent/90 px-8"
              >
                {isSubmitting ? "Registrando..." : "Registrarme"}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        </form>

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate("/shop")}
            variant="ghost"
            className="flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la tienda
          </Button>
        </div>
      </div>
    </main>
  );
}
