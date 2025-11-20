# Backend - Licuadora Portátil Ecommerce

Express.js backend con integración MercadoPago para el ecommerce de la licuadora portátil.

## Requisitos Previos

- Node.js 18+
- PostgreSQL 13+
- MercadoPago Access Token

## Instalación

1. Copia el archivo `.env.example` a `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

2. Configura las variables de entorno:
\`\`\`env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/licuadora
MERCADOPAGO_ACCESS_TOKEN=tu_token_aqui
\`\`\`

3. Instala dependencias:
\`\`\`bash
npm install
\`\`\`

## Setup de Base de Datos

1. Ejecuta las migraciones:
\`\`\`bash
npm run db:migrate
\`\`\`

2. Siembra datos iniciales:
\`\`\`bash
npm run db:seed
\`\`\`

## Desarrollo

\`\`\`bash
npm run dev
\`\`\`

El servidor estará disponible en `http://localhost:5000/api`

## API Endpoints

### Pagos
- `POST /api/payments/create-preference` - Crear preferencia de pago MercadoPago
- `POST /api/payments/webhook` - Webhook para notificaciones de MercadoPago

### Pedidos
- `GET /api/orders` - Listar todos los pedidos
- `GET /api/orders/:id` - Obtener pedido por ID
- `PATCH /api/orders/:id/status` - Actualizar estado del pedido

### Productos
- `GET /api/products` - Obtener información del producto
- `PATCH /api/products` - Actualizar producto

## Integración MercadoPago

1. Obtén tu Access Token desde: https://www.mercadopago.com/developers/panel
2. Configúralo en el archivo `.env`
3. El SDK se inicializa automáticamente al iniciar el servidor

## Deployment

Para producción:
\`\`\`bash
npm run build
npm start
\`\`\`

Debes deployar en plataformas como:
- Render
- Railway
- AWS EC2
- DigitalOcean
