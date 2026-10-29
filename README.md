# Mail Sender (Next.js + Nodemailer)

Write a heading and description, add many recipient emails, attach your resume, and click **Send**.
Every recipient receives their **own separate email** (no CC/BCC, nobody sees the other addresses).

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

## Password protection

Before clicking **Send Emails** you must type the password you set in `SEND_PASSWORD`.
The check happens on the server (`app/api/send/route.js`), so it cannot be bypassed from the browser.
If the password is wrong, nothing is sent. After 5 wrong attempts, sending is locked for 60 seconds.
To change the password, edit `.env.local` and restart `npm run dev`.

## How it works

- `app/page.js` – the UI (email chips, subject, message, resume upload, delivery report)
- `app/api/send/route.js` – receives the form, loops through each recipient, and calls `nodemailer.sendMail()` once per address with the same subject, message and attachment

## Limits and tips

- Max 100 recipients per click and a 10 MB attachment (change `MAX_RECIPIENTS` / `MAX_FILE_BYTES` in the route).
- Gmail allows roughly 500 emails/day on a normal account. Don't blast thousands of mails or your account may get flagged.
- Keep `.env.local` private. Never commit it to Git (it is already in `.gitignore`).
- If you deploy to Vercel, add the same variables in the project's Environment Variables, and note that serverless time limits apply to large batches.
