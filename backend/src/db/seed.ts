import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./index.js";

export async function seed() {
  const client = await pool.connect();

  try {
    console.log("Starting database seeding...");

    // Seed product
    const productInsert = await client.query(`
      INSERT INTO products (name, description, price, stock)
      VALUES ('Licuadora Portátil A11 PRO', 'Licuadora portátil. Potencia 240W | Capacidad 700ml | Material Tritan | Voltaje 12v | Carga 5V/2A | Bateria 2000mAh *3 | Velocidad motor 18000 RPM | Tiempo carga 4hs.', 75000, 30)
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    console.log("🚀 ~ seed ~ productInsert:", productInsert);
    // If ON CONFLICT did nothing, fetch existing id
    const productRow =
      productInsert.rows?.[0] ??
      (
        await client.query(
          "SELECT id FROM products ORDER BY created_at ASC LIMIT 1"
        )
      ).rows?.[0];
    console.log("🚀 ~ seed ~ productRow:", productRow);
    const productId = productRow?.id;
    console.log("🚀 ~ seed ~ productId:", productId);

    if (productId) {
      // Upsert variants
      const variants = [
        { label: "Negro", image_url: "/black.jpeg", stock: 6, sort_order: 1 },
        {
          label: "Negro y Verde",
          image_url: "/black&green.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 2,
        },
        {
          label: "Negro y Gris",
          image_url: "/black&grey.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 3,
        },
        {
          label: "Blanco y Gris",
          image_url: "/white&grey.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 4,
        },
        {
          label: "Blanco y Verde",
          image_url: "/white&green.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 5,
        },
        {
          label: "Amarillo y Azul",
          image_url: "/yellow&blue.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 6,
        },
        {
          label: "Blanco",
          image_url: "/white.jpeg",
          estimated_restock_days: 10,
          estimated_preorder_delivery_days: 10,
          batch_status: "disponible",
          stock: 6,
          sort_order: 7,
        },
      ];

      for (const v of variants) {
        const variantInsert = await client.query(
          `
          INSERT INTO product_variants (product_id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
          ON CONFLICT DO NOTHING
        `,
          [
            productId,
            v.label,
            v.batch_status ?? "disponible",
            v.estimated_restock_days ?? 10,
            v.estimated_preorder_delivery_days ?? 10,
            v.image_url,
            v.stock,
            v.sort_order,
          ]
        );
        console.log("🚀 ~ seed ~ variantInsert:", variantInsert);
        const variantRow =
          variantInsert.rows?.[0] ??
          (
            await client.query(
              "SELECT id FROM product_variants ORDER BY created_at ASC LIMIT 1"
            )
          ).rows?.[0];
        console.log("🚀 ~ seed ~ variantRow:", variantRow);
      }

      // Recalculate product stock from all variants
      if (productId) {
        await client.query(
          `
          UPDATE products 
          SET stock = (
            SELECT COALESCE(SUM(stock), 0)
            FROM product_variants
            WHERE product_id = $1 AND is_active = TRUE
          )
          WHERE id = $1
        `,
          [productId]
        );
      }
    }

    console.log("✓ Seeding completed successfully");
  } catch (error) {
    console.error("✗ Seeding error:", error);
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
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
