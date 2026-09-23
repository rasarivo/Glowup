// Publication et statistiques Facebook (Page) et Instagram (compte professionnel relié à la Page), via l'API Graph de Meta.
// Secrets : META_PAGE_ID, META_PAGE_TOKEN (jeton de Page longue durée), META_IG_USER_ID.
const version = () => process.env.META_GRAPH_VERSION || "v23.0";
const graph = (p) => `https://graph.facebook.com/${version()}/${p}`;

async function call(url, params, method = "POST") {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_PAGE_TOKEN });
  const res = method === "POST" ? await fetch(url, { method, body }) : await fetch(`${url}?${body}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Meta ${res.status} : ${data.error?.message || JSON.stringify(data)}`);
  return data;
}

export const facebookConfigure = () => !!(process.env.META_PAGE_ID && process.env.META_PAGE_TOKEN);
export const instagramConfigure = () => !!(process.env.META_IG_USER_ID && process.env.META_PAGE_TOKEN);

export async function publierFacebook({ texte, imageUrl }) {
  const pageId = process.env.META_PAGE_ID;
  const data = imageUrl
    ? await call(graph(`${pageId}/photos`), { url: imageUrl, caption: texte })
    : await call(graph(`${pageId}/feed`), { message: texte });
  return data.post_id || data.id;
}

export async function publierInstagram({ texte, imageUrl }) {
  if (!imageUrl) throw new Error("Instagram exige une image");
  const ig = process.env.META_IG_USER_ID;
  const { id: container } = await call(graph(`${ig}/media`), { image_url: imageUrl, caption: texte });
  for (let i = 0; i < 10; i++) { // le conteneur doit être prêt avant publication
    const { status_code } = await call(graph(container), { fields: "status_code" }, "GET");
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR") throw new Error("Instagram : le média a été refusé");
    await new Promise(r => setTimeout(r, 3000));
  }
  const { id } = await call(graph(`${ig}/media_publish`), { creation_id: container });
  return id;
}

export async function statsFacebook(id) {
  const d = await call(graph(id), { fields: "reactions.summary(total_count),comments.summary(total_count),shares" }, "GET");
  return { reactions: d.reactions?.summary?.total_count || 0, commentaires: d.comments?.summary?.total_count || 0, partages: d.shares?.count || 0 };
}

export async function statsInstagram(id) {
  const d = await call(graph(id), { fields: "like_count,comments_count" }, "GET");
  const stats = { reactions: d.like_count || 0, commentaires: d.comments_count || 0 };
  try { // métriques d'insights (disponibles quelques heures après publication)
    const ins = await call(graph(`${id}/insights`), { metric: "reach,saved,shares" }, "GET");
    for (const m of ins.data || []) stats[{ reach: "portee", saved: "enregistrements", shares: "partages" }[m.name]] = m.values?.[0]?.value ?? 0;
  } catch { /* insights indisponibles : on garde les compteurs de base */ }
  return stats;
}
