# MagdaYa — Meta WhatsApp setup checklist

## 1. Log in
Open https://developers.facebook.com/apps/ and click **Continue with Facebook**.

## 2. Create the app
1. Click **Create app**
2. Choose use case: **Other** (or **Business** if shown)
3. App type: **Business**
4. App name: `MagdaYa`
5. Create the app

## 3. Add WhatsApp
1. In the app dashboard → **Add products** → **WhatsApp** → Set up
2. Go to **WhatsApp → API Setup**

## 4. Copy these values into MagdaYa
From **API Setup**:

| Field in Meta | MagdaYa env var |
|---|---|
| Temporary access token (or System User token) | `WHATSAPP_TOKEN` |
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |

Paste them into `.env.local` and Vercel Project → Settings → Environment Variables.

## 5. Test number (dev)
On API Setup:
1. Under **To**, add your personal WhatsApp number as a test recipient
2. Accept the invite SMS/WhatsApp from Meta
3. Place a MagdaYa order with that same number

Until you go live with a real business number + approved templates, Meta only lets you message **added test numbers**.

## 6. Production (later)
1. Add a real WhatsApp Business phone number
2. Create & get approval for a message template (e.g. `order_confirmation`) with body variables:
   - `{{1}}` = order id
   - `{{2}}` = restaurant name
   - `{{3}}` = total
3. Set `WHATSAPP_TEMPLATE_NAME=order_confirmation` and `WHATSAPP_TEMPLATE_LANG=es`

## 7. Restart
After saving env vars locally: restart `npm run dev`.  
On Vercel: redeploy after adding production env vars.
