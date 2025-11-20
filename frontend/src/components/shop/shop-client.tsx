import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  Lock,
  RefreshCw,
  Bell,
  Mail,
  Package,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import CheckoutFlow from "@/components/payment/CheckoutFlow";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  variants?: Array<{
    id: string;
    label: string;
    image_url: string;
    stock: number;
    batch_status?: "disponible" | "baja" | "sin_stock" | "preorden";
    estimated_restock_days?: number;
    estimated_preorder_delivery_days?: number;
    sort_order?: number;
    is_active?: boolean;
  }>;
};

type ColorOption = {
  id: string;
  label: string;
  imageSrc: string; // path relative to /public
};

type ShopClientProps = {
  product: Product | null;
};

export default function ShopClient({ product }: ShopClientProps) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPreorderModal, setShowPreorderModal] = useState(false);
  const [preorderQuantities, setPreorderQuantities] = useState<
    Record<string, number>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>("");
  const colorOptions: ColorOption[] = useMemo(() => {
    if (product?.variants?.length) {
      return product.variants
        .filter((v) => v.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((v) => ({
          id: v.id,
          label: v.label,
          imageSrc: v.image_url,
        }));
    }
    // Fallback to public images if backend has no variants yet
    return [
      { id: "negro", label: "Negro", imageSrc: "/black.jpeg" },
      { id: "white", label: "Blanco", imageSrc: "/white.jpeg" },
    ];
  }, [product?.variants]);
  const [selectedColorId, setSelectedColorId] = useState<string>(
    colorOptions[0]?.id ?? "default"
  );
  const selectedColor = useMemo(
    () => colorOptions.find((c) => c.id === selectedColorId) ?? colorOptions[0],
    [colorOptions, selectedColorId]
  );
  // quantities per color
  const [colorQuantities, setColorQuantities] = useState<
    Record<string, number>
  >(() =>
    colorOptions.reduce<Record<string, number>>((acc, c) => {
      acc[c.id] = 0; // All variants start at 0
      return acc;
    }, {})
  );
  // Re-sync quantities and selected color when backend variants arrive
  useEffect(() => {
    setSelectedColorId((prev) =>
      colorOptions[0]?.id ? colorOptions[0].id : prev
    );
    setColorQuantities((_) =>
      colorOptions.reduce<Record<string, number>>((acc, c) => {
        acc[c.id] = 0; // All variants start at 0
        return acc;
      }, {})
    );
  }, [colorOptions]);
  const totalUnits = useMemo(() => {
    return Object.entries(colorQuantities).reduce((sum, [colorId, q]) => {
      const variant = product?.variants?.find((v) => v.id === colorId);
      const isVariantOutOfStock = variant?.batch_status === "sin_stock";
      // Don't count out of stock variants in total
      return sum + (isVariantOutOfStock ? 0 : q || 0);
    }, 0);
  }, [colorQuantities, product?.variants]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationVariantId, setNotificationVariantId] =
    useState<string>("");
  const [notificationQuantity, setNotificationQuantity] = useState<number>(1);
  const [notificationSubmitting, setNotificationSubmitting] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null
  );

  // Fetch MercadoPago public key on mount
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await apiFetch<{ publicKey: string }>(
          "/api/payments/public-key"
        );
        setPublicKey(response.publicKey);
      } catch (error) {
        console.error("Error fetching public key:", error);
      }
    };
    fetchPublicKey();
  }, []);

  // Get all out of stock variants for notification selection
  const outOfStockVariants = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants
      .filter((v) => v.batch_status === "sin_stock" && v.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((v) => ({
        id: v.id,
        label: v.label,
        imageSrc: v.image_url,
      }));
  }, [product?.variants]);

  // Initialize notification variant when out of stock variants are available
  useEffect(() => {
    if (outOfStockVariants.length > 0 && !notificationVariantId) {
      setNotificationVariantId(outOfStockVariants[0].id);
    }
  }, [outOfStockVariants, notificationVariantId]);

  const price = useMemo(() => {
    const raw: unknown = product?.price as unknown;
    const numeric = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [product?.price]);
  const total = price * quantity;
  const stock = product?.stock ?? 0;

  // Get batch_status from selected variant, fallback to first variant or default
  const selectedVariant = useMemo(() => {
    if (!product?.variants) return null;
    return (
      product.variants.find((v) => v.id === selectedColorId) ??
      product.variants[0] ??
      null
    );
  }, [product?.variants, selectedColorId]);

  const batchStatus = selectedVariant?.batch_status ?? "disponible";
  const estimatedRestockDays = selectedVariant?.estimated_restock_days ?? 10;
  const estimatedPreorderDays =
    selectedVariant?.estimated_preorder_delivery_days ?? 10;
  const isOutOfStock = batchStatus === "sin_stock" || totalUnits <= 0;

  // Check if there are any variants available for preorder (including sin_stock)
  const hasPreorderVariants = useMemo(() => {
    return (
      product?.variants?.some(
        (v) =>
          (v.batch_status === "preorden" || v.batch_status === "sin_stock") &&
          v.is_active !== false
      ) ?? false
    );
  }, [product?.variants]);

  // Get preorder variants (including sin_stock for encargo option)
  const preorderVariants = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants
      .filter(
        (v) =>
          (v.batch_status === "preorden" || v.batch_status === "sin_stock") &&
          v.is_active !== false
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((v) => ({
        id: v.id,
        label: v.label,
        imageSrc: v.image_url,
        estimatedDays: v.estimated_preorder_delivery_days ?? 10,
        isOutOfStock: v.batch_status === "sin_stock",
      }));
  }, [product?.variants]);

  // Initialize preorder quantities when modal opens
  useEffect(() => {
    if (showPreorderModal && preorderVariants.length > 0) {
      const initialQuantities = preorderVariants.reduce<Record<string, number>>(
        (acc, v, idx) => {
          acc[v.id] = idx === 0 ? 1 : 0;
          return acc;
        },
        {}
      );
      setPreorderQuantities(initialQuantities);
    }
  }, [showPreorderModal, preorderVariants]);

  const preorderTotalUnits = useMemo(() => {
    return Object.values(preorderQuantities).reduce(
      (sum, q) => sum + (q || 0),
      0
    );
  }, [preorderQuantities]);

  const description = useMemo(() => {
    if (product?.description) return product.description;
    return "La licuadora portátil que te acompaña a donde vayas. Motor potente, batería de larga duración, fácil de limpiar y con diseño minimalista.";
  }, [product?.description]);

  const handleQuantityChange = (delta: number) => {
    // legacy single-quantity control (kept but unused in new UI)
    const maxQuantity = stock > 0 ? stock : 1;
    const nextValue = Math.max(1, Math.min(quantity + delta, maxQuantity));
    setQuantity(nextValue);
  };

  const updateColorQuantity = (colorId: string, delta: number) => {
    // Check if variant is out of stock
    const variant = product?.variants?.find((v) => v.id === colorId);
    const isVariantOutOfStock = variant?.batch_status === "sin_stock";

    // Don't allow adding quantity if variant is out of stock
    if (delta > 0 && isVariantOutOfStock) {
      return;
    }

    setColorQuantities((prev) => {
      const current = prev[colorId] ?? 0;
      const proposed = Math.max(0, current + delta);
      // enforce total stock cap if stock > 0 and variant is not out of stock
      const otherTotal = Object.entries(prev)
        .filter(([id]) => id !== colorId)
        .reduce((s, [, q]) => s + (q || 0), 0);
      const cap =
        stock > 0 && !isVariantOutOfStock
          ? Math.max(0, stock - otherTotal)
          : proposed;
      const nextForColor = Math.min(proposed, cap);
      return { ...prev, [colorId]: nextForColor };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Batch status configuration
  const batchStatusConfig = useMemo(() => {
    switch (batchStatus) {
      case "disponible":
        return {
          badge: "Disponible",
          badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
          message: `Lote agotado – próxima reposición en ${estimatedRestockDays} días`,
          canPurchase: true,
        };
      case "baja":
        return {
          badge: "Últimas unidades",
          badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          message: `Lote agotado – próxima reposición en ${estimatedRestockDays} días`,
          canPurchase: true,
        };
      case "sin_stock":
        return {
          badge: "Agotado",
          badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
          message: `Lote agotado – próxima reposición en ${estimatedRestockDays} días`,
          canPurchase: false,
        };
      case "preorden":
        return {
          badge: "Preventa",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          message: `Preventa limitada – entrega estimada en ${estimatedPreorderDays} días hábiles.`,
          canPurchase: true,
        };
      default:
        return {
          badge: "Disponible",
          badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
          message: "Envío inmediato hasta agotar lote actual",
          canPurchase: true,
        };
    }
  }, [batchStatus, estimatedRestockDays, estimatedPreorderDays]);

  const handleNotifyMe = async () => {
    if (!product || !notificationEmail.trim() || !notificationVariantId) return;

    const selectedNotificationVariant = outOfStockVariants.find(
      (v) => v.id === notificationVariantId
    );
    if (!selectedNotificationVariant) return;

    setNotificationSubmitting(true);
    setNotificationMessage(null);

    try {
      const result = await apiFetch<{
        message: string;
        alreadyExists?: boolean;
      }>("/api/products/notify-when-restocked", {
        method: "POST",
        body: JSON.stringify({
          email: notificationEmail.trim(),
          variantId: notificationVariantId,
          variantQty: notificationQuantity,
          variantLabel: selectedNotificationVariant.label,
        }),
      });

      setNotificationMessage(result.message);
      if (!result.alreadyExists) {
        setNotificationEmail("");
        setNotificationQuantity(1);
      }
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      setNotificationMessage(
        "Error al registrar tu email. Por favor, intenta nuevamente."
      );
    } finally {
      setNotificationSubmitting(false);
    }
  };

  const updatePreorderQuantity = (variantId: string, delta: number) => {
    setPreorderQuantities((prev) => {
      const current = prev[variantId] ?? 0;
      const proposed = Math.max(0, current + delta);
      return { ...prev, [variantId]: proposed };
    });
  };

  const handleCheckout = async (isPreorder = false) => {
    if (!product) {
      setErrorMessage("Producto no disponible en este momento.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let breakdown;
      let totalQty;
      let totalAmount;

      if (isPreorder) {
        // Preorder checkout
        breakdown = preorderVariants
          .map((v) => ({
            colorId: v.id,
            label: v.label,
            quantity: preorderQuantities[v.id] ?? 0,
            unitPrice: price,
            subtotal: price * (preorderQuantities[v.id] ?? 0),
          }))
          .filter((i) => i.quantity > 0);
        totalQty = preorderTotalUnits;
        totalAmount = price * preorderTotalUnits;
      } else {
        // Regular checkout
        breakdown = colorOptions
          .map((c) => {
            const variant = product?.variants?.find((v) => v.id === c.id);
            const isVariantOutOfStock = variant?.batch_status === "sin_stock";
            return {
              colorId: c.id,
              label: c.label,
              quantity: isVariantOutOfStock ? 0 : colorQuantities[c.id] ?? 0,
              unitPrice: price,
              subtotal: isVariantOutOfStock
                ? 0
                : price * (colorQuantities[c.id] ?? 0),
            };
          })
          .filter((i) => i.quantity > 0);
        totalQty = totalUnits;
        totalAmount = price * totalUnits;
      }

      if (breakdown.length === 0) {
        setErrorMessage("Debes seleccionar al menos una unidad.");
        setIsSubmitting(false);
        return;
      }

      const variantForStatus = isPreorder
        ? product?.variants?.find((v) => v.id === preorderVariants[0]?.id)
        : selectedVariant;
      const estimatedDays = isPreorder
        ? variantForStatus?.estimated_preorder_delivery_days ?? 10
        : estimatedPreorderDays;

      // Determine batch status for preorder: if any variant is out of stock, use "sin_stock", otherwise "preorden"
      let preorderBatchStatus = "preorden";
      if (isPreorder) {
        const hasOutOfStockVariant = preorderVariants.some(
          (v) => v.isOutOfStock
        );
        preorderBatchStatus = hasOutOfStockVariant ? "sin_stock" : "preorden";
      }

      const data = await apiFetch<{ url?: string; isPreorder?: boolean }>(
        "/api/payments/create-preference",
        {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            quantity: totalQty,
            total: totalAmount,
            productId: product.id,
            color: isPreorder
              ? preorderVariants.find((v) => preorderQuantities[v.id] > 0)
                  ?.label ?? null
              : selectedColor?.label ?? null,
            items: breakdown,
            batchStatus: isPreorder ? preorderBatchStatus : batchStatus,
            estimatedPreorderDays: estimatedDays,
          }),
        }
      );

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Respuesta inválida del servidor");
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage(
        "No pudimos iniciar el pago. Por favor, intenta nuevamente en unos minutos."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pt-14 sm:pt-16">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl product-title">{product?.name}</h1>
          </div>
          <p className="">{"Compra segura • Envío rápido • Garantía 1 año"}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product section */}
          <div>
            {/* Product image placeholder */}
            <div className="aspect-square rounded-xl bg-secondary/30 border border-secondary/50 flex items-center justify-center mb-6 overflow-hidden">
              <img
                src={selectedColor?.imageSrc ?? "/producto.jpg"}
                alt={
                  selectedColor
                    ? `Licuadora - ${selectedColor.label}`
                    : "Licuadora"
                }
                className="w-full h-full object-contain p-6"
                loading="eager"
                fetchPriority="high"
                width="600"
                height="600"
                decoding="async"
              />
            </div>

            {/* Color selector */}
            <div className="mb-8">
              <p className=" mb-3">Colores disponibles</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {colorOptions.map((c) => {
                  const active = c.id === selectedColorId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColorId(c.id)}
                      className={`group relative rounded-lg border overflow-hidden transition 
                        ${
                          active
                            ? "border-accent ring-2 ring-accent/40"
                            : "border-secondary/60 hover:border-accent/50"
                        }`}
                      aria-pressed={active}
                      aria-label={c.label}
                    >
                      <img
                        src={c.imageSrc}
                        alt={c.label}
                        className="w-full h-16 object-cover"
                        loading="lazy"
                        decoding="async"
                        width="80"
                        height="64"
                      />
                      <span className="absolute inset-x-0 bottom-0 text-[10px] sm:text-xs text-center bg-background/60 backdrop-blur px-1 py-0.5">
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantities per color */}
            <div className="mb-8" data-quantity-section>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">Selecciona cantidades por color</p>
                {totalUnits > 0 && (
                  <span className="text-sm text-accent font-semibold">
                    {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"}{" "}
                    seleccionada{totalUnits > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {colorOptions.map((c) => {
                  const variant = product?.variants?.find((v) => v.id === c.id);
                  const variantBatchStatus =
                    variant?.batch_status ?? "disponible";
                  const isVariantOutOfStock =
                    variantBatchStatus === "sin_stock";
                  const q = colorQuantities[c.id] ?? 0;
                  const disableMinus = q <= 0 || isVariantOutOfStock;
                  const remaining =
                    stock > 0 && !isVariantOutOfStock
                      ? Math.max(0, stock - (totalUnits - q))
                      : undefined;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
                        isVariantOutOfStock
                          ? "bg-red-500/10 border-2 border-red-500/30 opacity-75"
                          : q > 0
                          ? "bg-accent/10 border-2 border-accent/30 shadow-md shadow-accent/10"
                          : "bg-secondary/20 border border-secondary/50 hover:border-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={c.imageSrc}
                          alt={c.label}
                          className={`w-10 h-10 rounded object-cover ${
                            isVariantOutOfStock ? "opacity-50 grayscale" : ""
                          }`}
                          loading="lazy"
                          decoding="async"
                          width="40"
                          height="40"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isVariantOutOfStock
                                  ? "text-muted-foreground line-through"
                                  : q > 0
                                  ? "text-foreground"
                                  : ""
                              }`}
                            >
                              {c.label}
                            </span>
                            {variantBatchStatus === "preorden" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Preventa
                              </span>
                            )}
                            {variantBatchStatus === "baja" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                Últimas
                              </span>
                            )}
                            {isVariantOutOfStock && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                                Agotado
                              </span>
                            )}
                            {!isVariantOutOfStock &&
                              variantBatchStatus === "disponible" &&
                              q > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                  ✓ Seleccionado
                                </span>
                              )}
                          </div>
                          {q > 0 && !isVariantOutOfStock && (
                            <span className="text-xs text-accent font-semibold mt-0.5">
                              {q} {q === 1 ? "unidad" : "unidades"}
                            </span>
                          )}
                        </div>
                        {typeof remaining === "number" &&
                          !isVariantOutOfStock && (
                            <span className="text-xs text-muted">
                              disp. {remaining}
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateColorQuantity(c.id, -1)}
                          disabled={disableMinus}
                          className="w-9 h-9 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span
                          className={`w-8 text-center font-semibold ${
                            isVariantOutOfStock ? "text-muted-foreground" : ""
                          }`}
                        >
                          {q}
                        </span>
                        <button
                          onClick={() => updateColorQuantity(c.id, 1)}
                          disabled={
                            isVariantOutOfStock ||
                            (typeof remaining === "number" && remaining <= 0)
                          }
                          className="w-9 h-9 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/20 border border-secondary/50">
                <Truck className="w-6 h-6 text-accent" />
                <span className="text-xs text-center font-semibold">
                  Envío Rápido
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/20 border border-secondary/50">
                <Lock className="w-6 h-6 text-accent" />
                <span className="text-xs text-center font-semibold">
                  Pago Seguro
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/20 border border-secondary/50">
                <RefreshCw className="w-6 h-6 text-accent" />
                <span className="text-xs text-center font-semibold">
                  Garantía
                </span>
              </div>
            </div>
          </div>

          {/* Details & Checkout */}
          <div>
            {!showCheckout ? (
              <>
                {/* Price */}
                <div className="mb-8">
                  <p className=" mb-2">Precio</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl product-price">
                      {price ? `$${price}` : "S/D"}
                    </span>
                  </div>
                  {batchStatus === "preorden" && (
                    <p className="text-sm text-blue-400 mt-2">
                      ⚠ Entrega diferida: {estimatedPreorderDays} días hábiles
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-8 p-6 rounded-lg bg-secondary/20 border border-secondary/50">
                  <h3 className="font-semibold mb-4">Descripción</h3>
                  <p className="text-sm  leading-relaxed">{description}</p>
                </div>

                {/* Total */}
                <div
                  className={`mb-8 p-6 rounded-lg border transition-all ${
                    totalUnits > 0
                      ? "bg-accent/10 border-accent/30 shadow-lg shadow-accent/10"
                      : "bg-secondary/20 border-secondary/50"
                  }`}
                >
                  <div className="space-y-2 mb-4 text-sm">
                    {Object.entries(colorQuantities)
                      .filter(([id, q]) => {
                        const variant = product?.variants?.find(
                          (v) => v.id === id
                        );
                        const isVariantOutOfStock =
                          variant?.batch_status === "sin_stock";
                        return (q ?? 0) > 0 && !isVariantOutOfStock;
                      })
                      .map(([id, q]) => {
                        const color = colorOptions.find((c) => c.id === id);
                        const variant = product?.variants?.find(
                          (v) => v.id === id
                        );
                        const variantStatus =
                          variant?.batch_status ?? "disponible";
                        return (
                          <div
                            key={id}
                            className="flex justify-between items-center p-2 rounded bg-secondary/30"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {color?.label ?? id} (x{q})
                              </span>
                              {variantStatus === "preorden" && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Preventa
                                </span>
                              )}
                              {variantStatus === "baja" && (
                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                  Últimas
                                </span>
                              )}
                            </div>
                            <span className="font-semibold price">
                              ${(price * (q ?? 0)).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    {totalUnits === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Selecciona cantidades arriba</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-secondary/50">
                    <span className="text-lg font-semibold">
                      Total ({totalUnits}{" "}
                      {totalUnits === 1 ? "unidad" : "unidades"}):
                    </span>
                    <span
                      className={`text-2xl product-price ${
                        totalUnits > 0 ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      ${(price * totalUnits).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons - Siempre visibles */}
                <div className="space-y-3">
                  {/* Regular purchase button - Siempre visible */}
                  {batchStatusConfig.canPurchase &&
                    batchStatus !== "preorden" &&
                    batchStatus !== "sin_stock" && (
                      <>
                        <Button
                          onClick={() => {
                            // Preparar datos de variantes seleccionadas
                            const selectedVariants = Object.entries(
                              colorQuantities
                            )
                              .filter(([id, q]) => {
                                const variant = product?.variants?.find(
                                  (v) => v.id === id
                                );
                                const isVariantOutOfStock =
                                  variant?.batch_status === "sin_stock";
                                return (q ?? 0) > 0 && !isVariantOutOfStock;
                              })
                              .map(([id, q]) => {
                                const color = colorOptions.find(
                                  (c) => c.id === id
                                );
                                const variant = product?.variants?.find(
                                  (v) => v.id === id
                                );
                                return {
                                  variantId: id,
                                  variantLabel: color?.label ?? id,
                                  quantity: q ?? 0,
                                };
                              });

                            // Redirigir a página de lanzamiento con datos de variantes
                            navigate("/launch", {
                              state: { variants: selectedVariants },
                            });
                          }}
                          className="w-full py-6 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-bold text-lg shadow-lg shadow-accent/20 transition-all hover:scale-[1.02]"
                        >
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Comprar Ahora
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          Pago 100% seguro con{" "}
                          <strong className="text-foreground">
                            MercadoPago
                          </strong>{" "}
                        </p>
                      </>
                    )}

                  {/* Preorder button - Siempre visible si hay opción de preventa */}
                  {hasPreorderVariants && batchStatus !== "sin_stock" && (
                    <>
                      {batchStatusConfig.canPurchase &&
                        batchStatus !== "preorden" && (
                          <div className="flex items-center gap-4 my-4">
                            <div className="flex-1 border-t border-border/60"></div>
                            <span className="text-xs text-muted-foreground">
                              O
                            </span>
                            <div className="flex-1 border-t border-border/60"></div>
                          </div>
                        )}
                      <Button
                        onClick={() => {
                          // Preparar datos de variantes para preventa
                          const selectedVariants = Object.entries(
                            colorQuantities
                          )
                            .filter(([id, q]) => {
                              const variant = product?.variants?.find(
                                (v) => v.id === id
                              );
                              const isVariantOutOfStock =
                                variant?.batch_status === "sin_stock";
                              return (q ?? 0) > 0 && !isVariantOutOfStock;
                            })
                            .map(([id, q]) => {
                              const color = colorOptions.find(
                                (c) => c.id === id
                              );
                              const variant = product?.variants?.find(
                                (v) => v.id === id
                              );
                              return {
                                variantId: id,
                                variantLabel: color?.label ?? id,
                                quantity: q ?? 0,
                              };
                            });

                          // Redirigir a página de lanzamiento con datos de variantes
                          navigate("/launch", {
                            state: {
                              variants: selectedVariants,
                              isPreorder: true,
                            },
                          });
                        }}
                        variant="outline"
                        className="w-full py-6 border-2 border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10 text-blue-400 rounded-lg font-bold text-lg transition-all hover:scale-[1.02]"
                      >
                        <Package className="w-5 h-5 mr-2" />
                        Encargar Pedido (Preventa)
                      </Button>
                      <p className="text-center text-xs text-blue-400 mt-2">
                        • Entrega diferida • Regístrate para acceso anticipado
                      </p>
                    </>
                  )}
                </div>

                {/* Options when out of stock - Mostrar siempre que haya variantes sin stock disponibles */}
                {outOfStockVariants.length > 0 && (
                  <div className="mt-8 space-y-6">
                    {/* Primary Option: Notification */}
                    <div className="p-6 rounded-2xl bg-linear-to-br from-blue-500/10 via-purple-500/10 to-accent/10 border-2 border-blue-500/30 shadow-lg shadow-blue-500/10 relative overflow-hidden">
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>

                      <div className="relative z-10">
                        {/* Header with icon */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                            <Bell className="w-5 h-5 text-blue-400" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground">
                            Opción 1: Avisarme cuando haya stock
                          </h3>
                        </div>

                        <p className="text-sm mb-4 text-muted-foreground leading-relaxed">
                          Seleccioná la variante que te interesa y tu email. Te
                          avisamos cuando vuelva el stock disponible.
                          <span className="block mt-1 font-semibold text-foreground">
                            Gratis • Sin compromiso
                          </span>
                        </p>

                        {/* Variant Selection - Only show if multiple variants */}
                        {outOfStockVariants.length > 1 ? (
                          <div className="mb-4">
                            <Label className="text-sm font-medium mb-2 block">
                              Variante
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {outOfStockVariants.map((variant) => (
                                <button
                                  key={variant.id}
                                  onClick={() =>
                                    setNotificationVariantId(variant.id)
                                  }
                                  className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                                    notificationVariantId === variant.id
                                      ? "border-blue-400 ring-2 ring-blue-500/30"
                                      : "border-border/60 hover:border-blue-500/50"
                                  }`}
                                >
                                  <img
                                    src={variant.imageSrc}
                                    alt={variant.label}
                                    className="w-full h-20 object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    width="120"
                                    height="80"
                                  />
                                  <div className="p-2 bg-background/80">
                                    <p className="text-xs font-semibold text-center">
                                      {variant.label}
                                    </p>
                                  </div>
                                  {notificationVariantId === variant.id && (
                                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">
                                        ✓
                                      </span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : outOfStockVariants.length === 1 ? (
                          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-3">
                              <img
                                src={outOfStockVariants[0].imageSrc}
                                alt={outOfStockVariants[0].label}
                                className="w-12 h-12 rounded-lg object-cover"
                                loading="lazy"
                                decoding="async"
                                width="48"
                                height="48"
                              />
                              <div>
                                <p className="text-sm font-semibold">
                                  {outOfStockVariants[0].label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Variante sin stock
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Quantity Selection */}
                        <div className="mb-4">
                          <Label className="text-sm font-medium mb-2 block">
                            Cantidad deseada
                          </Label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setNotificationQuantity((prev) =>
                                  Math.max(1, prev - 1)
                                )
                              }
                              disabled={notificationQuantity <= 1}
                              className="w-10 h-10 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-semibold">
                              {notificationQuantity}
                            </span>
                            <button
                              onClick={() =>
                                setNotificationQuantity((prev) => prev + 1)
                              }
                              className="w-10 h-10 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 transition-colors flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Email Input */}
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="tu@email.com"
                              value={notificationEmail}
                              onChange={(e) =>
                                setNotificationEmail(e.target.value)
                              }
                              className="pl-10 bg-background/80 border-2 border-blue-500/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  notificationEmail.trim() &&
                                  notificationVariantId
                                ) {
                                  handleNotifyMe();
                                }
                              }}
                            />
                          </div>
                          <Button
                            onClick={handleNotifyMe}
                            disabled={
                              !notificationEmail.trim() ||
                              !notificationVariantId ||
                              notificationSubmitting
                            }
                            className="px-6 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {notificationSubmitting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Bell className="w-4 h-4 mr-2" />
                                Avisar
                              </>
                            )}
                          </Button>
                        </div>

                        {notificationMessage && (
                          <div
                            className={`mt-4 p-3 rounded-lg text-sm ${
                              notificationMessage.includes("Ya estás")
                                ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"
                                : "bg-green-500/10 border border-green-500/30 text-green-300"
                            }`}
                          >
                            {notificationMessage ?? ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 border-t border-border/60"></div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        O
                      </span>
                      <div className="flex-1 border-t border-border/60"></div>
                    </div>

                    {/* Secondary Option: Preorder */}
                    <div className="p-6 rounded-2xl bg-linear-to-br from-accent/10 via-purple-500/10 to-blue-500/10 border-2 border-accent/30 shadow-lg shadow-accent/10 relative overflow-hidden">
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>

                      <div className="relative z-10">
                        {/* Header with icon */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                            <Package className="w-5 h-5 text-accent" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground">
                            Opción 2: Encargar Pedido (Preventa)
                          </h3>
                        </div>

                        <p className="text-sm mb-4 text-muted-foreground leading-relaxed">
                          Reservá tu producto ahora. Realizás el pago y te lo
                          enviamos cuando tengamos stock disponible.
                          <span className="block mt-1 font-semibold text-foreground">
                            Pago inmediato • Entrega diferida (aproximadamente{" "}
                            {estimatedPreorderDays} días hábiles)
                          </span>
                        </p>

                        <Button
                          onClick={() => setShowPreorderModal(true)}
                          className="w-full py-6 bg-linear-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-600 text-white font-bold text-lg shadow-lg shadow-accent/30 transition-all"
                        >
                          <Package className="w-5 h-5 mr-2" />
                          Encargar Ahora
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Legacy notification form when out of stock (hidden, replaced above) */}
                {false && batchStatus === "sin_stock" && (
                  <div className="mt-8 p-8 rounded-2xl bg-linear-to-br from-blue-500/10 via-purple-500/10 to-accent/10 border-2 border-blue-500/30 shadow-lg shadow-blue-500/10 relative overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                      {/* Header with icon */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <Bell className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                          Avisarme cuando haya stock
                        </h3>
                      </div>

                      <p className="text-sm mb-6 text-muted-foreground leading-relaxed">
                        Ingresá tu email y te avisamos cuando vuelva el stock
                        disponible.
                        <span className="block mt-1 font-semibold text-foreground">
                          ¡No te pierdas la próxima reposición!
                        </span>
                      </p>

                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="tu@email.com"
                            value={notificationEmail}
                            onChange={(e) =>
                              setNotificationEmail(e.target.value)
                            }
                            className="pl-10 bg-background/80 border-2 border-blue-500/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                notificationEmail.trim()
                              ) {
                                handleNotifyMe();
                              }
                            }}
                          />
                        </div>
                        <Button
                          onClick={handleNotifyMe}
                          disabled={
                            !notificationEmail.trim() || notificationSubmitting
                          }
                          className="px-6 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {notificationSubmitting ? (
                            "Enviando..."
                          ) : (
                            <>
                              <Bell className="w-4 h-4 mr-2" />
                              Notificarme
                            </>
                          )}
                        </Button>
                      </div>

                      {notificationMessage && (
                        <div
                          className={`mt-4 p-3 rounded-lg ${
                            notificationMessage?.includes("Error")
                              ? "bg-red-500/10 border border-red-500/30"
                              : "bg-green-500/10 border border-green-500/30"
                          }`}
                        >
                          <p
                            className={`text-sm font-medium ${
                              notificationMessage?.includes("Error")
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {notificationMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {publicKey ? (
                  <CheckoutFlow
                    items={Object.entries(colorQuantities)
                      .filter(([id, q]) => {
                        const variant = product?.variants?.find(
                          (v) => v.id === id
                        );
                        const isVariantOutOfStock =
                          variant?.batch_status === "sin_stock";
                        return (q ?? 0) > 0 && !isVariantOutOfStock;
                      })
                      .map(([id, q]) => {
                        const color = colorOptions.find((c) => c.id === id);
                        return {
                          colorId: id,
                          label: color?.label ?? id,
                          quantity: q ?? 0,
                          unitPrice: price,
                          subtotal: price * (q ?? 0),
                        };
                      })}
                    total={price * totalUnits}
                    productId={product?.id || ""}
                    batchStatus={batchStatus}
                    estimatedPreorderDays={estimatedPreorderDays}
                    onComplete={(orderId) => {
                      console.log("Order completed:", orderId);
                      setShowCheckout(false);
                      // Optionally redirect or show success message
                    }}
                    onCancel={() => setShowCheckout(false)}
                    publicKey={publicKey}
                  />
                ) : (
                  <div className="flex items-center justify-center p-12">
                    <p className="text-muted-foreground">
                      Cargando método de pago...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preorder Modal */}
      <Dialog open={showPreorderModal} onOpenChange={setShowPreorderModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <DialogTitle className="text-2xl">
                Encargar Pedido (Preventa)
              </DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Regístrate para acceso anticipado al primer lote y obtén un 20% de
              descuento exclusivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Info Banner */}
            <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-1">
                    ¿Qué es un encargo?
                  </h4>
                  <p className="text-sm text-blue-300 leading-relaxed"></p>
                </div>
              </div>
            </div>

            {/* Variants Selection */}
            <div>
              <h3 className="font-semibold mb-4">
                Selecciona las variantes y cantidades
              </h3>
              <div className="space-y-3">
                {preorderVariants.map((variant) => {
                  const q = preorderQuantities[variant.id] ?? 0;
                  return (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between rounded-lg bg-secondary/20 border border-secondary/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={variant.imageSrc}
                          alt={variant.label}
                          className="w-16 h-16 rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                          width="64"
                          height="64"
                        />
                        <div>
                          <p className="font-semibold">{variant.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {variant.isOutOfStock ? (
                              <span className="text-yellow-400">
                                Sin stock • Entrega cuando repongamos
                              </span>
                            ) : (
                              <>
                                Entrega estimada: {variant.estimatedDays} días
                                hábiles
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updatePreorderQuantity(variant.id, -1)}
                          disabled={q <= 0}
                          className="w-10 h-10 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-semibold">
                          {q}
                        </span>
                        <button
                          onClick={() => updatePreorderQuantity(variant.id, 1)}
                          className="w-10 h-10 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {preorderTotalUnits > 0 && (
              <div className="p-6 rounded-lg bg-secondary/20 border border-secondary/50">
                <h3 className="font-semibold mb-4">Resumen del Encargo</h3>
                <div className="space-y-2 mb-4 text-sm">
                  {preorderVariants
                    .filter((v) => (preorderQuantities[v.id] ?? 0) > 0)
                    .map((v) => {
                      const q = preorderQuantities[v.id] ?? 0;
                      return (
                        <div key={v.id} className="flex justify-between">
                          <span>
                            {v.label} (x{q})
                          </span>
                          <span className="price">
                            ${(price * q).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div className="border-t border-secondary pt-3 flex justify-between items-center text-lg font-bold">
                  <span>
                    Total ({preorderTotalUnits}{" "}
                    {preorderTotalUnits === 1 ? "unidad" : "unidades"}):
                  </span>
                  <span className="text-accent">
                    <span className="product-price">
                      ${(price * preorderTotalUnits).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Form */}
            {preorderTotalUnits > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Datos de Envío</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preorder-name" className="mb-2 block">
                      Nombre Completo *
                    </Label>
                    <Input
                      id="preorder-name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Tu nombre"
                      className="bg-secondary/30 border-secondary focus:border-accent"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preorder-email" className="mb-2 block">
                      Email *
                    </Label>
                    <Input
                      id="preorder-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@email.com"
                      className="bg-secondary/30 border-secondary focus:border-accent"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preorder-phone" className="mb-2 block">
                      Teléfono *
                    </Label>
                    <Input
                      id="preorder-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+54 9 11 XXXX-XXXX"
                      className="bg-secondary/30 border-secondary focus:border-accent"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preorder-address" className="mb-2 block">
                      Dirección *
                    </Label>
                    <Input
                      id="preorder-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Calle y número"
                      className="bg-secondary/30 border-secondary focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preorder-city" className="mb-2 block">
                        Ciudad *
                      </Label>
                      <Input
                        id="preorder-city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Tu ciudad"
                        className="bg-secondary/30 border-secondary focus:border-accent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="preorder-zipCode" className="mb-2 block">
                        Código Postal *
                      </Label>
                      <Input
                        id="preorder-zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="Código postal"
                        className="bg-secondary/30 border-secondary focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-secondary/50">
              <Button
                onClick={() => setShowPreorderModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  // Preparar datos de variantes del modal de preventa
                  const selectedVariants = preorderVariants
                    .filter((v) => (preorderQuantities[v.id] ?? 0) > 0)
                    .map((v) => ({
                      variantId: v.id,
                      variantLabel: v.label,
                      quantity: preorderQuantities[v.id] ?? 0,
                    }));

                  setShowPreorderModal(false);
                  navigate("/launch", {
                    state: { variants: selectedVariants, isPreorder: true },
                  });
                }}
                className="flex-1 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
              >
                <Package className="w-4 h-4 mr-2" />
                Continuar con el Encargo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
