import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CheckoutPendingPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Pago Pendiente</h1>
          <p className="mb-8">
            Tu pago está siendo procesado. Te notificaremos por email cuando
            se confirme.
          </p>
          <div className="p-6 rounded-lg bg-secondary/20 border border-secondary/50 mb-8 text-left">
            <h3 className="font-semibold mb-4">¿Qué sigue?</h3>
            <ul className="space-y-2 text-sm">
              <li>• Revisa tu email para más detalles</li>
              <li>• El pago puede tardar hasta 48 horas en confirmarse</li>
              <li>• Te notificaremos cuando el pago sea aprobado</li>
            </ul>
          </div>
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

