import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const MESSAGE_QUOTA = 60;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), { status: 405 });
  }

  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Le paiement n'est pas encore configuré côté serveur." }), { status: 500 });
  }

  let sessionId: unknown;
  try {
    const body = await req.json();
    sessionId = body?.sessionId;
  } catch {
    return new Response(JSON.stringify({ error: "Requête invalide." }), { status: 400 });
  }
  if (typeof sessionId !== "string" || !sessionId) {
    return new Response(JSON.stringify({ error: "sessionId manquant." }), { status: 400 });
  }

  const store = getStore("boussole-access");

  // Idempotent: if this Checkout Session already has a token, return it instead of
  // re-verifying with Stripe (handles page refresh / double redirect).
  const existing = await store.get(`session:${sessionId}`, { type: "json" });
  if (existing && typeof existing === "object" && "token" in existing) {
    return new Response(JSON.stringify({ token: (existing as { token: string }).token }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${stripeKey}` } },
  );
  if (!stripeRes.ok) {
    return new Response(JSON.stringify({ error: "Session de paiement introuvable." }), { status: 402 });
  }
  const session = await stripeRes.json();

  const paid =
    session.payment_status === "paid" &&
    session.currency === "eur" &&
    typeof session.amount_total === "number" &&
    session.amount_total >= 100;

  if (!paid) {
    return new Response(JSON.stringify({ error: "Paiement non confirmé." }), { status: 402 });
  }

  const token = randomUUID();
  await store.setJSON(`access:${token}`, { messagesUsed: 0, quota: MESSAGE_QUOTA, createdAt: Date.now() });
  await store.setJSON(`session:${sessionId}`, { token });

  return new Response(JSON.stringify({ token }), { status: 200, headers: { "content-type": "application/json" } });
};

export const config: Config = { path: "/api/verify-payment" };
