import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createOrder, getOrderById, updateOrderStatus } from "../db/orders.js";
import { sendOrderConfirmationEmail } from "../services/email.js";
import { pool } from "../db/index.js";
import mercadopagoClient from "../config/mercadopago.js";
import { envs } from "../config/index.js";

const router = express.Router();

// Get MercadoPago public key
router.get("/public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: envs.mercadopago.publicKey });
});

interface OrderItem {
  colorId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CheckoutRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  quantity: number;
  total: number;
  productId: string;
  items?: OrderItem[];
  batchStatus?: "disponible" | "baja" | "sin_stock" | "preorden";
  estimatedPreorderDays?: number;
}

// Create payment preference
router.post("/create-preference", async (req: Request, res: Response) => {
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
    }: CheckoutRequest = req.body;

    // Validate required fields
    if (!name || !email || !address || !quantity || !total || !productId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize phone to numeric
    const numericPhone =
      typeof phone === "string"
        ? Number(phone.replace(/\D/g, ""))
        : Number(phone);

    // Build MercadoPago items from order items
    const mpItems =
      items.length > 0
        ? items.map((item) => ({
            title: `Licuadora Portátil - ${item.label}`,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            currency_id: "ARS",
            description: `Variante: ${item.label}`,
          }))
        : [
            {
              title: "Licuadora Portátil A11 PRO",
              unit_price: total / quantity,
              quantity: quantity,
              currency_id: "ARS",
              description:
                "La licuadora portátil que te acompaña a donde vayas",
            },
          ];

    // Determine if this is a preorder (needed before creating order)
    const isPreorder =
      batchStatus === "preorden" || batchStatus === "sin_stock";

    // Generate order ID first to use as external_reference
    const orderId = uuidv4();

    // Create preference with correct structure
    const preference = await mercadopagoClient.preferences.create({
      items: mpItems,
      payer: {
        name: name,
        email: email,
        phone: {
          area_code: "54",
          number: Number.isFinite(numericPhone) ? numericPhone : undefined,
        },
        address: {
          street_name: address,
          city_name: city,
          zip_code: zipCode,
        },
      },
      back_urls: {
        success: `${envs.frontend.url}/checkout-success`,
        failure: `${envs.frontend.url}/checkout-failed`,
        pending: `${envs.frontend.url}/checkout-pendiente`,
      },
      auto_return: "approved",
      external_reference: orderId, // Use order ID to link payment with order
      notification_url: `${envs.backend.url}/api/payments/webhook`,
    });

    /**
     * Respuesta de preference.create:
     * - preference.body.id: ID de la preferencia de pago
     * - preference.body.init_point: URL para redirigir al usuario
     * - preference.body.external_reference: Referencia externa (orderId)
     *
     * Cuando se complete el pago, MercadoPago enviará una notificación al webhook
     * con información del pago que incluye:
     * - payment_id: ID del pago
     * - status: Estado del pago (approved, pending, rejected, etc.)
     * - external_reference: El orderId que enviamos
     * - merchant_order_id: ID de la orden de MercadoPago
     */

    // Save order to database using the pre-generated orderId
    // This ensures external_reference matches order.id for webhook lookup
    const order = await createOrder(
      {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: address,
        city: city,
        zipCode: zipCode,
        quantity: quantity,
        total: total,
        status: "pendiente",
        mercadopagoId: preference.body.id, // Preference ID
        isPreorder: isPreorder,
      },
      orderId // Use the pre-generated orderId
    );

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

    // Send confirmation email (especially important for preorders)
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

    console.log(
      `✓ Order created: ${order.id}, MP Preference: ${preference.body.id}${
        isPreorder ? " (PREORDER)" : ""
      }`
    );

    res.json({
      success: true,
      url: preference.body.init_point,
      orderId: order.id,
      preferenceId: preference.body.id,
      isPreorder: isPreorder,
    });
  } catch (error) {
    console.error("Error creating preference:", error);
    res.status(500).json({ error: "Error creating payment preference" });
  }
});

// Webhook for payment notifications
// IMPORTANT: Must respond within 22 seconds to confirm receipt
router.post("/webhook", async (req: Request, res: Response) => {
  // Respond immediately to confirm receipt (within 22 seconds requirement)
  res.status(200).send("OK");

  // Process notification asynchronously
  try {
    const { type, data, action, id } = req.body;

    console.log(
      `📥 Webhook received - Type: ${type}, Action: ${action}, ID: ${id}`
    );

    // Handle different notification types as per MercadoPago documentation
    switch (type) {
      case "payment": {
        // Get full payment information
        const payment = await mercadopagoClient.payment.findById(data.id);
        const paymentData = payment.body;

        console.log(
          `💳 Payment notification: ${paymentData.id} - Status: ${paymentData.status} - External Ref: ${paymentData.external_reference}`
        );

        // Find order by external_reference (which is our orderId)
        if (paymentData.external_reference) {
          const order = await getOrderById(paymentData.external_reference);

          if (order) {
            // Map MercadoPago payment status to order status
            let orderStatus: string = order.status;

            switch (paymentData.status) {
              case "approved":
                orderStatus = "confirmado";
                break;
              case "pending":
              case "in_process":
              case "in_mediation":
                orderStatus = "pendiente";
                break;
              case "rejected":
              case "cancelled":
              case "refunded":
              case "charged_back":
                orderStatus = "cancelado";
                break;
              default:
                console.log(`⚠️ Unknown payment status: ${paymentData.status}`);
            }

            // Update order status if it changed
            if (orderStatus !== order.status) {
              await updateOrderStatus(order.id, orderStatus);
              console.log(
                `✅ Order ${order.id} updated to status: ${orderStatus}`
              );
            }

            // Log payment details for debugging
            console.log(
              `📊 Payment Details - ID: ${paymentData.id}, Status: ${paymentData.status}, Amount: ${paymentData.transaction_amount}, Currency: ${paymentData.currency_id}`
            );
          } else {
            console.warn(
              `⚠️ Order not found for external_reference: ${paymentData.external_reference}`
            );
          }
        }
        break;
      }

      case "plan": {
        const plan = await mercadopagoClient.plans.get(data.id);
        console.log(`📋 Plan notification: ${plan.body.id}`);
        // Handle plan notifications if needed
        break;
      }

      case "subscription": {
        const subscription = await mercadopagoClient.subscriptions.get(data.id);
        console.log(`🔄 Subscription notification: ${subscription.body.id}`);
        // Handle subscription notifications if needed
        break;
      }

      case "invoice": {
        const invoice = await mercadopagoClient.invoices.get(data.id);
        console.log(`🧾 Invoice notification: ${invoice.body.id}`);
        // Handle invoice notifications if needed
        break;
      }

      case "point_integration_wh": {
        console.log(
          `📍 Point integration notification: ${JSON.stringify(data)}`
        );
        // Handle point integration notifications if needed
        break;
      }

      default:
        console.warn(`⚠️ Unknown notification type: ${type}`);
    }
  } catch (error) {
    // Log error but don't fail the webhook (already responded)
    console.error("❌ Error processing webhook notification:", error);
    // Optionally, you could implement retry logic or error tracking here
  }
});

// New route: Process payment directly (Bricks integration)
interface PaymentRequest {
  token: string;
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount: number;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      payer,
    }: PaymentRequest = req.body;

    // Validate required fields
    if (!token || !payment_method_id || !transaction_amount || !payer) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["token", "payment_method_id", "transaction_amount", "payer"],
      });
    }

    // Create payment using MercadoPago SDK
    const paymentData = {
      transaction_amount: transaction_amount,
      token: token,
      description: "Licuadora Portátil A11 PRO",
      installments: 1,
      payment_method_id: payment_method_id,
      issuer_id: issuer_id,
      payer: {
        email: payer.email,
        identification: {
          type: "DNI",
          number: "12345678", // You might want to collect this
        },
      },
    };

    const payment = await mercadopagoClient.payment.save(paymentData);
    const paymentResponse = payment.body;

    console.log(
      `💳 Payment created: ${paymentResponse.id} - Status: ${paymentResponse.status}`
    );

    // Return payment result
    res.json({
      status: paymentResponse.status,
      status_detail: paymentResponse.status_detail,
      paymentId: paymentResponse.id,
      transaction_amount: paymentResponse.transaction_amount,
      date_created: paymentResponse.date_created,
      payment_method_id: paymentResponse.payment_method_id,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      error: "Error processing payment",
      message: error.message,
      status: "error",
    });
  }
});

export default router;
