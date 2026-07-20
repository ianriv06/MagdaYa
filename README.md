# MagdaYa

Mobile-first food delivery & pickup web app inspired by Uber Eats — streamlined to **order → pay via QR → track → receive**.

## Features

### Roles
- **Customer** — browse restaurants, order delivery/pickup, pay with global QR, track on a live map
- **Restaurant** — manage menu with photos, toggle availability, view incoming orders
- **Driver** — accept/decline deliveries, live map, mark Picked up → Delivered
- **Super Admin** — confirm payments, confirm orders, manage global payment QR, full order visibility

### Order status flow
1. Order Placed  
2. Money Paid to Commerce *(admin marks manually)*  
3. Order Confirmed *(admin marks manually)* → auto-advances to  
4. Order in Progress *(drivers notified)*  
5. Order on the Way *(driver taps “Picked up”)*  
6. Order Delivered *(driver taps “Delivered”)*

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, RLS, Realtime, Storage)
- Leaflet / OpenStreetMap (no map API key required)
- Zustand (cart)

## Setup

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and create a project  
2. Open **SQL Editor** and run `supabase/schema.sql`  
3. Run `supabase/seed.sql` (creates storage buckets + policies)

### 4. Disable email confirmation (for local/dev)
In Supabase → **Authentication → Providers → Email**, turn off “Confirm email” so signups work immediately.

### 5. Environment variables
```bash
cp .env.example .env.local
```

Fill in from Supabase → **Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Optional: WhatsApp order confirmations
To automatically message the customer when they place an order, add Meta WhatsApp Cloud API credentials to `.env.local` (and Vercel):

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TEMPLATE_NAME=order_confirmation   # optional but recommended
WHATSAPP_TEMPLATE_LANG=es
```

Setup: [Meta for Developers](https://developers.facebook.com/) → create an app → WhatsApp → API Setup.  
Outbound messages to customers who never messaged you first usually require an **approved message template**.

### 6. Install & run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## First-time walkthrough

1. **Super Admin** — Sign up as Super Admin → upload a payment QR at `/admin/payment`
2. **Restaurant** — Sign up → create restaurant → add menu items with photos
3. **Customer** — Sign up → browse → add to cart → checkout → pay via QR → place order
4. **Admin** — Mark “Money Paid to Commerce” → Confirm order (moves to In Progress)
5. **Driver** — Sign up → accept the request → Picked up → Delivered  
   Customer tracks everything live on the map

## Project structure

```
src/
  app/                 # Routes (customer, restaurant, driver, admin)
  components/          # UI, maps, layouts
  lib/                 # Supabase clients, types, utils
  store/               # Cart (Zustand)
supabase/
  schema.sql           # Full DB schema + RLS + realtime
  seed.sql             # Storage buckets
```

## Notes
- Payment is **QR only** — no cards or wallets
- Maps use the browser Geolocation API + OpenStreetMap
- Realtime updates use Supabase Realtime on the `orders` and `drivers` tables
