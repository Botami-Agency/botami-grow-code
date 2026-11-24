// Fonction serveur du simulateur IA (/simulateur).
// Actions : "lookup" (registre public + lecture du site par IA), "verifier-email",
// "verifier-site", "envoyer-resultat" (e-mail du résultat au prospect).
// Le lead lui-même est enregistré côté navigateur dans la table leads (comme les autres formulaires).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const BOOKING_URL = "https://calendly.com/elias-botami-agency/30min";
const EMAIL_FROM = "Botami <contact@botami-agency.com>";
// Le premier modèle qui répond est utilisé. Le second est celui déjà utilisé par generate-cdc.
const MODELES = ["google/gemini-2.5-flash", "openai/gpt-5.5"];
const DELAI_IA_MS = 12000;

const POLES = [
  "commercial", "finance", "administratif", "rh", "comptabilite", "reporting", "production",
  "service_client", "marketing", "logistique", "achats", "juridique", "management", "pilotage",
];

type Json = Record<string, unknown>;
type EtapeTrace = { id: string; label: string; status: "ok" | "vide" | "erreur"; ms: number };
type DirigeantApi = { type_dirigeant?: string; denomination?: string; prenoms?: string; nom?: string };
type EntrepriseApi = {
  nom_complet?: string;
  etat_administratif?: string;
  siren?: string;
  nature_juridique?: string;
  date_creation?: string;
  tranche_effectif_salarie?: string;
  section_activite_principale?: string;
  activite_principale?: string;
  siege?: { libelle_commune?: string };
  dirigeants?: DirigeantApi[];
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function avecDelai<T>(ms: number, travail: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), ms);
  try {
    return await travail(ctrl.signal);
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---------- DNS (DNS-over-HTTPS, sans accès réseau interne) ---------- */
async function resoudre(nom: string, type: "MX" | "A"): Promise<"ok" | "absent" | "inexistant"> {
  const res = await avecDelai(4000, (signal) =>
    fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nom)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal,
    }),
  );
  const data = await res.json();
  if (data?.Status === 3) return "inexistant";
  return Array.isArray(data?.Answer) && data.Answer.length > 0 ? "ok" : "absent";
}

function nettoyerUrl(brute: string): URL | null {
  let s = brute.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    const h = u.hostname.toLowerCase();
    const ip = /^[\d.]+$/.test(h) || h.includes(":");
    if (!["http:", "https:"].includes(u.protocol) || ip || !h.includes(".")) return null;
    if (/(^|\.)(localhost|local|internal|lan)$/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

/* ---------- Registre des entreprises (API Recherche d'entreprises, gratuite) ---------- */
const FORMES: Record<string, string> = {
  "1000": "Entreprise individuelle",
  "5498": "EURL",
  "5499": "SARL",
  "5710": "SAS",
  "5720": "SASU",
  "5599": "SA",
  "5699": "SA",
  "5202": "SNC",
  "6540": "SCI",
  "9220": "Association",
};

const TRANCHES: Record<string, { label: string; effectif: number }> = {
  "00": { label: "Sans salarié", effectif: 1 },
  "01": { label: "1 à 2 salariés", effectif: 2 },
  "02": { label: "3 à 5 salariés", effectif: 4 },
  "03": { label: "6 à 9 salariés", effectif: 8 },
  "11": { label: "10 à 19 salariés", effectif: 15 },
  "12": { label: "20 à 49 salariés", effectif: 35 },
  "21": { label: "50 à 99 salariés", effectif: 75 },
  "22": { label: "100 à 199 salariés", effectif: 150 },
  "31": { label: "200 à 249 salariés", effectif: 225 },
  "32": { label: "250 à 499 salariés", effectif: 375 },
  "41": { label: "500 à 999 salariés", effectif: 750 },
  "42": { label: "1 000 salariés et plus", effectif: 1000 },
  "51": { label: "1 000 salariés et plus", effectif: 1000 },
  "52": { label: "1 000 salariés et plus", effectif: 1000 },
  "53": { label: "1 000 salariés et plus", effectif: 1000 },
};

const SECTIONS: Record<string, string> = {
  A: "Agriculture", B: "Industries extractives", C: "Industrie", D: "Énergie",
  E: "Eau et déchets", F: "Construction", G: "Commerce", H: "Transport et logistique",
  I: "Hôtellerie et restauration", J: "Information et communication", K: "Finance et assurance",
  L: "Immobilier", M: "Conseil et services aux entreprises", N: "Services administratifs",
  O: "Administration publique", P: "Enseignement", Q: "Santé et action sociale",
  R: "Arts et loisirs", S: "Services", T: "Services aux ménages", U: "Organisations internationales",
};

const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const PETITS_MOTS = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "sur", "aux", "au"]);
const capitaliser = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L}+)/gu, (_m, sep: string, mot: string) =>
      sep && PETITS_MOTS.has(mot) ? sep + mot : sep + mot.charAt(0).toUpperCase() + mot.slice(1),
    );

async function chercherRegistre(nom: string) {
  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(nom)}&per_page=5`;
  const appel = () => avecDelai(5000, (signal) => fetch(url, { signal, headers: { accept: "application/json" } }));
  // Une seconde tentative si la première échoue (API publique parfois lente ou limitée en débit).
  let res = await appel().catch(() => null);
  if (!res || !res.ok) res = await appel();
  if (!res.ok) throw new Error(`registre ${res.status}`);
  const data = (await res.json()) as { results?: EntrepriseApi[] };
  const actives = (data?.results ?? []).filter((r) => r?.etat_administratif === "A");
  if (!actives.length) return { registre: null, candidats: [] };

  const cible = normaliser(nom);
  const r = actives[0];
  const trouve = normaliser(String(r.nom_complet ?? ""));
  const correspondance = trouve === cible || trouve.startsWith(cible) ? "exacte" : "probable";
  const tranche = TRANCHES[String(r.tranche_effectif_salarie ?? "")] ?? null;
  const d = (r.dirigeants ?? [])[0];
  const dirigeant = d
    ? d.type_dirigeant === "personne morale"
      ? capitaliser(String(d.denomination ?? ""))
      : capitaliser(`${String(d.prenoms ?? "").split(" ")[0]} ${d.nom ?? ""}`.trim())
    : null;

  return {
    registre: {
      nom: capitaliser(String(r.nom_complet ?? nom)),
      siren: r.siren ?? null,
      correspondance,
      forme: FORMES[String(r.nature_juridique ?? "")] ?? null,
      anneeCreation: r.date_creation ? String(r.date_creation).slice(0, 4) : null,
      ville: r.siege?.libelle_commune ? capitaliser(String(r.siege.libelle_commune)) : null,
      dirigeant: dirigeant || null,
      tranche: tranche?.label ?? null,
      effectif: tranche?.effectif ?? null,
      naf: r.activite_principale ?? null,
      secteur: SECTIONS[String(r.section_activite_principale ?? "")] ?? null,
    },
    candidats: actives.slice(1, 4).map((c) => ({
      nom: capitaliser(String(c.nom_complet ?? "")),
      ville: c.siege?.libelle_commune ? capitaliser(String(c.siege.libelle_commune)) : null,
    })),
  };
}

/* ---------- Lecture du site par IA ---------- */
function extraireTexte(html: string): string {
  const titre = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  // Les sites en JavaScript (React, Vue…) n'ont souvent que leurs balises meta : on les lit toutes,
  // quel que soit l'ordre des attributs.
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (cle: string) => {
    const balise = metas.find((b) => new RegExp(`(?:name|property)=["']${cle}["']`, "i").test(b));
    return balise?.match(/content=(["'])([\s\S]*?)\1/i)?.[2] ?? "";
  };
  const desc = [meta("description"), meta("og:description"), meta("og:site_name")]
    .filter((v, i, t) => v && t.indexOf(v) === i)
    .join(" — ");
  const corps = html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ");
  return `Titre : ${titre}\nDescription : ${desc}\nContenu : ${corps}`.slice(0, 6000);
}

const CONSIGNE_SITE = `Tu analyses le site d'une entreprise française pour personnaliser un questionnaire.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de la forme :
{"activite":"une phrase de 15 mots maximum","secteur":"2 à 4 mots","polesSuggeres":["..."],"tachesParPole":{"<pole>":["...","...","..."]},"postesSuggeres":["..."]}
Règles :
- polesSuggeres : 4 à 6 identifiants parmi ${POLES.join(", ")}, du plus au moins chronophage pour ce métier.
- tachesParPole : pour les 4 premiers pôles suggérés, 3 tâches répétitives propres à ce métier, 8 mots maximum chacune, à l'infinitif.
- postesSuggeres : 3 ou 4 intitulés de postes typiques de cette entreprise.
- Si le contenu est vide ou illisible, renvoie {}.`;

async function lireSite(url: URL) {
  const html = await avecDelai(6000, async (signal) => {
    const res = await fetch(url.toString(), {
      signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; BotamiSimulateur/1.0)" },
    });
    if (!res.ok) throw new Error(`site ${res.status}`);
    return (await res.text()).slice(0, 400_000);
  });
  const contenu = extraireTexte(html);

  const cle = Deno.env.get("LOVABLE_API_KEY");
  if (!cle) throw new Error("LOVABLE_API_KEY manquant");

  for (const modele of MODELES) {
    try {
      const reponse = await avecDelai(DELAI_IA_MS, (signal) =>
        fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
          body: JSON.stringify({
            model: modele,
            messages: [
              { role: "system", content: CONSIGNE_SITE },
              { role: "user", content: contenu },
            ],
          }),
        }),
      );
      if (!reponse.ok) continue;
      const data = await reponse.json();
      const brut: string = data?.choices?.[0]?.message?.content ?? "";
      const objet = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1));
      return assainirSite(objet);
    } catch {
      continue;
    }
  }
  throw new Error("lecture IA impossible");
}

function assainirSite(o: Json) {
  const liste = (v: unknown, n: number, max: number) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.slice(0, max)).slice(0, n) : [];
  const poles = liste(o?.polesSuggeres, 6, 30).filter((p) => POLES.includes(p));
  const taches: Record<string, string[]> = {};
  for (const p of POLES) {
    const t = liste((o?.tachesParPole as Json | undefined)?.[p], 3, 70);
    if (t.length) taches[p] = t;
  }
  return {
    activite: texte(o?.activite, 140) || null,
    secteur: texte(o?.secteur, 60) || null,
    polesSuggeres: poles,
    tachesParPole: taches,
    postesSuggeres: liste(o?.postesSuggeres, 4, 50),
  };
}

async function chronometrer<T>(trace: EtapeTrace[], id: string, label: string, travail: () => Promise<T>) {
  const debut = Date.now();
  try {
    const r = await travail();
    trace.push({ id, label, status: r ? "ok" : "vide", ms: Date.now() - debut });
    return r;
  } catch (e) {
    console.error(`simulateur ${id}:`, String(e));
    trace.push({ id, label, status: "erreur", ms: Date.now() - debut });
    return null;
  }
}

/* ---------- E-mail du résultat ---------- */
const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const euros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

async function envoyerResultat(body: Json) {
  const email = texte(body?.email, 160).toLowerCase();
  const prenom = echapper(texte(body?.prenom, 60));
  const entreprise = echapper(texte(body?.entreprise, 80));
  const r = (body?.resultat ?? {}) as Json;
  const nombre = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
  const heures = nombre(r.heuresParMois);
  const etp = nombre(r.equivalentTempsPlein);
  const parAn = nombre(r.economieParAn);
  const outils3ans = nombre(r.coutOutilsTroisAns);
  const potentiel = Math.min(100, nombre(r.potentielRestant));
  if (!email.includes("@")) return { envoye: false, raison: "email" };

  // Garde-fou anti-relais : le lead doit avoir été enregistré il y a moins de 30 minutes.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const depuis = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: lignes } = await admin
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("source_route", "/simulateur")
    .gte("created_at", depuis)
    .limit(1);
  if (!lignes?.length) return { envoye: false, raison: "lead introuvable" };

  const cleLovable = Deno.env.get("LOVABLE_API_KEY");
  const cleResend = Deno.env.get("RESEND_API_KEY");
  if (!cleLovable || !cleResend) return { envoye: false, raison: "clés" };

  const ligne = (titre: string, valeur: string) =>
    `<tr><td style="padding:10px 0;color:#6B7280;font-size:14px">${titre}</td><td style="padding:10px 0;text-align:right;font-weight:600;font-size:16px">${valeur}</td></tr>`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1A1A;line-height:1.6;max-width:560px">
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Voici le résultat du simulateur${entreprise ? ` pour <strong>${entreprise}</strong>` : ""}. Les montants sont des estimations calculées à partir de vos réponses.</p>
    <p style="font-size:20px;font-weight:700;margin:24px 0 8px">${Math.round(potentiel)} % du potentiel de l'IA reste à exploiter</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E5E0D8;border-bottom:1px solid #E5E0D8">
      ${ligne("Heures récupérables par mois", `≈ ${Math.round(heures).toLocaleString("fr-FR")} h`)}
      ${ligne("Équivalent temps plein", `≈ ${etp.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`)}
      ${ligne("Économie estimée par an", `≈ ${euros(parAn)}`)}
      ${outils3ans > 0 ? ligne("Vos abonnements logiciels sur 3 ans", `≈ ${euros(outils3ans)}`) : ""}
    </table>
    <p style="margin-top:24px">On en parle 30 minutes, gratuitement ? On passe en revue vos tâches prioritaires et ce qui vaut la peine d'être automatisé.</p>
    <p><a href="${BOOKING_URL}" style="display:inline-block;background:#C4872C;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Je réserve mon échange gratuit</a></p>
    <p style="color:#6B7280;font-size:13px">L'équipe Botami Software</p>
  </div>`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleLovable}`,
      "X-Connection-Api-Key": cleResend,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: "Votre résultat du simulateur IA — Botami",
      html,
    }),
  });
  if (!res.ok) console.error("envoyer-resultat:", res.status, await res.text());
  return { envoye: res.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Json;
    const action = String(body?.action ?? "");

    if (action === "lookup") {
      const nom = texte(body?.nom, 120);
      if (nom.length < 2) return json({ error: "nom requis" }, 400);
      const url = nettoyerUrl(texte(body?.siteUrl, 300));
      const trace: EtapeTrace[] = [];
      const [reg, site] = await Promise.all([
        chronometrer(trace, "registre", "Recherche dans le registre des entreprises", () => chercherRegistre(nom)),
        url
          ? chronometrer(trace, "site", "Lecture de votre site par l'IA", () => lireSite(url))
          : Promise.resolve(null),
      ]);
      return json({
        registre: reg?.registre ?? null,
        candidats: reg?.candidats ?? [],
        site,
        trace,
      });
    }

    if (action === "verifier-email") {
      const email = texte(body?.email, 160).toLowerCase();
      const domaine = email.split("@")[1] ?? "";
      if (!domaine.includes(".")) return json({ statut: "invalide", domaine });
      try {
        const mx = await resoudre(domaine, "MX");
        if (mx === "ok") return json({ statut: "ok", domaine });
        if (mx === "inexistant") return json({ statut: "invalide", domaine });
        const a = await resoudre(domaine, "A");
        return json({ statut: a === "ok" ? "ok" : "invalide", domaine });
      } catch {
        return json({ statut: "inconnu", domaine });
      }
    }

    if (action === "verifier-site") {
      const url = nettoyerUrl(texte(body?.url, 300));
      if (!url) return json({ statut: "invalide" });
      try {
        const a = await resoudre(url.hostname, "A");
        return json({ statut: a === "ok" ? "ok" : "injoignable", hote: url.hostname });
      } catch {
        return json({ statut: "inconnu", hote: url.hostname });
      }
    }

    if (action === "envoyer-resultat") {
      return json(await envoyerResultat(body));
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    console.error("simulateur:", String(e));
    return json({ error: "erreur serveur" }, 500);
  }
});
