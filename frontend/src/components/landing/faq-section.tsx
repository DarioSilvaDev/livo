import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "¿Cuánto dura la batería?",
    answer:
      "La batería durará para más de 15 usos completos por carga. El tiempo de carga es de aproximadamente 4 horas.",
  },
  {
    question: "¿Cómo se limpia?",
    answer:
      "Es muy fácil. El vaso se separa completamente y todas las piezas son lavables. Recomendamos usar agua tibia.",
  },
  {
    question: "¿Qué materiales tiene?",
    answer:
      "Cuerpo de plástico reforzado de alta calidad, vaso de Tritan más ligero y resistente que el vidrio, 6 cuchillas de acero inoxidable 304.",
  },
  {
    question: "¿Tiene garantía?",
    answer:
      "Sí, todos nuestros productos cuentan con garantía de 6 meses desde la compra. Garantizamos reemplazo o devolución en caso de defecto.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos todas las tarjetas de crédito, débito y transferencia bancaria a través de MercadoPago.",
  },
  {
    question: "¿Cuál es el tiempo de envío?",
    answer:
      "Realizamos envíos rápidos dentro de San Nicolas de 12 a 24 horas. Interior del país: despachamos en el día mediante Correo Argentino.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl section-title mb-4">
              Preguntas Frecuentes
            </h2>
            <p className=" text-lg">Resolvemos tus dudas</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-secondary/50 bg-secondary/20 overflow-hidden hover:border-accent/30 transition-colors"
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                >
                  <span className="font-semibold text-left">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-accent transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openIndex === index && (
                  <div className="px-6 py-4 bg-secondary/10 border-t border-secondary/50 ">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
