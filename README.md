# Akkaunt Savdo Bot

Telegram bot + Mini App + Vercel API + Supabase bazasi.

## Ishga tushirish

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:5174/
```

Vite dev server local holatda `api/*` Vercel funksiyalarini ham emulyatsiya qiladi.

## Supabase

1. Supabase SQL Editor ichida `supabase/001_schema.sql` faylini ishga tushiring.
2. Storage bucket nomi default: `account-media`.
3. Vercel env qiymatlariga `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` qo'ying.

## Vercel env

`.env.example` ichidagi qiymatlarni Vercel Project Settings -> Environment Variables qismiga qo'ying:

```text
BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
WEBAPP_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
ADMIN_TELEGRAM_ID
ADMIN_USERNAME
BOT_USERNAME
```

`ADMIN_TELEGRAM_ID` qo'yish tavsiya qilinadi. Agar u bo'lmasa, bot adminni username orqali tanishga urinadi.

## Telegram webhook

Deploydan keyin:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-vercel-project.vercel.app/api/bot?secret=<TELEGRAM_WEBHOOK_SECRET>","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message","edited_message"]}'
```

Botga yozilganda u faqat Mini App tugmasini beradi. Admin botga:

```text
516874602 (6253) sotildi
```

deb yozsa, shu title bilan turgan aktiv akkaunt `sold` holatiga o'tadi va do'kondan yo'qoladi.

## Build

```bash
npm run build
```
