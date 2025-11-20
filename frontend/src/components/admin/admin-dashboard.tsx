import { useState, useEffect } from "react";
import { Edit2, Download, Plus, Eye, Bell, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "enviado"
  | "entregado"
  | "cancelado";

interface Order {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: OrderStatus;
  date: string;
}

interface ProductSummary {
  name: string;
  price: number;
  stock: number;
  description: string;
}

type ApiOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: OrderStatus;
  created_at: string;
};

type ApiProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
};

type ApiVariant = {
  id: string;
  label: string;
  image_url: string;
  stock: number;
  sort_order?: number;
  is_active?: boolean;
};

type StockNotification = {
  id: string;
  variant_id: string;
  email: string;
  variant_qty: number;
  variant_label: string;
  notified: boolean;
  created_at: string;
  notified_at: string | null;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "orders" | "product" | "stock" | "notifications"
  >("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [variants, setVariants] = useState<ApiVariant[]>([]);
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<{
    variantId?: string;
    notified?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersResponse, productResponse, variantsResponse] =
          await Promise.all([
            apiFetch<ApiOrder[]>("/api/orders"),
            apiFetch<ApiProduct>("/api/products"),
            apiFetch<ApiVariant[]>("/api/products/variants"),
          ]);

        setOrders(
          ordersResponse.map((order) => ({
            id: order.id,
            customer: order.customer_name,
            email: order.customer_email,
            total: Number(order.total ?? 0),
            status: order.status,
            date: new Date(order.created_at).toLocaleDateString("es-AR"),
          }))
        );

        setProduct({
          name: productResponse.name,
          price: Number(productResponse.price ?? 0),
          stock: Number(productResponse.stock ?? 0),
          description:
            productResponse.description ??
            "Sin descripción registrada para el producto.",
        });
        setVariants(
          (variantsResponse ?? []).sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
        );
      } catch (err) {
        console.error("Admin dashboard load error:", err);
        setError("No pudimos obtener los datos del backend.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      if (activeTab !== "notifications") return;

      try {
        const url =
          notificationFilter.variantId &&
          notificationFilter.variantId !== "all"
            ? `/api/products/stock-notifications/${notificationFilter.variantId}`
            : "/api/products/stock-notifications";
        const data = await apiFetch<StockNotification[]>(url);
        let filtered = data;

        if (notificationFilter.notified !== undefined) {
          filtered = filtered.filter(
            (n) => n.notified === notificationFilter.notified
          );
        }

        setNotifications(filtered);
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
    };

    loadNotifications();
  }, [activeTab, notificationFilter]);

  const exportToCSV = () => {
    const headers = ["ID", "Customer", "Email", "Total", "Status", "Date"];
    const rows = orders.map((order) => [
      order.id,
      order.customer,
      order.email,
      order.total,
      order.status,
      order.date,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ventas.csv";
    a.click();
  };

  const getStatusBadge = (status: Order["status"]) => {
    const colors = {
      pendiente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      confirmado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      enviado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      entregado: "bg-accent/20 text-accent border-accent/30",
      cancelado: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return colors[status];
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl product-title mb-2">Panel de Administración</h1>
          <p className="">Gestiona tu negocio desde aquí</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border/60">
          {(["orders", "product", "stock", "notifications"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold transition-colors border-b-4 ${
                  activeTab === tab
                    ? "border-accent text-accent"
                    : "border-transparent  hover:text-foreground"
                }`}
              >
                {tab === "orders" && "Pedidos"}
                {tab === "product" && "Producto"}
                {tab === "stock" && "Stock"}
                {tab === "notifications" && "Notificaciones"}
              </button>
            )
          )}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl section-title">Pedidos</h2>
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>

            <div className="rounded-lg border border-border/60 overflow-hidden bg-card/60 backdrop-blur-[1px] shadow-sm">
              {isLoading ? (
                <div className="p-8 text-center ">Cargando pedidos...</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center ">
                  No hay pedidos registrados aún.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-card/80">
                        <th className="px-6 py-4 text-left font-semibold">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Cliente
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Total
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-border/60 hover:bg-card/60 transition-colors"
                        >
                          <td className="px-6 py-4">#{order.id}</td>
                          <td className="px-6 py-4">{order.customer}</td>
                          <td className="px-6 py-4 text-sm">{order.email}</td>
                          <td className="px-6 py-4 font-semibold">
                            ${order.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{order.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="p-1 hover:bg-secondary/50 rounded transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1 hover:bg-secondary/50 rounded transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Tab */}
        {activeTab === "product" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl section-title">Producto</h2>
              <Button className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4" />
                Editar Producto
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
                <h3 className="font-semibold mb-2">Nombre</h3>
                <p className="">
                  {product?.name ?? "Licuadora Portátil Premium"}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
                <h3 className="font-semibold mb-2">Precio</h3>
                <p className="text-2xl product-price text-accent">
                  {product ? `$${product.price.toFixed(2)}` : "—"}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
                <h3 className="font-semibold mb-2">Stock Actual</h3>
                <p className="text-2xl font-bold">
                  {product ? `${product.stock} unidades` : "—"}
                </p>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
              <h3 className="font-semibold mb-4">Descripción</h3>
              <p className=" leading-relaxed">
                {product?.description ??
                  "La licuadora portátil que te acompaña a donde vayas. Motor potente, batería de larga duración, fácil de limpiar y con diseño minimalista."}
              </p>
            </div>

            {/* Variantes */}
            <div className="mt-8 p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Variantes (colores)</h3>
                <AddVariantForm
                  onCreated={(v) => setVariants((prev) => [...prev, v])}
                />
              </div>
              {variants.length === 0 ? (
                <div className="text-sm text-muted">
                  No hay variantes cargadas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-card/80">
                        <th className="px-3 py-2 text-left">Orden</th>
                        <th className="px-3 py-2 text-left">Preview</th>
                        <th className="px-3 py-2 text-left">Etiqueta</th>
                        <th className="px-3 py-2 text-left">Imagen</th>
                        <th className="px-3 py-2 text-left">Stock</th>
                        <th className="px-3 py-2 text-left">Activa</th>
                        <th className="px-3 py-2 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <VariantRow
                          key={v.id}
                          variant={v}
                          onUpdated={(nv) =>
                            setVariants((prev) =>
                              prev.map((x) => (x.id === nv.id ? nv : x))
                            )
                          }
                          onDeleted={(id) =>
                            setVariants((prev) =>
                              prev.filter((x) => x.id !== id)
                            )
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === "stock" && (
          <div>
            <h2 className="text-2xl section-title mb-6">Gestión de Stock</h2>

            <div className="p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Stock Actual</h3>
                  <div className="text-4xl font-bold text-accent mb-4">127</div>
                  <p className="text-sm ">Unidades disponibles en inventario</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Información</h3>
                  <ul className="space-y-3 text-sm ">
                    <li className="flex justify-between">
                      <span>Unidades vendidas (mes):</span>
                      <span className="font-semibold text-foreground">34</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Unidades restantes:</span>
                      <span className="font-semibold text-foreground">127</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Rotación (días):</span>
                      <span className="font-semibold text-foreground">
                        ~3.7
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/60">
                <h4 className="font-semibold mb-4">Actualizar Stock</h4>
                <div className="flex gap-4">
                  <input
                    type="number"
                    placeholder="Ingresa cantidad"
                    defaultValue="127"
                    className="flex-1 px-4 py-2 rounded-lg bg-background border border-border/60 focus:border-accent outline-none transition-colors"
                  />
                  <Button className="bg-accent hover:bg-accent/90">
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl section-title">Notificaciones de Stock</h2>
            </div>

            {/* Filters */}
            <div className="mb-6 p-4 rounded-lg bg-card/70 border border-border/60 shadow-sm">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">
                    Filtrar por Variante
                  </label>
                  <select
                    value={notificationFilter.variantId || "all"}
                    onChange={(e) =>
                      setNotificationFilter({
                        ...notificationFilter,
                        variantId:
                          e.target.value === "all" ? undefined : e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border/60 focus:border-accent outline-none transition-colors"
                  >
                    <option value="all">Todas las variantes</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">
                    Filtrar por Estado
                  </label>
                  <select
                    value={
                      notificationFilter.notified === undefined
                        ? "all"
                        : notificationFilter.notified
                        ? "sent"
                        : "pending"
                    }
                    onChange={(e) =>
                      setNotificationFilter({
                        ...notificationFilter,
                        notified:
                          e.target.value === "all"
                            ? undefined
                            : e.target.value === "sent",
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border/60 focus:border-accent outline-none transition-colors"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendientes</option>
                    <option value="sent">Enviadas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications Table */}
            <div className="p-6 rounded-lg bg-card/70 border border-border/60 shadow-sm">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No hay notificaciones registradas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-card/80">
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Variante</th>
                        <th className="px-3 py-2 text-left">Cantidad</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Fecha Registro</th>
                        <th className="px-3 py-2 text-left">Fecha Envío</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map((notification) => (
                        <tr
                          key={notification.id}
                          className="border-b border-border/40 hover:bg-card/50 transition-colors"
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{notification.email}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {notification.variant_label}
                          </td>
                          <td className="px-3 py-3">
                            {notification.variant_qty} unidad
                            {notification.variant_qty > 1 ? "es" : ""}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                                notification.notified
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }`}
                            >
                              {notification.notified ? "Enviada" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {new Date(notification.created_at).toLocaleDateString(
                              "es-AR",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {notification.notified_at
                              ? new Date(
                                  notification.notified_at
                                ).toLocaleDateString("es-AR", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function AddVariantForm({ onCreated }: { onCreated: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [image, setImage] = useState("");
  const [stock, setStock] = useState<number>(0);
  const [order, setOrder] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!label || !image) return;
    setLoading(true);
    try {
      const v = await apiFetch<any>("/api/products/variants", {
        method: "POST",
        body: JSON.stringify({
          label,
          image_url: image,
          stock,
          sort_order: order,
          is_active: true,
        }),
      });
      onCreated(v);
      setOpen(false);
      setLabel("");
      setImage("");
      setStock(0);
      setOrder(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          className="bg-accent hover:bg-accent/90"
        >
          Agregar Variante
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Etiqueta"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="px-3 py-2 rounded bg-background border border-border/60"
          />
          <input
            placeholder="Imagen (ruta pública)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="px-3 py-2 rounded bg-background border border-border/60"
          />
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="w-28 px-3 py-2 rounded bg-background border border-border/60"
          />
          <input
            type="number"
            placeholder="Orden"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-28 px-3 py-2 rounded bg-background border border-border/60"
          />
          <Button
            disabled={loading}
            onClick={submit}
            className="bg-accent hover:bg-accent/90"
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

function VariantRow({
  variant,
  onUpdated,
  onDeleted,
}: {
  variant: any;
  onUpdated: (v: any) => void;
  onDeleted: (id: string) => void;
}) {
  const [local, setLocal] = useState(variant);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch<any>(
        `/api/products/variants/${local.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            label: local.label,
            image_url: local.image_url,
            stock: Number(local.stock ?? 0),
            sort_order: Number(local.sort_order ?? 0),
            is_active: Boolean(local.is_active ?? true),
          }),
        }
      );
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/products/variants/${local.id}`, {
        method: "DELETE",
      });
      onDeleted(local.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-2">
        <input
          type="number"
          value={local.sort_order ?? 0}
          onChange={(e) =>
            setLocal({ ...local, sort_order: Number(e.target.value) })
          }
          className="w-20 px-2 py-1 rounded bg-background border border-border/60"
        />
      </td>
      <td className="px-3 py-2">
        <img
          src={local.image_url}
          alt={local.label}
          className="w-12 h-12 object-cover rounded"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={local.label}
          onChange={(e) => setLocal({ ...local, label: e.target.value })}
          className="px-2 py-1 rounded bg-background border border-border/60"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={local.image_url}
          onChange={(e) => setLocal({ ...local, image_url: e.target.value })}
          className="w-64 px-2 py-1 rounded bg-background border border-border/60"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={local.stock ?? 0}
          onChange={(e) =>
            setLocal({ ...local, stock: Number(e.target.value) })
          }
          className="w-24 px-2 py-1 rounded bg-background border border-border/60"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={Boolean(local.is_active)}
          onChange={(e) => setLocal({ ...local, is_active: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-accent hover:bg-accent/90"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button onClick={remove} disabled={deleting} variant="outline">
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
