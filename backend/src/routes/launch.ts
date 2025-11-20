import express, { Request, Response } from "express";
import { pool } from "../db/index.js";

const router = express.Router();

// Register email for early access
router.post("/early-access", async (req: Request, res: Response) => {
  try {
    const { email, variants = [], isPreorder = false } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if email already exists
      const existingCheck = await client.query(
        `SELECT id FROM early_access_emails WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      let emailId: string;

      if (existingCheck.rows.length > 0) {
        emailId = existingCheck.rows[0].id;
        
        // Si el email ya existe, actualizar las variantes (eliminar las anteriores y agregar las nuevas)
        await client.query(
          `DELETE FROM early_access_variants WHERE early_access_email_id = $1`,
          [emailId]
        );
      } else {
        // Insert new email
        const result = await client.query(
          `INSERT INTO early_access_emails (email, is_preorder, created_at)
           VALUES ($1, $2, NOW())
           RETURNING id, email, created_at`,
          [email.toLowerCase().trim(), isPreorder]
        );
        emailId = result.rows[0].id;
      }

      // Insert variants if provided
      if (Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
          if (variant.variantId && variant.variantLabel && variant.quantity > 0) {
            await client.query(
              `INSERT INTO early_access_variants 
               (early_access_email_id, variant_id, variant_label, quantity, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [
                emailId,
                variant.variantId,
                variant.variantLabel,
                variant.quantity,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");

      console.log(
        `✓ Early access email registered: ${email} with ${variants.length} variants`
      );

      res.status(201).json({
        message: existingCheck.rows.length > 0
          ? "Email actualizado exitosamente"
          : "Email registrado exitosamente",
        email: email.toLowerCase().trim(),
        id: emailId,
        variantsCount: variants.length,
        alreadyExists: existingCheck.rows.length > 0,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error registering early access email:", error);
    res.status(500).json({ error: "Error registering email" });
  }
});

// Get all early access emails (for admin)
router.get("/early-access", async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const emailsResult = await client.query(
        `SELECT id, email, is_preorder, created_at 
         FROM early_access_emails 
         ORDER BY created_at DESC`
      );

      // Get variants for each email
      const emailsWithVariants = await Promise.all(
        emailsResult.rows.map(async (email) => {
          const variantsResult = await client.query(
            `SELECT variant_id, variant_label, quantity 
             FROM early_access_variants 
             WHERE early_access_email_id = $1`,
            [email.id]
          );

          return {
            ...email,
            variants: variantsResult.rows,
          };
        })
      );

      // Get variant popularity stats
      const variantStatsResult = await client.query(
        `SELECT 
           variant_id,
           variant_label,
           COUNT(*) as selection_count,
           SUM(quantity) as total_quantity
         FROM early_access_variants
         GROUP BY variant_id, variant_label
         ORDER BY selection_count DESC, total_quantity DESC`
      );

      res.json({
        count: emailsWithVariants.length,
        emails: emailsWithVariants,
        variantStats: variantStatsResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching early access emails:", error);
    res.status(500).json({ error: "Error fetching emails" });
  }
});

export default router;

