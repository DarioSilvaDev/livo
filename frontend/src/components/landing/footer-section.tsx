import { Link } from "react-router-dom";
import { Mail, Phone, Instagram } from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="bg-secondary/50 border-t border-secondary">
      <div className="container mx-auto px-4 py-12">
        {/* Main footer content */}
        <div className="flex flex-wrap gap-8 mb-12">
          {/* Brand */}
          <div style={{ display: "none" }}>
            <Link
              to="/"
              className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity p-2"
            >
              <img
                src="/logo2.png"
                alt="Livo - Licuadora Portátil"
                className="h-max w-auto object-contain rounded-lg"
                loading="lazy"
                decoding="async"
                width="64"
                height="64"
              />
              {/* <h3 className="font-bold text-lg">Livo</h3> */}
            </Link>
            <p className="text-sm ">Premium technology, portable power.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-sm ">
              <li>
                <Link
                  to="/shop"
                  className="hover:text-accent transition-colors"
                >
                  Tienda
                </Link>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-accent transition-colors"
                >
                  Características
                </a>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="hover:text-accent transition-colors"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm ">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+54 9 11 XXXX-XXXX</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>info@licuadora.com</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">Síguenos</h4>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/livo/"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-accent hover:text-background transition-colors"
              >
                <Instagram className="w-8 h-8" />
              </a>
              {/* <a href="#" className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-accent hover:text-background transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-accent hover:text-background transition-colors">
                <Facebook className="w-4 h-4" />
              </a> */}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary pt-8 flex flex-col md:flex-row justify-between items-center text-sm ">
          <p>
            &copy; 2025 Livo - Licuadora Portátil. Todos los derechos
            reservados.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-accent transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-accent transition-colors">
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
