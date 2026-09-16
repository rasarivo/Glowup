import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface AccessRecord {
  messagesUsed: number;
  quota: number;
  createdAt: number;
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), { status: 405 });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Le service n'est pas encore configuré côté serveur." }), { status: 500 });
  }

  let body: { token?: string; system?: string; messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Requête invalide." }), { status: 400 });
  }

  const { token, system, messages } = body;
  if (!token || !system || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Requête incomplète." }), { status: 400 });
  }

  const store = getStore("boussole-access");
  const access = (await store.get(`access:${token}`, { type: "json" })) as AccessRecord | null;
  if (!access) {
    return new Response(JSON.stringify({ error: "Accès invalide. Merci de repasser par le paiement." }), { status: 403 });
  }
  if (access.messagesUsed >= access.quota) {
    return new Response(
      JSON.stringify({
        error: "Tu as beaucoup échangé avec Boussole sur cette session — le quota est atteint. Contacte-nous si tu veux continuer.",
      }),
      { status: 429 },
    );
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1600, system, messages }),
  });

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.json().catch(() => ({}) as Record<string, unknown>);
    const message =
      typeof errBody === "object" && errBody && "error" in errBody
        ? ((errBody as { error?: { message?: string } }).error?.message ?? "Erreur du service IA.")
        : "Erreur du service IA.";
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }

  const data = await anthropicRes.json();
  const text = Array.isArray(data.content) ? data.content.map((b: { text?: string }) => b.text || "").join("\n") : "";

  access.messagesUsed += 1;
  await store.setJSON(`access:${token}`, access);

  return new Response(JSON.stringify({ text, remaining: access.quota - access.messagesUsed }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = { path: "/api/chat" };
