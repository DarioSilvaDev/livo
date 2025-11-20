import nodemailer from "nodemailer";
import { envs } from "../config";

interface OrderItem {
  colorId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderDetails {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  zipCode: string;
  items: OrderItem[];
  total: number;
  estimatedDeliveryDays?: number;
  isPreorder: boolean;
}

// Create reusable transporter
const createTransporter = () => {
  // For development, you can use Gmail or any SMTP service
  // For production, use a service like SendGrid, Mailgun, etc.
  const transporter = nodemailer.createTransport({
    host: envs.sendEmail.host,
    port: Number(envs.sendEmail.port),
    secure: false, // true for 465, false for other ports
    auth: {
      user: envs.sendEmail.auth.user,
      pass: envs.sendEmail.auth.pass,
    },
  });

  return transporter;
};

export async function sendOrderConfirmationEmail(
  orderDetails: OrderDetails
): Promise<void> {
  try {
    const transporter = createTransporter();

    const itemsHtml = orderDetails.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          item.label
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice.toFixed(
          2
        )}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal.toFixed(
          2
        )}</td>
      </tr>
    `
      )
      .join("");

    const preorderNotice = orderDetails.isPreorder
      ? `
      <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #1976d2; margin-top: 0;">⚠️ Pedido Diferido (Preventa)</h3>
        <p style="color: #1565c0; margin-bottom: 0;">
          Tu pedido será enviado en aproximadamente <strong>${
            orderDetails.estimatedDeliveryDays || 10
          } días hábiles</strong> 
          desde la confirmación del pago. Te notificaremos cuando tu pedido esté en camino.
        </p>
      </div>
    `
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4a5568; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f7fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #edf2f7; padding: 12px; text-align: left; font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; color: #2d3748; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Confirmación de Pedido</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${orderDetails.customerName}</strong>,</p>
              <p>Gracias por tu compra. Tu pedido ha sido confirmado con el siguiente detalle:</p>
              
              ${preorderNotice}
              
              <h3>Detalle del Pedido</h3>
              <table>
                <thead>
                  <tr>
                    <th>Variante</th>
                    <th style="text-align: center;">Cantidad</th>
                    <th style="text-align: right;">Precio Unit.</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div style="text-align: right; margin-top: 20px;">
                <p class="total">Total: $${orderDetails.total.toFixed(2)}</p>
              </div>
              
              <h3>Datos de Envío</h3>
              <p>
                <strong>Dirección:</strong> ${orderDetails.address}<br>
                <strong>Ciudad:</strong> ${orderDetails.city}<br>
                <strong>Código Postal:</strong> ${orderDetails.zipCode}<br>
                <strong>Teléfono:</strong> ${orderDetails.customerPhone}
              </p>
              
              <p><strong>ID de Pedido:</strong> ${orderDetails.orderId}</p>
              
              <div class="footer">
                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
                <p>Este es un email automático, por favor no respondas a este mensaje.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: envs.sendEmail.from,
      to: orderDetails.customerEmail,
      subject: orderDetails.isPreorder
        ? `Pedido Diferido Confirmado - ${orderDetails.orderId}`
        : `Confirmación de Pedido - ${orderDetails.orderId}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `✓ Order confirmation email sent to ${orderDetails.customerEmail}`
    );
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    // Don't throw error - email failure shouldn't break the order process
  }
}

interface StockNotificationDetails {
  email: string;
  variantLabel: string;
  variantQty: number;
  shopUrl?: string;
}

export async function sendStockNotificationEmail(
  notificationDetails: StockNotificationDetails
): Promise<void> {
  try {
    const transporter = createTransporter();
    const shopUrl =
      notificationDetails.shopUrl ||
      envs.frontend.url ||
      "http://localhost:5173";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #48bb78; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f7fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .cta-button { display: inline-block; background-color: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .info-box { background-color: #e6fffa; border-left: 4px solid #48bb78; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 ¡Stock Disponible!</h1>
            </div>
            <div class="content">
              <p>¡Hola!</p>
              <p>Te escribimos para informarte que el producto que estabas esperando ya está disponible nuevamente.</p>
              
              <div class="info-box">
                <h3 style="color: #2d3748; margin-top: 0;">Producto Disponible</h3>
                <p style="margin-bottom: 0;">
                  <strong>Variante:</strong> ${
                    notificationDetails.variantLabel
                  }<br>
                  <strong>Cantidad que solicitaste:</strong> ${
                    notificationDetails.variantQty
                  } unidad${notificationDetails.variantQty > 1 ? "es" : ""}
                </p>
              </div>
              
              <p>No pierdas la oportunidad. El stock es limitado y puede agotarse pronto.</p>
              
              <div style="text-align: center;">
                <a href="${shopUrl}/shop" class="cta-button">Comprar Ahora</a>
              </div>
              
              <p>Si ya no estás interesado en este producto, puedes ignorar este mensaje.</p>
              
              <div class="footer">
                <p>Gracias por tu interés en nuestros productos.</p>
                <p>Este es un email automático, por favor no respondas a este mensaje.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: envs.sendEmail.from,
      to: notificationDetails.email,
      subject: `¡Stock Disponible - Licuadora Portátil ${notificationDetails.variantLabel}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `✓ Stock notification email sent to ${notificationDetails.email}`
    );
  } catch (error) {
    console.error("Error sending stock notification email:", error);
    // Don't throw error - email failure shouldn't break the update process
    throw error; // But we do want to know about it for retry logic
  }
}
