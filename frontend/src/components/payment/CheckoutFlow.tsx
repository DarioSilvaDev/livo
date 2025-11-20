import { useState } from "react";
import { Stepper, Step, StepLabel, StepContent, Box } from "@mui/material";
import {
  ShoppingCart,
  User,
  CreditCard,
  Hourglass,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentStepper } from "./PaymentStepper";
import PaymentBrick from "./PaymentBrick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface OrderItem {
  colorId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CheckoutFlowProps {
  items: OrderItem[];
  total: number;
  productId: string;
  batchStatus?: "disponible" | "baja" | "sin_stock" | "preorden";
  estimatedPreorderDays?: number;
  onComplete?: (orderId: string) => void;
  onCancel?: () => void;
  publicKey: string;
}

const steps = [
  {
    label: "Resumen de compra",
    icon: ShoppingCart,
    description: "Revisa tu pedido",
  },
  {
    label: "Datos del usuario",
    icon: User,
    description: "Información de contacto",
  },
  {
    label: "Método de pago",
    icon: CreditCard,
    description: "Selecciona cómo pagar",
  },
  {
    label: "Procesando pago",
    icon: Hourglass,
    description: "Confirmando tu pago",
  },
  {
    label: "Resultado",
    icon: CheckCircle2,
    description: "Estado del pago",
  },
];

export default function CheckoutFlow({
  items,
  total,
  productId,
  batchStatus,
  estimatedPreorderDays,
  onComplete,
  onCancel,
  publicKey,
}: CheckoutFlowProps) {
  const {
    activeStep,
    completed,
    handleNext,
    handleBack,
    handleStepComplete,
    goToStep,
  } = usePaymentStepper(0);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    return items.length > 0 && total > 0;
  };

  const validateStep2 = () => {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.address.trim() !== "" &&
      formData.city.trim() !== "" &&
      formData.zipCode.trim() !== ""
    );
  };

  const handlePaymentSuccess = async (result: any) => {
    setIsProcessing(true);
    setPaymentResult(result);

    try {
      // Create order in backend
      const [firstName, ...lastNameParts] = formData.name.split(" ");
      const lastName = lastNameParts.join(" ") || firstName;

      const orderData = {
        ...formData,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        total,
        productId,
        items,
        batchStatus,
        estimatedPreorderDays,
        paymentId: result.paymentId,
        paymentStatus: result.status,
      };

      const order = await apiFetch<{ id: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      handleStepComplete(3); // Complete processing step
      handleNext(); // Go to result step

      if (onComplete) {
        onComplete(order.id);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      setError("Error al crear la orden. El pago fue procesado correctamente.");
      handleStepComplete(3);
      handleNext();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: any) => {
    setError(error.message || "Error al procesar el pago");
    setPaymentResult({ status: "rejected", error: error.message });
    handleStepComplete(3);
    handleNext();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Resumen de compra
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resumen de tu compra</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Cantidad: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold price">
                    ${item.subtotal.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl product-price text-accent">
                ${total.toLocaleString()}
              </span>
            </div>
            {batchStatus === "preorden" && (
              <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm">
                  ⏱️ Entrega estimada: {estimatedPreorderDays || 10} días
                  hábiles
                </p>
              </div>
            )}
          </div>
        );

      case 1: // Datos del usuario
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="juan@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+54 11 1234-5678"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Buenos Aires"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Calle y número"
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Código postal</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="1234"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2: // Método de pago
        if (!publicKey) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Selecciona método de pago
              </h3>
              <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400">
                  ⚠️ La configuración de MercadoPago no está disponible. Por
                  favor, contacta al administrador.
                </p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selecciona método de pago</h3>
            <div className="flex gap-4 mb-6">
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                className="flex-1"
              >
                Tarjeta de crédito/débito
              </Button>
              <Button
                variant={paymentMethod === "wallet" ? "default" : "outline"}
                onClick={() => setPaymentMethod("wallet")}
                className="flex-1"
              >
                MercadoPago
              </Button>
            </div>
            <PaymentBrick
              amount={total}
              payer={{
                email: formData.email,
                firstName: formData.name.split(" ")[0],
                lastName: formData.name.split(" ").slice(1).join(" ") || "",
              }}
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                // Solo mostrar error, no avanzar automáticamente
                console.error("Payment brick error:", error);
                setError(
                  error.message || "Error al inicializar el método de pago"
                );
              }}
              publicKey={publicKey}
              paymentMethod={paymentMethod}
            />
          </div>
        );

      case 3: // Procesando
        return (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-12 h-12 animate-spin text-accent mb-4" />
            <p className="text-lg font-semibold">Procesando tu pago...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor, no cierres esta ventana
            </p>
          </div>
        );

      case 4: // Resultado
        const isApproved = paymentResult?.status === "approved";
        const isPending =
          paymentResult?.status === "pending" ||
          paymentResult?.status === "in_process";
        const isRejected =
          paymentResult?.status === "rejected" ||
          paymentResult?.status === "cancelled";

        return (
          <div className="space-y-4">
            {isApproved && (
              <div className="text-center p-6 bg-green-500/20 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-2xl product-title mb-2">¡Pago Aprobado!</h3>
                <p className="text-muted-foreground">
                  Tu pedido ha sido confirmado. Recibirás un email de
                  confirmación.
                </p>
              </div>
            )}

            {isPending && (
              <div className="text-center p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-2xl product-title mb-2">Pago Pendiente</h3>
                <p className="text-muted-foreground">
                  Tu pago está siendo procesado. Te notificaremos cuando se
                  confirme.
                </p>
              </div>
            )}

            {isRejected && (
              <div className="text-center p-6 bg-red-500/20 border border-red-500/30 rounded-lg">
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                        <h3 className="text-2xl product-title mb-2">Pago Rechazado</h3>
                <p className="text-muted-foreground">
                  {error ||
                    "El pago no pudo ser procesado. Por favor, intenta con otro método de pago."}
                </p>
              </div>
            )}

            {paymentResult && (
              <div className="p-4 bg-secondary/20 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID de pago:</span>
                  <span className="font-mono text-sm">
                    {paymentResult.paymentId || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-semibold">
                    ${total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-semibold">{paymentResult.status}</span>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              {isRejected && (
                <Button
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="flex-1"
                >
                  Intentar nuevamente
                </Button>
              )}
              <Button
                onClick={() => {
                  if (onComplete && isApproved) {
                    onComplete(paymentResult.paymentId);
                  } else if (onCancel) {
                    onCancel();
                  }
                }}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {isApproved ? "Ver mi pedido" : "Volver a la tienda"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-6 rounded-lg border border-secondary/50 bg-background">
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completed[index] || false;
            const isActive = activeStep === index;

            return (
              <Step key={step.label} completed={isCompleted}>
                <StepLabel
                  StepIconComponent={() => (
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isActive
                          ? "bg-accent border-accent text-accent-foreground"
                          : isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-secondary border-secondary text-secondary-foreground"
                      )}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {step.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {step.description}
                    </span>
                  </div>
                </StepLabel>
                <StepContent>
                  <Box className="mt-4">
                    {index === activeStep && (
                      <>
                        <div className="min-h-[200px]">
                          {renderStepContent()}
                        </div>
                        {index < 2 && (
                          <div className="flex justify-between mt-6">
                            <Button
                              variant="outline"
                              onClick={index === 0 ? onCancel : handleBack}
                              disabled={index === 0}
                            >
                              {index === 0 ? "Cancelar" : "Atrás"}
                            </Button>
                            <Button
                              onClick={handleNext}
                              disabled={
                                (index === 0 && !validateStep1()) ||
                                (index === 1 && !validateStep2())
                              }
                              className="bg-accent hover:bg-accent/90"
                            >
                              Siguiente
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </div>
    </div>
  );
}
