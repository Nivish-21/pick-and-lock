/// <reference types="node" />

/**
 * POST /api/capture-email
 *
 * Scaffold for the "email is optional after join" flow described in
 * PRODUCT.md. Matches the contract the client already calls in
 * `src/data/spacetime.ts` (`sendJoinEmail`): a JSON body of
 * `{ email, shareCode }`, a 2xx response on success, and a non-2xx response
 * with a plain-text body on failure.
 *
 * This does NOT touch Section A (room/reducer logic) or any SpacetimeDB
 * table — it only sends a one-off welcome email over plain SMTP via
 * `nodemailer`, using an existing mailbox rather than a transactional
 * provider. This avoids the sender-domain verification step a provider
 * like Resend requires before it will deliver to arbitrary recipients —
 * an existing mailbox is already trusted to send to anyone. Requires
 * `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (see .env.example);
 * without them it responds 501 so the client-side flow degrades safely
 * instead of hanging or crashing (email is explicitly optional and must
 * never block room entry).
 *
 * Deployed as a Vercel Node.js Function (this file lives under the
 * project's `api/` directory per Vercel's file-based convention).
 */
import nodemailer from "nodemailer";

type VercelLikeRequest = {
  method?: string;
  body?: unknown;
};

type VercelLikeResponse = {
  status(code: number): VercelLikeResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
  json(body: unknown): void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHARE_CODE_PATTERN = /^[A-Z0-9]{6,12}$/i;

function readBody(req: VercelLikeRequest): {
  email?: unknown;
  shareCode?: unknown;
} {
  if (req.body && typeof req.body === "object") {
    return req.body as { email?: unknown; shareCode?: unknown };
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body) as { email?: unknown; shareCode?: unknown };
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const { email, shareCode } = readBody(req);

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    res.status(400).send("A valid email is required.");
    return;
  }

  if (
    typeof shareCode !== "string" ||
    !SHARE_CODE_PATTERN.test(shareCode.trim())
  ) {
    res.status(400).send("A valid room code is required.");
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    // Email is optional and must never block room entry — the client
    // treats any non-2xx as "could not send" and moves on. This is the
    // expected response until the team adds real SMTP secrets.
    res.status(501).send("Email sending is not configured yet.");
    return;
  }

  const trimmedEmail = email.trim();
  const trimmedShareCode = shareCode.trim().toUpperCase();
  const roomUrl = `https://sorted.vercel.app/r/${trimmedShareCode}`;

  try {
    const port = Number(SMTP_PORT);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM_ADDRESS || SMTP_USER,
      to: trimmedEmail,
      subject: "You're in — welcome to Sorted",
      text: `You're in.\n\nYour room: ${roomUrl}\n\nAnswer in, out, or conditional — Sorted locks the plan the moment enough friends agree, and reopens automatically if someone drops out.`,
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email could not be sent.";
    res.status(502).send(message);
  }
}
