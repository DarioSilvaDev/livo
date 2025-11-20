import { useState } from "react";
import {
  ShoppingCart,
  User,
  CreditCard,
  Hourglass,
  CheckCircle2,
} from "lucide-react";

interface PaymentStepperProps {
  onComplete?: (paymentResult: any) => void;
  onCancel?: () => void;
  initialStep?: number;
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

export default function PaymentStepper({
  onComplete,
  onCancel,
  initialStep = 0,
  children,
}: PaymentStepperProps & { children?: React.ReactNode }) {
  // This component is now just a wrapper - actual logic is in usePaymentStepper hook
  return <div className="w-full">{children}</div>;
}

// Export helper functions for parent components
export const usePaymentStepper = (initialStep = 0) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const handleNext = () => {
    setActiveStep((prev) => {
      const next = prev + 1;
      setCompleted((comp) => ({ ...comp, [prev]: true }));
      return next;
    });
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStepComplete = (step: number) => {
    setCompleted((prev) => ({ ...prev, [step]: true }));
    handleNext();
  };

  const goToStep = (step: number) => {
    setActiveStep(step);
  };

  return {
    activeStep,
    completed,
    handleNext,
    handleBack,
    handleStepComplete,
    goToStep,
  };
};
