import { useEffect, useState } from "react";
import ShopClient from "@/components/shop/shop-client";
import { apiFetch } from "@/lib/api-client";

export type ApiProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  batch_status?: "disponible" | "baja" | "sin_stock" | "preorden";
  estimated_restock_days?: number;
  estimated_preorder_delivery_days?: number;
  variants?: Array<{
    id: string;
    label: string;
    image_url: string;
    stock: number;
    sort_order?: number;
    is_active?: boolean;
  }>;
};

export default function ShopPage() {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const data = await apiFetch<ApiProduct>("/api/products");
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        console.error("Error loading product:", err);
        if (isMounted) {
          setError("No pudimos obtener la información del producto.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-background pt-14 sm:pt-16">
        <div className="flex-1 flex items-center justify-center">
          Cargando información del producto...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col bg-background pt-14 sm:pt-16">
        <div className="flex-1 flex items-center justify-center text-red-400">
          {error}
        </div>
      </main>
    );
  }

  return <ShopClient product={product} />;
}
