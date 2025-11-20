#!/usr/bin/env node

import localtunnel from "localtunnel";

const ports = {
  frontend: 5173,
  backend: 5000,
};

const tunnels = {};

async function createTunnel(name, port) {
  try {
    const tunnel = await localtunnel({ port, subdomain: undefined });

    console.log(`\n✅ ${name.toUpperCase()} Túnel creado:`);
    console.log(`   URL pública: ${tunnel.url}`);
    console.log(`   Puerto local: ${port}`);

    tunnels[name] = tunnel;

    tunnel.on("close", () => {
      console.log(`\n⚠️  Túnel ${name} cerrado`);
    });

    return tunnel.url;
  } catch (error) {
    console.error(`\n❌ Error creando túnel para ${name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Iniciando túneles...\n");
  console.log("⚠️  Asegúrate de que los servidores estén corriendo:");
  console.log("   - Frontend: npm run dev:frontend");
  console.log("   - Backend: npm run dev:backend\n");

  const frontendUrl = await createTunnel("frontend", ports.frontend);
  const backendUrl = await createTunnel("backend", ports.backend);

  if (frontendUrl && backendUrl) {
    console.log("\n" + "=".repeat(60));
    console.log("📋 URLs PARA COMPARTIR:");
    console.log("=".repeat(60));
    console.log(`\n🌐 FRONTEND (Acceso directo):`);
    console.log(`   ${frontendUrl}`);
    console.log(
      `   ⚠️  IMPORTANTE: Accede a la URL completa sin agregar /web o rutas adicionales`
    );
    console.log(`\n🔧 BACKEND API:`);
    console.log(`   ${backendUrl}`);
    console.log("\n" + "=".repeat(60));
    console.log("💡 CONFIGURACIÓN DEL BACKEND:");
    console.log("=".repeat(60));
    console.log(`\nActualiza FRONTEND_URL en tu .env del backend con:`);
    console.log(`   FRONTEND_URL=${frontendUrl}`);
    console.log(`\nLuego reinicia el servidor backend.`);
    console.log("\n" + "=".repeat(60));
    console.log("⏹️  Presiona Ctrl+C para cerrar los túneles");
    console.log("=".repeat(60) + "\n");
  }

  // Mantener el proceso vivo
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Cerrando túneles...");
    Object.values(tunnels).forEach((tunnel) => tunnel.close());
    process.exit(0);
  });
}

main().catch(console.error);
