import { config } from "dotenv";
import mercadopago from "mercadopago";
import { envs } from "./envs.js";
config();
export function initializeMercadoPago() {
  console.log(
    "🚀 ~ initializeMercadoPago ~ envs.mercadopago.accessToken:",
    envs.mercadopago.accessToken
  );
  if (!envs.mercadopago.accessToken) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN is not set in environment variables"
    );
  }

  mercadopago.configurations.setAccessToken(envs.mercadopago.accessToken);

  console.log("✓ MercadoPago configured");
  return mercadopago;
}

const mercadopagoClient = initializeMercadoPago();
export default mercadopagoClient;
