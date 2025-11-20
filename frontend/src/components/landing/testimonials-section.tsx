import { TrendingUp, Globe, Users } from "lucide-react";

const socialProof = [
  {
    icon: Users,
    text: "Más de 3.000 unidades vendidas globalmente",
    highlight: "3.000+",
  },
  {
    icon: TrendingUp,
    text: "Producto tendencia en TikTok y Amazon",
    highlight: "Tendencia",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl section-title mb-4">
            Confianza y resultados
          </h2>
          <p className="text-muted-foreground text-lg">
            Únete a miles de personas que ya confían en nosotros
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {socialProof.map((proof, index) => {
            const Icon = proof.icon;
            return (
              <div
                key={index}
                className="p-8 rounded-xl bg-secondary/30 border border-secondary/50 hover:border-accent/30 transition-all text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-accent/10 border border-accent/30">
                    <Icon className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <p className="text-foreground leading-relaxed">
                  <span className="font-bold text-accent">
                    {proof.highlight}
                  </span>
                  <br />
                  {proof.text.replace(proof.highlight, "").trim()}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
