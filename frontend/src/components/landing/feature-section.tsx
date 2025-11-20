import { Zap, Wind, Droplet, Battery, Shield, Headphones } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Motor Potente",
    description:
      "Tecnología de última generación para resultados profesionales",
  },
  {
    icon: Wind,
    title: "Ultra Portátil",
    description: "Diseño compacto y ligero para llevar a todas partes",
  },
  {
    icon: Droplet,
    title: "Fácil de Limpiar",
    description: "Componentes desmontables para limpieza rápida",
  },
  {
    icon: Battery,
    title: "+12 Usos por Carga",
    description:
      "Batería de larga duración con carga rápida USB-C, 3 * 2000mAh (6000mAh total)",
  },
  {
    icon: Shield,
    title: "Vaso Resistente",
    description: "Fabricado con Tritan, material premium de máxima durabilidad",
  },
  {
    icon: Headphones,
    title: "Operación Silenciosa",
    description: "Motor optimizado con mínimo ruido",
  },
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl section-title mb-4">
            Características Principales
          </h2>
          <p className=" text-lg">
            Diseñada para ti, con todo lo que necesitas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-xl bg-secondary/30 border border-secondary/50 hover:border-accent/30 transition-all hover:bg-secondary/50"
              >
                <Icon className="w-8 h-8 mb-4 text-accent" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className=" text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
