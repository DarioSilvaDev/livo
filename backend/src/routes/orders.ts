import express, { Request, Response } from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  createOrder,
} from "../db/orders.js";
import { pool } from "../db/index.js";
import { sendOrderConfirmationEmail } from "../services/email.js";
import { envs } from "../config/envs.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Get all orders
router.get("/", async (req: Request, res: Response) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// Get order by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Error fetching order" });
  }
});

// Update order status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      ![
        "pendiente",
        "confirmado",
        "enviado",
        "delivered",
        "cancelado",
      ].includes(status)
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await updateOrderStatus(id, status);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Error updating order" });
  }
});

// Create new order
interface CreateOrderRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  quantity: number;
  total: number;
  productId: string;
  items?: Array<{
    colorId: string;
    label: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  batchStatus?: "disponible" | "baja" | "sin_stock" | "preorden";
  estimatedPreorderDays?: number;
  paymentId?: string;
  paymentStatus?: string;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      zipCode,
      quantity,
      total,
      productId,
      items = [],
      batchStatus,
      estimatedPreorderDays,
      paymentId,
      paymentStatus,
    }: CreateOrderRequest = req.body;

    // Validate required fields
    if (!name || !email || !address || !quantity || !total || !productId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const isPreorder =
      batchStatus === "preorden" || batchStatus === "sin_stock";

    // Determine order status based on payment status
    let orderStatus = "pendiente";
    if (paymentStatus === "approved") {
      orderStatus = "confirmado";
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      orderStatus = "cancelado";
    }

    // Create order
    const order = await createOrder({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      address: address,
      city: city,
      zipCode: zipCode,
      quantity: quantity,
      total: total,
      status: orderStatus as any,
      mercadopagoId: paymentId,
      isPreorder: isPreorder,
    });

    // Save order items if provided
    if (items.length > 0) {
      const client = await pool.connect();
      try {
        for (const item of items) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, variant_id, label, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              order.id,
              productId,
              item.colorId,
              item.label,
              item.quantity,
              item.unitPrice,
              item.subtotal,
            ]
          );
        }
      } finally {
        client.release();
      }
    }

    // Send confirmation email
    if (isPreorder || envs.sendEmail.send_order_emails) {
      await sendOrderConfirmationEmail({
        orderId: order.id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: address,
        city: city,
        zipCode: zipCode,
        items:
          items.length > 0
            ? items
            : [
                {
                  colorId: "",
                  label: "Licuadora Portátil Premium",
                  quantity: quantity,
                  unitPrice: total / quantity,
                  subtotal: total,
                },
              ],
        total: total,
        estimatedDeliveryDays: estimatedPreorderDays,
        isPreorder: isPreorder,
      });
    }

    console.log(`✓ Order created: ${order.id}, Payment: ${paymentId || "N/A"}`);

    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Error creating order" });
  }
});

export default router;
