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
 * table — it only sends a one-off welcome email via Resend
 * (https://resend.com). It requires a real `RESEND_API_KEY` secret, which
 * only the team can provision (see .env.example); without one it responds
 * 501 so the client-side flow degrades safely instead of hanging or
 * crashing (email is explicitly optional and must never block room entry).
 *
 * Deployed as a Vercel Node.js Function (this file lives under the
 * project's `api/` directory per Vercel's file-based convention).
 */

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

function readBody(req: VercelLikeRequest): { email?: unknown; shareCode?: unknown } {
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

  if (typeof shareCode !== "string" || !SHARE_CODE_PATTERN.test(shareCode.trim())) {
    res.status(400).send("A valid room code is required.");
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Email is optional and must never block room entry — the client
    // treats any non-2xx as "could not send" and moves on. This is the
    // expected response until the team adds a real RESEND_API_KEY secret.
    res.status(501).send("Email sending is not configured yet.");
    return;
  }

  const trimmedEmail = email.trim();
  const trimmedShareCode = shareCode.trim().toUpperCase();
  const roomUrl = `https://sorted.vercel.app/r/${trimmedShareCode}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_ADDRESS || "Sorted <onboarding@resend.dev>",
        to: [trimmedEmail],
        subject: "You're in — welcome to Sorted",
        text: `You're in.\n\nYour room: ${roomUrl}\n\nAnswer in, out, or conditional — Sorted locks the plan the moment enough friends agree, and reopens automatically if someone drops out.`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).send(detail || "Email provider rejected the request.");
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email could not be sent.";
    res.status(502).send(message);
  }
}
