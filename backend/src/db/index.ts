import pkg from "pg";
import dotenv from "dotenv";
import { envs } from "../config/index.js";

dotenv.config();

const { Pool } = pkg;

console.log("🚀 ~ envs.database.url:", envs.database.url);
export const pool = new Pool({
  connectionString: envs.database.url,
});

pool.on("error", (err: any) => {
  console.error("Pool error:", err);
});

export async function initializeDatabase() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✓ Database connected:", result.rows[0]);
  } catch (error) {
    console.error("✗ Database connection error:", error);
    process.exit(1);
  }
}

export async function runQuery(query: string, params?: any[]) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}
