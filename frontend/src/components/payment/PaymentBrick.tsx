import { useEffect, useRef, useState } from "react";
import { initMercadoPago, Wallet, CardPayment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface PaymentBrickProps {
  amount: number;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  onSuccess: (paymentResult: any) => void;
  onError: (error: any) => void;
  publicKey: string;
  paymentMethod?: "card" | "wallet";
}

export default function PaymentBrick({
  amount,
  payer,
  onSuccess,
  onError,
  publicKey,
  paymentMethod = "card",
}: PaymentBrickProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize MercadoPago SDK
    if (publicKey && !isInitialized && publicKey.trim() !== "") {
      try {
        initMercadoPago(publicKey, { locale: "es-AR" });
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing MercadoPago:", error);
        // No llamar onError aquí para evitar avanzar pasos automáticamente
      }
    }
  }, [publicKey, isInitialized]);

  const handleSubmit = async (formData: any) => {
    setIsProcessing(true);
    try {
      const { token, issuer_id, payment_method_id } = formData;

      // Send payment to backend
      const paymentResult = await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          token,
          issuer_id,
          payment_method_id,
          transaction_amount: amount,
          payer: {
            email: payer.email,
            first_name: payer.firstName,
            last_name: payer.lastName,
          },
        }),
      });

      onSuccess(paymentResult);
    } catch (error: any) {
      console.error("Payment error:", error);
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Wallet onSubmit handler (different signature - no parameters)
  const handleWalletSubmit = async (): Promise<unknown> => {
    setIsProcessing(true);
    try {
      // Wallet handles the payment flow differently
      // The payment result will come through the onReady or onError callbacks
      // For now, we'll just mark as processing
      return Promise.resolve();
    } catch (error: any) {
      console.error("Wallet payment error:", error);
      onError(error);
      return Promise.reject(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="ml-3 text-muted-foreground">
          Inicializando método de pago...
        </span>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
        <span className="text-muted-foreground">
          Procesando tu pago...
        </span>
      </div>
    );
  }

  // CardPayment initialization
  const cardInitialization = {
    amount: amount,
    payer: {
      email: payer.email,
    },
  };

  // CardPayment customization
  const cardCustomization = {
    visual: {
      style: {
        theme: "dark" as const,
        customVariables: {
          formBackgroundColor: "transparent",
          baseColor: "hsl(var(--accent))",
        },
      },
    },
  };

  return (
    <div ref={containerRef} className="w-full">
      {paymentMethod === "card" ? (
        <CardPayment
          initialization={cardInitialization}
          customization={cardCustomization}
          onSubmit={handleSubmit}
          onReady={() => {
            console.log("CardPayment ready");
          }}
          onError={(error) => {
            console.error("CardPayment error:", error);
            // Solo llamar onError si es un error crítico que impide continuar
            // Los errores de validación del formulario no deben avanzar pasos
            if (error?.type === "critical" || error?.message?.includes("initialization")) {
              onError(error);
            }
          }}
        />
      ) : (
        <Wallet
          onSubmit={handleWalletSubmit}
          onReady={() => {
            console.log("Wallet ready");
          }}
          onError={(error) => {
            console.error("Wallet error:", error);
            // Solo llamar onError si es un error crítico que impide continuar
            if (error?.type === "critical" || error?.message?.includes("initialization")) {
              onError(error);
            }
          }}
        />
      )}
    </div>
  );
}

