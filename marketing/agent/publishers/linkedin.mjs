// Publication et statistiques sur une Page LinkedIn (API Posts, produit « Community Management API »).
// Secrets : LINKEDIN_ORG_ID (identifiant numérique de la Page), LINKEDIN_TOKEN (jeton avec w_organization_social, r_organization_social).
const version = () => process.env.LINKEDIN_VERSION || "202606"; // format AAAAMM, à faire évoluer (une version reste active environ 1 an)
const headers = () => ({
  Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}`,
  "LinkedIn-Version": version(),
  "X-Restli-Protocol-Version": "2.0.0",
  "Content-Type": "application/json",
});

// Le champ « commentary » utilise un format où certains caractères sont réservés
const escapeLittleText = (s) => s.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => "\\" + c);
const hashtag = (t) => `{hashtag|\\#|${t.replace(/^#/, "")}}`;

export const linkedinConfigure = () => !!(process.env.LINKEDIN_ORG_ID && process.env.LINKEDIN_TOKEN);

export async function publierLinkedin({ texte, hashtags = [], lien, titreLien }) {
  const body = {
    author: `urn:li:organization:${process.env.LINKEDIN_ORG_ID}`,
    commentary: escapeLittleText(texte) + (hashtags.length ? "\n\n" + hashtags.map(hashtag).join(" ") : ""),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    ...(lien ? { content: { article: { source: lien, title: titreLien || "Cap Micro, le copilote de l'auto-entrepreneur" } } } : {}),
  };
  const res = await fetch("https://api.linkedin.com/rest/posts", { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LinkedIn ${res.status} : ${await res.text()}`);
  return res.headers.get("x-restli-id");
}

export async function statsLinkedin(urn) {
  const res = await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(urn)}`, { headers: headers() });
  if (!res.ok) throw new Error(`LinkedIn ${res.status}`);
  const d = await res.json();
  return { reactions: d.likesSummary?.totalLikes || 0, commentaires: d.commentsSummary?.aggregatedTotalComments || 0 };
}
