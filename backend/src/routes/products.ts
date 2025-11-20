import express, { Request, Response } from "express";
import {
  getProduct,
  updateProduct,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  updateProductBatchStatus,
  createStockNotification,
  getStockNotifications,
} from "../db/products.js";

const router = express.Router();

// Get product details
router.get("/", async (req: Request, res: Response) => {
  try {
    const product = await getProduct();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Error fetching product" });
  }
});

// Update product
router.patch("/", async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock } = req.body;

    const product = await updateProduct({
      name,
      description,
      price,
      stock,
    });

    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error updating product" });
  }
});

// Variants list
router.get("/variants", async (req: Request, res: Response) => {
  try {
    const product = await getProduct();
    if (!product) return res.status(404).json({ error: "Product not found" });
    const variants = await getProductVariants(product.id);
    res.json(variants);
  } catch (error) {
    console.error("Error fetching variants:", error);
    res.status(500).json({ error: "Error fetching variants" });
  }
});

// Create variant
router.post("/variants", async (req: Request, res: Response) => {
  try {
    const product = await getProduct();
    if (!product) return res.status(404).json({ error: "Product not found" });
    const {
      label,
      image_url,
      stock = 0,
      sort_order = 0,
      is_active = true,
      batch_status = "disponible",
      estimated_restock_days = 10,
      estimated_preorder_delivery_days = 10,
    } = req.body;
    if (!label || !image_url) {
      return res
        .status(400)
        .json({ error: "label and image_url are required" });
    }
    const variant = await createProductVariant(product.id, {
      label,
      image_url,
      stock,
      sort_order,
      is_active,
      batch_status,
      estimated_restock_days,
      estimated_preorder_delivery_days,
    });
    res.status(201).json(variant);
  } catch (error) {
    console.error("Error creating variant:", error);
    res.status(500).json({ error: "Error creating variant" });
  }
});

// Update variant
router.patch("/variants/:variantId", async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;
    const variant = await updateProductVariant(variantId, req.body);
    res.json(variant);
  } catch (error) {
    console.error("Error updating variant:", error);
    res.status(500).json({ error: "Error updating variant" });
  }
});

// Delete variant
router.delete("/variants/:variantId", async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;
    await deleteProductVariant(variantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting variant:", error);
    res.status(500).json({ error: "Error deleting variant" });
  }
});

// Update batch status
router.patch("/batch-status", async (req: Request, res: Response) => {
  try {
    const {
      batch_status,
      estimated_restock_days,
      estimated_preorder_delivery_days,
    } = req.body;

    if (!batch_status) {
      return res.status(400).json({ error: "batch_status is required" });
    }

    const product = await updateProductBatchStatus(
      batch_status,
      estimated_restock_days,
      estimated_preorder_delivery_days
    );

    res.json(product);
  } catch (error) {
    console.error("Error updating batch status:", error);
    res.status(500).json({ error: "Error updating batch status" });
  }
});

// Notify when restocked
router.post("/notify-when-restocked", async (req: Request, res: Response) => {
  try {
    const { email, variantId, variantQty, variantLabel } = req.body;

    if (!email || !variantId) {
      return res
        .status(400)
        .json({ error: "email and variantId are required" });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const notification = await createStockNotification(
      variantId,
      email,
      variantQty ?? 1,
      variantLabel ?? "Producto"
    );

    if (!notification) {
      return res.status(200).json({
        message:
          "Ya estás registrado para recibir notificaciones de este producto",
        alreadyExists: true,
      });
    }

    res.status(201).json({
      message:
        "Te notificaremos cuando haya stock disponible para este producto",
      notification,
    });
  } catch (error) {
    console.error("Error creating stock notification:", error);
    res.status(500).json({ error: "Error creating stock notification" });
  }
});

// Get stock notifications (for admin)
router.get("/stock-notifications", async (req: Request, res: Response) => {
  try {
    const { variantId } = req.query;
    const notifications = await getStockNotifications(
      variantId as string | undefined
    );
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching stock notifications:", error);
    res.status(500).json({ error: "Error fetching stock notifications" });
  }
});

// Get stock notifications for a specific variant
router.get(
  "/stock-notifications/:variantId",
  async (req: Request, res: Response) => {
    try {
      const { variantId } = req.params;
      const notifications = await getStockNotifications(variantId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching stock notifications:", error);
      res.status(500).json({ error: "Error fetching stock notifications" });
    }
  }
);

export default router;
