# Mail Sender (Next.js + Ant Design + Nodemailer)

Open the app and your heading and message are already filled in. Edit them, add recipient emails,
attach your resume, and click **Send Emails**. Every recipient receives their **own separate email**
(no CC/BCC, nobody sees the other addresses).

## What's new

- Heading and message are pre-filled with your application text every time the app opens.
- Each field has a **Clear** button (removes all text so you can write fresh) and a **Reset** button (restores the default).
- Sending is blocked without an attachment, both in the UI (button disabled) and on the server (API returns an error).
- Ant Design UI that works like an app on desktop and mobile, with a sticky send bar.

To change the default text, edit `app/defaults.js`.

## 1. Install

```bash
npm install
```

## 2. Configure your email account

```bash
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | What to put |
|---|---|
| `SEND_PASSWORD` | The password you must enter in the app before any email is sent |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | A Gmail **App Password** (not your normal password) |
| `FROM_NAME` | Name recipients see (optional) |
| `SEND_DELAY_MS` | Pause between mails, default 800 ms |

### Get a Gmail App Password
1. Turn on **2-Step Verification**: https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password (name it "Mail Sender") and paste the 16 characters into `SMTP_PASS`.

Using another provider (Outlook, Zoho, etc.)? Change `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` in `.env.local`.

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000

## Files

- `app/defaults.js` – default heading and message
- `app/providers.js` – Ant Design theme and registry
- `app/page.js` – the UI
- `app/api/send/route.js` – validates everything (password, recipients, required attachment) and sends one email per address

## Limits and tips

- Max 100 recipients per click and a 10 MB attachment (change `MAX_RECIPIENTS` / `MAX_FILE_BYTES` in the route).
- Gmail allows roughly 500 emails/day on a normal account. Don't blast thousands of mails or your account may get flagged.
- Keep `.env.local` private. Never commit it to Git.
- If you deploy to Vercel, add the same variables in the project's Environment Variables, and note that serverless time limits apply to large batches.
