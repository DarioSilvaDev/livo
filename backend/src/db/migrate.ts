import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./index.js";

export async function migrate() {
  console.log("🚀 ~ migrate ~ migrate: starting migration");
  const client = await pool.connect();

  try {
    console.log("Starting database migration...");

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Product variants (color/image per product)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        label VARCHAR(120) NOT NULL,            -- e.g. "Negro y Verde"
        batch_status VARCHAR(50) DEFAULT 'disponible',
        estimated_restock_days INTEGER DEFAULT 10,
        estimated_preorder_delivery_days INTEGER DEFAULT 10,
        image_url VARCHAR(512) NOT NULL,        -- path served by frontend (e.g. /white.jpeg)
        stock INTEGER NOT NULL DEFAULT 5,       -- stock per variant (optional, can mirror product stock)
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        mercadopago_id VARCHAR(255),
        is_preorder BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add is_preorder column to existing orders table if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'is_preorder'
        ) THEN
          ALTER TABLE orders ADD COLUMN is_preorder BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Order items to store color breakdown
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        label VARCHAR(120),                      -- denormalized for quick reads
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_orders_mercadopago ON orders(mercadopago_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)"
    );

    // Stock notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        variant_qty INTEGER NOT NULL,
        variant_label VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL,
        notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        notified_at TIMESTAMP,
        UNIQUE(variant_id, email)
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_notifications_variant ON stock_notifications(variant_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_stock_notifications_email ON stock_notifications(email)"
    );

    // Early access emails table for launch validation
    await client.query(`
      CREATE TABLE IF NOT EXISTS early_access_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        is_preorder BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_early_access_emails_email ON early_access_emails(email)"
    );

    // Early access variants table to track which variants users selected
    await client.query(`
      CREATE TABLE IF NOT EXISTS early_access_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        early_access_email_id UUID NOT NULL REFERENCES early_access_emails(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
        variant_label VARCHAR(120) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_early_access_variants_email ON early_access_variants(early_access_email_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_early_access_variants_variant ON early_access_variants(variant_id)"
    );

    console.log("✓ Migration completed successfully");
  } catch (error) {
    console.error("✗ Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}

const isCliEntry =
  process.argv[1] &&
  path.normalize(process.argv[1]) ===
    path.normalize(fileURLToPath(import.meta.url));

if (isCliEntry) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
