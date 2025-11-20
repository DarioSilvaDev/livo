import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CheckoutFailedPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="w-16 h-16 mx-auto text-red-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Pago No Completado</h1>
          <p className="mb-8">
            El pago no pudo ser procesado. Por favor, verifica tus datos e
            intenta nuevamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/shop" className="flex-1">
              <Button variant="outline" className="w-full">
                Volver a la Tienda
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button className="w-full">Ir al Inicio</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
