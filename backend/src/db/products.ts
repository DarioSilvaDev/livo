import { runQuery } from "./index.js";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  batch_status?: "disponible" | "baja" | "sin_stock" | "preorden";
  estimated_restock_days?: number;
  estimated_preorder_delivery_days?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  product_id?: string;
  label: string;
  batch_status: "disponible" | "baja" | "sin_stock" | "preorden";
  estimated_restock_days: number;
  estimated_preorder_delivery_days: number;
  image_url: string;
  stock: number;
  sort_order: number;
  is_active: boolean;
}

export async function getProduct() {
  const query = `
    SELECT 
      p.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', v.id,
            'label', v.label,
            'image_url', v.image_url,
            'stock', v.stock,
            'sort_order', v.sort_order,
            'batch_status', v.batch_status,
            'is_active', v.is_active
          ) ORDER BY v.sort_order ASC
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'
      ) AS variants
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = TRUE
    GROUP BY p.id
    LIMIT 1
  `;
  const result = await runQuery(query);
  return result[0];
}

export async function getProductVariants(productId: string) {
  const query = `
    SELECT id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active
    FROM product_variants
    WHERE product_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `;
  return runQuery(query, [productId]);
}

export async function createProductVariant(
  productId: string,
  payload: Pick<
    ProductVariant,
    | "label"
    | "batch_status"
    | "estimated_restock_days"
    | "estimated_preorder_delivery_days"
    | "image_url"
    | "stock"
    | "sort_order"
    | "is_active"
  >
) {
  const query = `
    INSERT INTO product_variants (product_id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active
  `;
  const result = await runQuery(query, [
    productId,
    payload.label,
    payload.batch_status,
    payload.estimated_restock_days,
    payload.estimated_preorder_delivery_days,
    payload.image_url,
    payload.stock ?? 0,
    payload.sort_order ?? 0,
    payload.is_active ?? true,
  ]);

  // Recalculate product stock after creating variant
  await recalculateProductStock(productId);

  return result[0];
}

export async function updateProductVariant(
  variantId: string,
  payload: Partial<ProductVariant>
) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (payload.label !== undefined) {
    fields.push(`label = $${i++}`);
    values.push(payload.label);
  }
  if (payload.batch_status !== undefined) {
    fields.push(`batch_status = $${i++}`);
    values.push(payload.batch_status);
  }
  if (payload.estimated_restock_days !== undefined) {
    fields.push(`estimated_restock_days = $${i++}`);
    values.push(payload.estimated_restock_days);
  }
  if (payload.estimated_preorder_delivery_days !== undefined) {
    fields.push(`estimated_preorder_delivery_days = $${i++}`);
    values.push(payload.estimated_preorder_delivery_days);
  }
  if (payload.image_url !== undefined) {
    fields.push(`image_url = $${i++}`);
    values.push(payload.image_url);
  }
  if (payload.stock !== undefined) {
    fields.push(`stock = $${i++}`);
    values.push(payload.stock);
  }
  if (payload.sort_order !== undefined) {
    fields.push(`sort_order = $${i++}`);
    values.push(payload.sort_order);
  }
  if (payload.is_active !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(payload.is_active);
  }
  if (fields.length === 0) {
    const q = `SELECT id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active FROM product_variants WHERE id = $1`;
    const r = await runQuery(q, [variantId]);
    return r[0];
  }

  // Get current state before updating (for stock notification detection)
  const getCurrentStateQuery = `SELECT batch_status, stock FROM product_variants WHERE id = $1`;
  const currentStateResult = await runQuery(getCurrentStateQuery, [variantId]);
  const currentState = currentStateResult[0];
  const previousBatchStatus = currentState?.batch_status;
  const previousStock = currentState?.stock ?? 0;

  // Get product_id before updating
  const getProductIdQuery = `SELECT product_id FROM product_variants WHERE id = $1`;
  const productIdResult = await runQuery(getProductIdQuery, [variantId]);
  const productId = productIdResult[0]?.product_id;

  const query = `
    UPDATE product_variants
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${i}
    RETURNING id, label, batch_status, estimated_restock_days, estimated_preorder_delivery_days, image_url, stock, sort_order, is_active
  `;
  const result = await runQuery(query, [...values, variantId]);
  const updatedVariant = result[0];

  // Recalculate product stock after updating variant (if stock or is_active changed)
  if (
    productId &&
    (payload.stock !== undefined || payload.is_active !== undefined)
  ) {
    await recalculateProductStock(productId);
  }

  // Check if we need to send stock notifications
  const newBatchStatus = updatedVariant?.batch_status;
  const newStock = updatedVariant?.stock ?? 0;

  // Detect if stock became available
  const stockBecameAvailable =
    (previousBatchStatus === "sin_stock" &&
      (newBatchStatus === "disponible" || newBatchStatus === "baja")) ||
    (previousStock === 0 && newStock > 0);

  // Send notifications if stock became available
  if (stockBecameAvailable) {
    try {
      // Import here to avoid circular dependencies
      const { sendStockNotificationEmail } = await import("../services/email.js");

      const pendingNotifications = await getPendingStockNotifications(variantId);

      if (pendingNotifications.length > 0) {
        console.log(
          `📧 Found ${pendingNotifications.length} pending notifications for variant ${variantId}, sending emails...`
        );

        // Send emails in parallel but mark individually
        const emailPromises = pendingNotifications.map(async (notification) => {
          try {
            await sendStockNotificationEmail({
              email: notification.email,
              variantLabel: notification.variant_label,
              variantQty: notification.variant_qty,
            });
            await markNotificationAsSent(notification.id);
            console.log(
              `✓ Notification sent and marked for ${notification.email}`
            );
          } catch (error) {
            console.error(
              `✗ Failed to send notification to ${notification.email}:`,
              error
            );
            // Don't mark as sent if email failed
          }
        });

        await Promise.allSettled(emailPromises);
        console.log(
          `✓ Finished processing ${pendingNotifications.length} stock notifications`
        );
      }
    } catch (error) {
      console.error(
        "Error processing stock notifications (non-blocking):",
        error
      );
      // Don't throw - notification failure shouldn't break variant update
    }
  }

  return updatedVariant;
}

export async function deleteProductVariant(variantId: string) {
  // Get product_id before deleting
  const getProductIdQuery = `SELECT product_id FROM product_variants WHERE id = $1`;
  const productIdResult = await runQuery(getProductIdQuery, [variantId]);
  const productId = productIdResult[0]?.product_id;

  const query = `DELETE FROM product_variants WHERE id = $1`;
  await runQuery(query, [variantId]);

  // Recalculate product stock after deleting variant
  if (productId) {
    await recalculateProductStock(productId);
  }

  return { success: true };
}

export async function updateProduct(data: Partial<Product>) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (data.name) {
    fields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.description) {
    fields.push(`description = $${paramCount++}`);
    values.push(data.description);
  }
  if (data.price) {
    fields.push(`price = $${paramCount++}`);
    values.push(data.price);
  }
  if (data.stock !== undefined) {
    fields.push(`stock = $${paramCount++}`);
    values.push(data.stock);
  }

  fields.push(`updated_at = NOW()`);

  const query = `
    UPDATE products 
    SET ${fields.join(", ")}
    WHERE id = (SELECT id FROM products LIMIT 1)
    RETURNING *
  `;

  const result = await runQuery(query, values);
  return result[0];
}

export async function recalculateProductStock(productId: string) {
  // Calculate total stock from all active variants
  const query = `
    UPDATE products 
    SET stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = $1 AND is_active = TRUE
    ),
    updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await runQuery(query, [productId]);
  return result[0];
}

export async function decrementStock(quantity: number) {
  const query = `
    UPDATE products 
    SET stock = stock - $1, updated_at = NOW()
    WHERE id = (SELECT id FROM products LIMIT 1)
    RETURNING *
  `;

  const result = await runQuery(query, [quantity]);
  return result[0];
}

export async function updateProductBatchStatus(
  batchStatus: "disponible" | "baja" | "sin_stock" | "preorden",
  estimatedRestockDays?: number,
  estimatedPreorderDeliveryDays?: number
) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  fields.push(`batch_status = $${i++}`);
  values.push(batchStatus);

  if (estimatedRestockDays !== undefined) {
    fields.push(`estimated_restock_days = $${i++}`);
    values.push(estimatedRestockDays);
  }

  if (estimatedPreorderDeliveryDays !== undefined) {
    fields.push(`estimated_preorder_delivery_days = $${i++}`);
    values.push(estimatedPreorderDeliveryDays);
  }

  fields.push(`updated_at = NOW()`);

  const query = `
    UPDATE products 
    SET ${fields.join(", ")}
    WHERE id = (SELECT id FROM products LIMIT 1)
    RETURNING *
  `;

  const result = await runQuery(query, values);
  return result[0];
}

export async function createStockNotification(
  variantId: string,
  email: string,
  variantQty: number,
  variantLabel: string
) {
  const query = `
    INSERT INTO stock_notifications (variant_id, email, variant_qty, variant_label)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (variant_id, email) DO NOTHING
    RETURNING id, variant_id, email, variant_qty, variant_label, notified, created_at
  `;
  const result = await runQuery(query, [
    variantId,
    email,
    variantQty,
    variantLabel,
  ]);
  return result[0] || null; // Returns null if already exists (ON CONFLICT)
}

export async function getStockNotifications(variantId?: string) {
  if (variantId) {
    const query = `
      SELECT id, variant_id, email, variant_qty, variant_label, notified, created_at, notified_at
      FROM stock_notifications
      WHERE variant_id = $1
      ORDER BY created_at DESC
    `;
    return runQuery(query, [variantId]);
  }
  const query = `
    SELECT id, variant_id, email, variant_qty, variant_label, notified, created_at, notified_at
    FROM stock_notifications
    ORDER BY created_at DESC
  `;
  return runQuery(query);
}

export async function markNotificationAsSent(notificationId: string) {
  const query = `
    UPDATE stock_notifications
    SET notified = TRUE, notified_at = NOW()
    WHERE id = $1
    RETURNING id, variant_id, email, variant_qty, variant_label, notified, created_at, notified_at
  `;
  const result = await runQuery(query, [notificationId]);
  return result[0];
}

export async function getPendingStockNotifications(variantId: string) {
  const query = `
    SELECT id, variant_id, email, variant_qty, variant_label, notified, created_at, notified_at
    FROM stock_notifications
    WHERE variant_id = $1 AND notified = FALSE
    ORDER BY created_at ASC
  `;
  return runQuery(query, [variantId]);
}
