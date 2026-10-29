import crypto from "crypto";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_RECIPIENTS = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Password protection ----
// The password lives in .env.local (SEND_PASSWORD) and is checked on the server only.
const MAX_ATTEMPTS = 5; // wrong tries allowed...
const LOCK_MS = 60 * 1000; // ...before sending is locked for 60 seconds
const attempts =
  globalThis.__sendAttempts || (globalThis.__sendAttempts = { count: 0, lockedUntil: 0 });

function passwordMatches(input) {
  const expected = process.env.SEND_PASSWORD || "";
  // hash both so lengths match, then compare in constant time
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP_USER and SMTP_PASS are not set. Copy .env.example to .env.local and fill them in, then restart the server."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST || "smtp.gmail.com",
    port: Number(SMTP_PORT) || 465,
    secure: String(SMTP_SECURE ?? "true") === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    // ---- Password check (must pass before anything else happens) ----
    if (!process.env.SEND_PASSWORD) {
      return NextResponse.json(
        { error: "SEND_PASSWORD is not set. Add it to .env.local and restart the server." },
        { status: 500 }
      );
    }

    const now = Date.now();
    if (attempts.lockedUntil > now) {
      const secs = Math.ceil((attempts.lockedUntil - now) / 1000);
      return NextResponse.json(
        { error: `Too many wrong attempts. Try again in ${secs}s.` },
        { status: 429 }
      );
    }

    if (!passwordMatches(formData.get("password") || "")) {
      attempts.count += 1;
      if (attempts.count >= MAX_ATTEMPTS) {
        attempts.count = 0;
        attempts.lockedUntil = now + LOCK_MS;
      }
      return NextResponse.json({ error: "Incorrect password. Emails were NOT sent." }, { status: 401 });
    }
    attempts.count = 0;

    // ---- Read & validate fields ----
    let emails = [];
    try {
      emails = JSON.parse(formData.get("emails") || "[]");
    } catch {
      return NextResponse.json({ error: "Invalid emails list." }, { status: 400 });
    }

    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const resume = formData.get("resume");

    emails = [...new Set(emails.map((e) => String(e).trim().toLowerCase()))].filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ error: "No recipients provided." }, { status: 400 });
    }
    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients. Max ${MAX_RECIPIENTS} per send.` },
        { status: 400 }
      );
    }
    const invalid = emails.filter((e) => !EMAIL_REGEX.test(e));
    if (invalid.length) {
      return NextResponse.json({ error: `Invalid email(s): ${invalid.join(", ")}` }, { status: 400 });
    }
    if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    // ---- Attachment (optional) ----
    let attachments = [];
    if (resume && typeof resume === "object" && resume.size > 0) {
      if (resume.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Attachment is larger than 10 MB." }, { status: 400 });
      }
      const buffer = Buffer.from(await resume.arrayBuffer());
      attachments = [
        {
          filename: resume.name,
          content: buffer,
          contentType: resume.type || undefined,
        },
      ];
    }

    // ---- Transporter ----
    const transporter = createTransporter();
    await transporter.verify(); // fails fast if login is wrong

    const fromName = process.env.FROM_NAME || "";
    const from = fromName
      ? `"${fromName.replace(/"/g, "")}" <${process.env.SMTP_USER}>`
      : process.env.SMTP_USER;

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222;">${escapeHtml(
      message
    ).replace(/\r?\n/g, "<br>")}</div>`;

    const delay = Number(process.env.SEND_DELAY_MS) || 800;

    // ---- Send ONE email per recipient (never CC/BCC, so nobody sees the others) ----
    const results = [];
    for (let i = 0; i < emails.length; i++) {
      const to = emails[i];
      try {
        await transporter.sendMail({
          from,
          to,
          subject,
          text: message,
          html,
          attachments,
        });
        results.push({ email: to, success: true });
      } catch (err) {
        results.push({ email: to, success: false, error: err.message || "Failed to send" });
      }
      if (i < emails.length - 1) await sleep(delay);
    }

    const sent = results.filter((r) => r.success).length;
    return NextResponse.json({
      total: results.length,
      sent,
      failed: results.length - sent,
      results,
    });
  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: err.message || "Server error." }, { status: 500 });
  }
}
