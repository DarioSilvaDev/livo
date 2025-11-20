import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-accent mb-6" />

          <h1 className="text-3xl font-bold mb-4">¡Pedido Confirmado!</h1>

          <p className=" mb-8">
            Tu pedido ha sido procesado correctamente. Recibirás un email de
            confirmación en breve.
          </p>

          <div className="p-6 rounded-lg bg-secondary/20 border border-secondary/50 mb-8 text-left">
            <h3 className="font-semibold mb-4">Detalles del Pedido</h3>
            <ul className="space-y-2 text-sm ">
              <li className="flex justify-between">
                <span>Número de pedido:</span>
                <span className="font-semibold text-foreground">
                  #PED-20240115-001
                </span>
              </li>
              <li className="flex justify-between">
                <span>Estado:</span>
                <span className="font-semibold text-accent">Confirmado</span>
              </li>
              <li className="flex justify-between">
                <span>Envío estimado:</span>
                <span className="font-semibold text-foreground">
                  24-48 horas
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Volver al Inicio
              </Button>
            </Link>
            <Link to="/shop" className="flex-1">
              <Button className="w-full bg-accent hover:bg-accent/90">
                Seguir Comprando
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
