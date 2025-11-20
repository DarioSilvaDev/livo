const galleryItems = [
  { title: "Gym", image: "/gym2.png" },
  { title: "Aire Libre", image: "/bike.png" },
  { title: "Hogar", image: "/home.png" },
  { title: "Fitness", image: "/gym.jpg" },
];

export default function GallerySection() {
  return (
    <section className="py-24 bg-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl section-title mb-4">
            Úsala en Cualquier Lugar
          </h2>
          <p className=" text-lg">Tu compañera perfecta en cada aventura</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className="aspect-square rounded-xl overflow-hidden bg-secondary/30 border border-secondary/50 flex items-center justify-center group hover:border-accent/30 transition-colors"
            >
              <div className="text-center">
                <p className=" mb-2 group-hover:text-accent transition-colors">
                  {item.title}
                </p>
                {/* <p className="text-sm /50">Espacio para imagen</p> */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width="400"
                  height="400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Video/GIF section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-secondary/30 border border-secondary/50 aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className=" mb-2">Video: Funcionamiento</p>
              <p className="text-sm /50">[GIF/Video aquí]</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/30 border border-secondary/50 aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className=" mb-2">Video: Cómo se arma</p>
              <p className="text-sm /50">[GIF/Video aquí]</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/30 border border-secondary/50 aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className=" mb-2">Video: Cómo se limpia</p>
              <p className="text-sm /50">[GIF/Video aquí]</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/30 border border-secondary/50 aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className=" mb-2">Video: Cómo se carga</p>
              <p className="text-sm /50">[GIF/Video aquí]</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
