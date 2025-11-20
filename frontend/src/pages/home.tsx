import HeroSection from "@/components/landing/hero-section";
import FeatureSection from "@/components/landing/feature-section";
import GallerySection from "@/components/landing/gallery-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import FAQSection from "@/components/landing/faq-section";
// import FooterSection from "@/components/landing/footer-section";

export default function HomePage() {
  return (
    <main className="bg-background text-foreground">
      <HeroSection />
      <FeatureSection />
      <GallerySection />
      <TestimonialsSection />
      <FAQSection />
      {/* <FooterSection /> */}
    </main>
  );
}
