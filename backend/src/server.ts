import express from "express";
import cors from "cors";
import { initializeMercadoPago } from "./config/mercadopago.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import productRoutes from "./routes/products.js";
import launchRoutes from "./routes/launch.js";
import { initializeDatabase } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import { seed } from "./db/seed.js";
import { envs } from "./config/index.js";

const app = express();
const PORT = Number(envs.port);
const allowedOrigins = envs.allowedOrigins.split(",").map((url) => url.trim());

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, curl, etc.)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some(
          (allowed) => origin === allowed || origin?.startsWith(allowed)
        )
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // En producción, podrías cambiar esto a false para más seguridad
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/launch", launchRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    initializeMercadoPago();
    await initializeDatabase();
    await migrate();
    await seed();

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
