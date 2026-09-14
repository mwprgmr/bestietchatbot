# BESTIET FRESH - Fresh Fish Delivery Commerce & WhatsApp System 🐟

**Brand**: BESTIET FRESH  
**Tagline**: "Your Fresh Friend At The Door"

BESTIET FRESH is a complete, production-ready commerce system built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Edge Functions, and the Meta WhatsApp Business Cloud API.

---

## 🌟 Key Features & Architecture

1. **Admin Inventory Management Dashboard (`/admin/inventory`)**
   - Date-based daily inventory management (Today, Tomorrow, Specific Date).
   - Real-time stock status calculations (`AVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`).
   - Stock adjustments (Restock, Damaged, Correction) with a complete audit movement history log.
   - Low-stock threshold alerts.

2. **Catalogue & Product Management (`/admin/products`)**
   - Manage permanent fish catalogue (Ayala, Karimeen, Prawns, Crab, King Fish, etc.).
   - Activate/deactivate fish, image URLs, categories, units.

3. **Order Management (`/admin/orders`)**
   - Order tabs (All, Pending, Accepted, Preparing, Packed, Out for Delivery, Delivered, Cancelled).
   - Real-time status transitions.
   - Triggers customer WhatsApp notifications automatically on order status changes.
   - Idempotent order cancellation with atomic stock restoration.

4. **Atomic Concurrency & Oversell Protection (`create_order_atomic`)**
   - Single PostgreSQL transaction locks inventory rows `FOR UPDATE`.
   - Prevents overselling and negative stock under concurrent orders.
   - Generates human-readable order numbers (e.g., `BF-20260812-1024`).

5. **WhatsApp Business Cloud API Chatbot State Machine (`/api/whatsapp/webhook`)**
   - Modular state machine: `MAIN_MENU` → `SELECTING_FISH` → `SELECTING_QUANTITY` → `SELECTING_CUT` → `CART` → `SELECTING_ADDRESS` → `ORDER_REVIEW` → `CONFIRMING_ORDER` → `TRACK_ORDER`.
   - Interactive WhatsApp reply buttons & list messages.
   - **Out-of-Stock Automation**: Only fish with `available_stock > 0` appear in customer selection.
   - **Dynamic Quantity Capping**: Available weight choices never exceed available stock.
   - Webhook deduplication protection via `whatsapp_messages` table.

6. **Interactive WhatsApp Simulator (`/admin/simulator`)**
   - Embedded browser sandbox to test the complete WhatsApp customer ordering flow live.

---

## 🚀 Environment Variables (`.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://rhqoonbhwsffwojvndnb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_d9xF1syTEtklAKHf32WlAw_lC55l4UG
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_d9xF1syTEtklAKHf32WlAw_lC55l4UG

# WhatsApp Business Cloud API Credentials
WHATSAPP_ACCESS_TOKEN=EAAoMeyCTxrMBSLRZBnq8VJvSf8xlkgUq7...
WHATSAPP_PHONE_NUMBER_ID=1126837613855957
WHATSAPP_BUSINESS_ACCOUNT_ID=1335771114672348
WHATSAPP_VERIFY_TOKEN=bestiet_fresh_verify_token_2026
META_APP_SECRET=bestiet_fresh_meta_secret_2026

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🛠️ Database Setup & Migrations

The migrations are located in `supabase/migrations/`:
- `001_initial_schema.sql`: Core tables (`products`, `inventory`, `customers`, `addresses`, `orders`, `order_items`, `inventory_movements`, `chat_sessions`, `whatsapp_messages`) and RLS policies.
- `002_functions_and_rpc.sql`: Stored procedures (`create_order_atomic`, `cancel_order_atomic`, `adjust_inventory_stock`).
- `003_seed_data.sql`: Default fish catalogue seed data.

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (Redirects to `/login`).

3. Admin Login:
   - Email: `admin@bestietfresh.com`
   - Password: `admin123`

4. Execute Automated Test Suite:
   ```bash
   npm test
   ```

---

## 📱 Meta WhatsApp Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Select your WhatsApp App → Configuration → Webhooks.
3. Set Webhook URL: `https://your-domain.vercel.app/api/whatsapp/webhook`
4. Set Verify Token: `bestiet_fresh_verify_token_2026`
5. Subscribe to `messages` field.

---

## ☁️ Deployment

### Deploy Next.js to Vercel
```bash
npx vercel
```
Set environment variables in Vercel project settings.

### Deploy Supabase Edge Functions
```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-send
supabase functions deploy process-order
supabase functions deploy order-status
supabase functions deploy inventory-sync
```

---

## ✅ Production Readiness Checklist

- [x] RLS enabled on all database tables.
- [x] Atomic transactions prevent overselling.
- [x] Secrets stored exclusively in server-side environment variables.
- [x] Duplicate webhooks handled safely.
- [x] Order numbers formatted as `BF-YYYYMMDD-XXXX`.
- [x] Responsive admin layout for desktop, tablet, and mobile.
