import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "@/pages/home";
import ShopPage from "@/pages/shop";
import AdminPage from "@/pages/admin";
import LaunchPage from "@/pages/launch";
import CheckoutSuccessPage from "@/pages/checkout-success";
import CheckoutFailedPage from "@/pages/checkout-failed";
import CheckoutPendingPage from "@/pages/checkout-pendiente";

function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="">La página que buscas no existe.</p>
    </main>
  );
}

// Prefetch routes for better navigation performance
function PrefetchRoutes() {
  const location = useLocation();

  useEffect(() => {
    // Prefetch likely next routes on hover/focus
    const prefetchRoutes = ["/shop", "/launch"];
    
    prefetchRoutes.forEach((route) => {
      if (route !== location.pathname) {
        // Prefetch using link rel="prefetch" or dynamic import
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = route;
        document.head.appendChild(link);
      }
    });
  }, [location]);

  return null;
}

export default function App() {
  return (
    <>
      <PrefetchRoutes />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/launch" element={<LaunchPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/checkout-success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout-failed" element={<CheckoutFailedPage />} />
        <Route path="/checkout-pendiente" element={<CheckoutPendingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
