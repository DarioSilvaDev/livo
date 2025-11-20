import { pool, runQuery } from "./index.js";
import { v4 as uuidv4 } from "uuid";

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  zipCode: string;
  quantity: number;
  total: number;
  status: "pendiente" | "confirmado" | "enviado" | "delivered" | "cancelado";
  mercadopagoId?: string;
  isPreorder?: boolean;
  createdAt: Date;
}

export async function createOrder(
  orderData: Omit<Order, "id" | "createdAt">,
  orderId?: string
) {
  const id = orderId || uuidv4();
  const query = `
    INSERT INTO orders (
      id, customer_name, customer_email, customer_phone,
      address, city, zip_code, quantity, total, status,
      mercadopago_id, is_preorder, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    RETURNING *
  `;

  const result = await runQuery(query, [
    id,
    orderData.customerName,
    orderData.customerEmail,
    orderData.customerPhone,
    orderData.address,
    orderData.city,
    orderData.zipCode,
    orderData.quantity,
    orderData.total,
    orderData.status,
    orderData.mercadopagoId,
    orderData.isPreorder ?? false,
  ]);

  return result[0];
}

export async function getOrders() {
  const query = "SELECT * FROM orders ORDER BY created_at DESC";
  return runQuery(query);
}

export async function getOrderById(id: string) {
  const query = "SELECT * FROM orders WHERE id = $1";
  const result = await runQuery(query, [id]);
  return result[0];
}

export async function updateOrderStatus(id: string, status: string) {
  const query = "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *";
  const result = await runQuery(query, [status, id]);
  return result[0];
}

export async function getOrderByMercadopagoId(mercadopagoId: string) {
  const query = "SELECT * FROM orders WHERE mercadopago_id = $1";
  const result = await runQuery(query, [mercadopagoId]);
  return result[0];
}
