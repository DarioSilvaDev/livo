import { config } from "dotenv";
config();

export const envs = {
  port: process.env.PORT || 5000,
  database: {
    url: process.env.DATABASE_URL,
  },
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
    publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || "",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:5173",
  },
  backend: {
    url: process.env.BACKEND_URL || "http://localhost:5000",
  },
  sendEmail: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || "587",
    from: process.env.EMAIL_FROM || "noreply@example.com",
    send_order_emails: process.env.SEND_ORDER_EMAILS || false,
    auth: {
      user: process.env.EMAIL_USER || "noreply@example.com",
      pass: process.env.EMAIL_PASS || "",
    },
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS || "http://localhost:5173",
};
