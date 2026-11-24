// Lecture du site d'un prospect pour le simulateur.
//
// Niveau 1, « technique » (HTML brut, sans IA, moins d'une seconde) :
//   logo, outils repérés dans le code de la page, villes déclarées dans le balisage schema.org.
// Niveau 2, « contenu » (1 à 3 pages, puis IA) :
//   pages lues avec Firecrawl quand le connecteur est relié au projet (sites en JavaScript compris),
//   sinon en HTML brut. L'IA extrait activité, services, clientèle, villes et une citation.
//   Garde-fou : la citation et les villes doivent figurer mot pour mot dans les pages lues.

export type Json = Record<string, unknown>;
export interface Outil {
  nom: string;
  categorie: string;
}
export interface PageLue {
  url: string;
  libelle: string;
}

const UA = "Mozilla/5.0 (compatible; BotamiSimulateur/1.0; +https://software.botami-agency.com/simulateur)";
// Le premier modèle qui répond est utilisé ; son nom est renvoyé dans la trace.
// Les identifiants exacts de la passerelle Lovable ne sont pas documentés : les variantes inconnues échouent vite (400).
const MODELES = [
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-flash-lite-preview",
  "google/gemini-3-flash",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5.5",
];
let modeleRetenu: string | null = null;
const DELAI_IA_MS = 12000;

export const POLES = [
  "commercial", "finance", "administratif", "rh", "comptabilite", "reporting", "production",
  "service_client", "marketing", "logistique", "achats", "juridique", "management", "pilotage",
];

export async function avecDelai<T>(ms: number, travail: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), ms);
  try {
    return await travail(ctrl.signal);
  } finally {
    clearTimeout(minuteur);
  }
}

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function decoderEntites(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)));
}

/* ---------- HTML brut ---------- */
export async function telechargerPage(url: URL, ms = 6000): Promise<{ html: string; url: URL }> {
  return await avecDelai(ms, async (signal) => {
    const res = await fetch(url.toString(), {
      signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) throw new Error(`site ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) throw new Error(`type ${type}`);
    return { html: (await res.text()).slice(0, 600_000), url: new URL(res.url || url.toString()) };
  });
}

const balises = (html: string, nom: string) => [...html.matchAll(new RegExp(`<${nom}\\b[^>]*>`, "gi"))].map((m) => m[0]);
const attribut = (balise: string, nom: string) =>
  balise.match(new RegExp(`\\s${nom}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"))?.[2] ?? "";

function meta(html: string, cle: string) {
  const b = balises(html, "meta").find((x) => new RegExp(`(?:name|property)=["']${cle}["']`, "i").test(x));
  return b ? decoderEntites(attribut(b, "content")) : "";
}

export function textePage(html: string): string {
  const titre = decoderEntites(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const desc = [meta(html, "description"), meta(html, "og:description"), meta(html, "og:site_name")]
    .filter((v, i, t) => v && t.indexOf(v) === i)
    .join(" — ");
  const corps = decoderEntites(
    html
      .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article|header|footer|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return `Titre : ${titre}\nDescription : ${desc}\n${corps}`;
}

// « LES LOGES » → « Les Loges » ; une casse déjà mixte est conservée.
const casse = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, l: string) => sep + l.toUpperCase()) : s;

/* ---------- Données structurées schema.org ---------- */
function objetsJsonLd(html: string): Json[] {
  const objets: Json[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1].trim());
      for (const o of Array.isArray(v) ? v : [v]) {
        if (!o || typeof o !== "object") continue;
        objets.push(o as Json);
        const graphe = (o as Json)["@graph"];
        if (Array.isArray(graphe)) objets.push(...(graphe.filter((x) => x && typeof x === "object") as Json[]));
      }
    } catch {
      /* bloc illisible : ignoré */
    }
  }
  return objets;
}

function villesJsonLd(objets: Json[]): string[] {
  const villes = new Set<string>();
  const ajouter = (adresse: unknown) => {
    for (const a of Array.isArray(adresse) ? adresse : [adresse]) {
      const v = (a as Json | undefined)?.addressLocality;
      if (typeof v === "string" && v.trim().length > 1 && v.length < 50) villes.add(casse(v.trim()));
    }
  };
  for (const o of objets) {
    ajouter(o.address);
    ajouter((o.location as Json | undefined)?.address);
  }
  return [...villes].slice(0, 4);
}

/* ---------- Logo ---------- */
function urlAbsolue(href: string, base: URL): string | null {
  if (!href || href.startsWith("data:")) return null;
  try {
    const u = new URL(decoderEntites(href), base);
    if (u.protocol === "http:") u.protocol = "https:";
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function trouverLogo(html: string, base: URL): string | null {
  for (const o of objetsJsonLd(html)) {
    const l = o.logo;
    const href = typeof l === "string" ? l : typeof (l as Json | undefined)?.url === "string" ? String((l as Json).url) : "";
    const u = urlAbsolue(href, base);
    if (u) return u;
  }
  const liens = balises(html, "link").map((b) => ({ rel: attribut(b, "rel").toLowerCase(), href: attribut(b, "href"), sizes: attribut(b, "sizes"), type: attribut(b, "type") }));
  const apple = liens.find((l) => l.rel.includes("apple-touch-icon"));
  if (apple) {
    const u = urlAbsolue(apple.href, base);
    if (u) return u;
  }
  const icones = liens
    .filter((l) => /(^|\s)icon(\s|$)/.test(l.rel))
    .map((l) => ({ ...l, taille: l.type.includes("svg") || /\.svg(\?|$)/i.test(l.href) ? 512 : parseInt(l.sizes, 10) || 16 }))
    .sort((a, b) => b.taille - a.taille);
  const grande = icones.find((i) => i.taille >= 96);
  if (grande) {
    const u = urlAbsolue(grande.href, base);
    if (u) return u;
  }
  // Petite icône seulement : on passe par le service d'icônes de Google, qui renvoie la meilleure taille disponible.
  if (icones.length) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(base.hostname)}&sz=128`;
  return null;
}

/* ---------- Outils repérés dans le code de la page ---------- */
const SIGNATURES: [string, string, RegExp][] = [
  ["WordPress", "Site", /wp-content\/|wp-includes\/|generator["'][^>]*wordpress/i],
  ["Wix", "Site", /static\.wixstatic\.com|parastorage\.com|generator["'][^>]*wix\.com/i],
  ["Webflow", "Site", /data-wf-site|assets\.website-files\.com|webflow\.js/i],
  ["Squarespace", "Site", /static1\.squarespace\.com|squarespace-cdn\.com/i],
  ["Framer", "Site", /framerusercontent\.com|framer\.website/i],
  ["Jimdo", "Site", /jimdo(cdn|site|free)?\.com/i],
  ["Hostinger", "Site", /zyrosite\.com|userapp\.zyrosite/i],
  ["Duda", "Site", /irp\.cdn-website\.com|multiscreensite\.com/i],
  ["Drupal", "Site", /generator["'][^>]*drupal|\/sites\/default\/files\//i],
  ["Joomla", "Site", /generator["'][^>]*joomla/i],
  ["Lovable", "Site", /cdn\.gpteng\.co|content=["']Lovable["']/i],
  ["Odoo", "Site", /generator["'][^>]*odoo/i],
  ["Shopify", "Boutique en ligne", /cdn\.shopify\.com|myshopify\.com/i],
  ["WooCommerce", "Boutique en ligne", /woocommerce/i],
  ["PrestaShop", "Boutique en ligne", /prestashop/i],
  ["Calendly", "Prise de rendez-vous", /calendly\.com\//i],
  ["Cal.com", "Prise de rendez-vous", /\/\/(app\.)?cal\.com\//i],
  ["Doctolib", "Prise de rendez-vous", /doctolib\.fr/i],
  ["Planity", "Prise de rendez-vous", /planity\.com/i],
  ["Acuity", "Prise de rendez-vous", /acuityscheduling\.com/i],
  ["Google Agenda", "Prise de rendez-vous", /calendar\.google\.com\/calendar\/(u\/\d\/)?appointments|calendar\.app\.google/i],
  ["HubSpot Meetings", "Prise de rendez-vous", /meetings(-eu1)?\.hubspot\.com/i],
  ["Zenchef", "Réservation", /zenchef/i],
  ["TheFork", "Réservation", /thefork\.|lafourchette/i],
  ["Crisp", "Chat", /client\.crisp\.chat/i],
  ["Intercom", "Chat", /widget\.intercom\.io|intercomcdn\.com/i],
  ["Tawk.to", "Chat", /embed\.tawk\.to/i],
  ["Tidio", "Chat", /code\.tidio\.co/i],
  ["Zendesk", "Chat", /static\.zdassets\.com/i],
  ["WhatsApp", "Chat", /wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\//i],
  ["HubSpot", "CRM et e-mailing", /js(-eu1)?\.hs-scripts\.com|js(-eu1)?\.hsforms\.net|hs-analytics\.net/i],
  ["Brevo", "CRM et e-mailing", /sibforms\.com|sendinblue\.com|brevo\.com/i],
  ["Mailchimp", "CRM et e-mailing", /list-manage\.com|chimpstatic\.com/i],
  ["Klaviyo", "CRM et e-mailing", /klaviyo\.com/i],
  ["ActiveCampaign", "CRM et e-mailing", /activehosted\.com|trackcmp\.net/i],
  ["Salesforce", "CRM et e-mailing", /pardot\.com|force\.com|salesforce\.com/i],
  ["Zoho", "CRM et e-mailing", /zohopublic\.|salesiq\.zoho|zohocdn\.com/i],
  ["Pipedrive", "CRM et e-mailing", /pipedrive(webforms)?\.com/i],
  ["Systeme.io", "CRM et e-mailing", /systeme\.io/i],
  ["Typeform", "Formulaires", /typeform\.com/i],
  ["Tally", "Formulaires", /tally\.so/i],
  ["Jotform", "Formulaires", /jotform\.com/i],
  ["Google Forms", "Formulaires", /docs\.google\.com\/forms|forms\.gle\//i],
  ["Pixel Meta", "Publicité et mesure", /connect\.facebook\.net\/[^"']*fbevents|fbq\(\s*['"]init/i],
  ["Google Ads", "Publicité et mesure", /['"=]AW-\d{6,}/],
  ["Google Analytics", "Publicité et mesure", /gtag\/js\?id=G-|['"]G-[A-Z0-9]{6,}['"]|google-analytics\.com\/(analytics|ga)\.js/],
  ["Google Tag Manager", "Publicité et mesure", /googletagmanager\.com\/gtm\.js|['"]GTM-[A-Z0-9]{4,}['"]/],
  ["LinkedIn Insight", "Publicité et mesure", /snap\.licdn\.com/i],
  ["Pixel TikTok", "Publicité et mesure", /analytics\.tiktok\.com/i],
  ["Microsoft Clarity", "Publicité et mesure", /clarity\.ms\/tag/i],
  ["Hotjar", "Publicité et mesure", /static\.hotjar\.com/i],
  ["Matomo", "Publicité et mesure", /matomo\.(js|php|cloud)|piwik\.(js|php)/i],
  ["Stripe", "Paiement", /js\.stripe\.com|checkout\.stripe\.com|buy\.stripe\.com/i],
  ["PayPal", "Paiement", /paypal\.com\/sdk|paypalobjects\.com/i],
  ["PayPlug", "Paiement", /payplug/i],
  ["Alma", "Paiement", /getalma\.eu|almapay/i],
  ["Trustpilot", "Avis clients", /widget\.trustpilot\.com/i],
  ["Avis Vérifiés", "Avis clients", /netreviews|avis-verifies/i],
  ["Guest Suite", "Avis clients", /guest-suite|guestsuite/i],
];

export function detecterOutils(...pages: string[]): Outil[] {
  const html = pages.join("\n");
  return SIGNATURES.filter(([, , motif]) => motif.test(html)).map(([nom, categorie]) => ({ nom, categorie }));
}

export function fusionnerOutils(...listes: (Outil[] | null | undefined)[]): Outil[] {
  const vus = new Map<string, Outil>();
  for (const l of listes) for (const o of l ?? []) if (!vus.has(o.nom)) vus.set(o.nom, o);
  return [...vus.values()];
}

/* ---------- Niveau 1 : lecture technique ---------- */
export async function lectureTechnique(url: URL) {
  const page = await telechargerPage(url, 6000);
  const objets = objetsJsonLd(page.html);
  return {
    logo: trouverLogo(page.html, page.url),
    outils: detecterOutils(page.html),
    villes: villesJsonLd(objets),
    titre: decoderEntites(page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim().slice(0, 120) || null,
    pages: choisirPages(liensHtml(page.html), page.url),
    html: page.html,
    url: page.url,
  };
}

/* ---------- Choix des pages à lire ---------- */
const MOTS_SERVICES = /(services?|prestations?|offres?|solutions?|expertises?|metiers?|activites?|savoir-faire|produits?|domaines?)/;
const MOTS_APROPOS = /(a-propos|qui-sommes-nous|about|notre-histoire|histoire|entreprise|equipe|notre-agence|agence|cabinet|societe|presentation)/;
const EXCLUS = /(mentions|cgv|cgu|conditions|confidentialit|privacy|cookie|login|connexion|panier|cart|checkout|compte|account|wp-admin|wp-json|feed|tag\/|category\/|\.(pdf|jpe?g|png|webp|gif|svg|zip|docx?|xml)$)/;

function liensHtml(html: string) {
  return balises(html, "a").map((b) => attribut(b, "href")).filter(Boolean);
}

export function choisirPages(liens: string[], base: URL): PageLue[] {
  const hote = base.hostname.replace(/^www\./, "");
  const vus = new Set<string>();
  const candidats: { url: string; chemin: string; profondeur: number }[] = [];
  for (const brut of liens) {
    try {
      const u = new URL(decoderEntites(brut), base);
      if (u.hostname.replace(/^www\./, "") !== hote || !/^https?:$/.test(u.protocol)) continue;
      u.hash = "";
      u.search = "";
      const chemin = decodeURIComponent(u.pathname).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (chemin === "/" || EXCLUS.test(chemin) || vus.has(u.href)) continue;
      vus.add(u.href);
      const profondeur = chemin.split("/").filter(Boolean).length;
      if (profondeur > 2) continue;
      candidats.push({ url: u.href, chemin, profondeur });
    } catch {
      /* lien invalide */
    }
  }
  candidats.sort((a, b) => a.profondeur - b.profondeur || a.chemin.length - b.chemin.length);
  const services = candidats.find((c) => MOTS_SERVICES.test(c.chemin));
  const apropos = candidats.find((c) => c !== services && MOTS_APROPOS.test(c.chemin));
  const pages: PageLue[] = [];
  if (services) pages.push({ url: services.url, libelle: "Services" });
  if (apropos) pages.push({ url: apropos.url, libelle: "À propos" });
  return pages;
}

/* ---------- Firecrawl (connecteur Lovable) ---------- */
type PageFirecrawl = { markdown: string; liens: string[]; html: string };
let routeFirecrawl: string | null = null;

export const firecrawlDisponible = () => !!Deno.env.get("FIRECRAWL_API_KEY");

async function firecrawl(url: string, ms: number): Promise<PageFirecrawl> {
  const cle = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
  const cleLovable = Deno.env.get("LOVABLE_API_KEY") ?? "";
  if (!cle) throw new Error("FIRECRAWL_API_KEY absent");
  // Clé personnelle (fc-…) : appel direct à Firecrawl. Connexion gérée par Lovable : passerelle des connecteurs.
  const passerelle = { Authorization: `Bearer ${cleLovable}`, "X-Connection-Api-Key": cle };
  const routes: { url: string; entetes: Record<string, string> }[] = cle.startsWith("fc-")
    ? [{ url: "https://api.firecrawl.dev/v2/scrape", entetes: { Authorization: `Bearer ${cle}` } }]
    : [
        { url: "https://connector-gateway.lovable.dev/firecrawl/v2/scrape", entetes: passerelle },
        { url: "https://connector-gateway.lovable.dev/firecrawl/v1/scrape", entetes: passerelle },
      ];
  const ordre = routeFirecrawl ? routes.filter((r) => r.url === routeFirecrawl) : routes;
  const corps = JSON.stringify({ url, formats: ["markdown", "links", "rawHtml"], onlyMainContent: false, timeout: Math.max(3000, ms - 1000) });

  for (const r of ordre) {
    const res = await avecDelai(ms, (signal) =>
      fetch(r.url, { method: "POST", signal, headers: { "Content-Type": "application/json", ...r.entetes }, body: corps }),
    );
    if (res.status === 404 || res.status === 405) {
      console.error(`simulateur firecrawl: ${r.url} → ${res.status}`);
      continue;
    }
    if (!res.ok) throw new Error(`firecrawl ${res.status} ${(await res.text()).slice(0, 200)}`);
    routeFirecrawl = r.url;
    const d = (await res.json()) as Json;
    const data = ((d.data ?? d) as Json) ?? {};
    return {
      markdown: String(data.markdown ?? ""),
      liens: Array.isArray(data.links) ? (data.links.filter((x) => typeof x === "string") as string[]) : [],
      html: String(data.rawHtml ?? data.html ?? ""),
    };
  }
  throw new Error("firecrawl : aucune route disponible");
}

function nettoyerMarkdown(md: string) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- Vérification des extraits ---------- */
const plat = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»„"]/g, " ")
    .replace(/[*_#>|\\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function citationVerifiee(citation: string, contenuPlat: string): string | null {
  const c = citation
    .trim()
    .replace(/^(titre|description)\s*:\s*/i, "")
    .replace(/^["'«“\s]+|["'»”\s]+$/g, "");
  if (c.length < 15 || c.length > 200) return null;
  return contenuPlat.includes(plat(c)) ? c : null;
}

/* ---------- Niveau 2 : lecture du contenu ---------- */
const CONSIGNE = `Tu analyses le site d'une entreprise française pour personnaliser un questionnaire.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de la forme :
{"activite":"","secteur":"","services":[""],"clientele":"","citation":"","villes":[""],"polesSuggeres":[""],"tachesParPole":{"<pole>":[""]},"postesSuggeres":[""]}
Règles :
- activite : ce que fait l'entreprise, en une phrase de 15 mots maximum, au présent, sans superlatif.
- secteur : 2 à 4 mots.
- services : 3 à 5 services ou produits réellement présentés sur le site, 2 à 5 mots chacun.
- clientele : les clients visés, en 10 mots maximum (ex. « PME du bâtiment en Hauts-de-France »). Vide si le site ne le dit pas.
- citation : un extrait COPIÉ MOT POUR MOT du contenu, de 5 à 25 mots, qui contient un fait concret propre à l'entreprise : chiffre, ancienneté, nombre de clients ou de réalisations, label, zone d'intervention. Pas de slogan. Vide si aucun fait concret n'existe.
- villes : villes où l'entreprise est implantée, écrites comme dans le contenu, 4 maximum.
- polesSuggeres : 4 à 6 identifiants parmi ${POLES.join(", ")}, du plus au moins chronophage pour ce métier.
- tachesParPole : pour les 4 premiers pôles suggérés, 3 tâches répétitives propres à ce métier, 8 mots maximum chacune, à l'infinitif.
- postesSuggeres : 3 ou 4 intitulés de postes typiques de cette entreprise.
- N'invente rien : chaque information vient du contenu fourni.
- Si le contenu est vide ou illisible, renvoie {}.`;

async function demanderIA(contenu: string): Promise<{ objet: Json; modele: string }> {
  const cle = Deno.env.get("LOVABLE_API_KEY");
  if (!cle) throw new Error("LOVABLE_API_KEY manquant");
  const debut = Date.now();
  const ordre = modeleRetenu ? [modeleRetenu, ...MODELES.filter((m) => m !== modeleRetenu)] : MODELES;
  for (const modele of ordre) {
    const reste = DELAI_IA_MS - (Date.now() - debut);
    if (reste < 2500) break;
    try {
      const reponse = await avecDelai(reste, (signal) =>
        fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
          body: JSON.stringify({
            model: modele,
            messages: [
              { role: "system", content: CONSIGNE },
              { role: "user", content: contenu },
            ],
          }),
        }),
      );
      if (!reponse.ok) {
        console.error(`simulateur ia ${modele}: ${reponse.status}`);
        continue;
      }
      const data = await reponse.json();
      const brut: string = data?.choices?.[0]?.message?.content ?? "";
      const objet = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1));
      modeleRetenu = modele;
      return { objet, modele };
    } catch (e) {
      console.error(`simulateur ia ${modele}:`, String(e));
    }
  }
  throw new Error("lecture IA impossible");
}

function liste(v: unknown, n: number, max: number): string[] {
  return Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim().slice(0, max)).slice(0, n)
    : [];
}

function assainir(o: Json, contenuPlat: string) {
  const poles = liste(o?.polesSuggeres, 6, 30).filter((p) => POLES.includes(p));
  const taches: Record<string, string[]> = {};
  for (const p of POLES) {
    const t = liste((o?.tachesParPole as Json | undefined)?.[p], 3, 70);
    if (t.length) taches[p] = t;
  }
  return {
    activite: texte(o?.activite, 140) || null,
    secteur: texte(o?.secteur, 60) || null,
    services: liste(o?.services, 5, 45),
    clientele: texte(o?.clientele, 90) || null,
    citation: citationVerifiee(texte(o?.citation, 220), contenuPlat),
    villes: liste(o?.villes, 4, 40).filter((v) => contenuPlat.includes(plat(v))),
    polesSuggeres: poles,
    tachesParPole: taches,
    postesSuggeres: liste(o?.postesSuggeres, 4, 50),
  };
}

const TAILLE_PAGE = { accueil: 6000, autre: 3500 };

/**
 * Lit l'accueil et jusqu'à deux pages internes (services, à propos), puis interroge l'IA.
 * `rapide` : sans Firecrawl (garde-fou de coût quand une même adresse IP enchaîne les analyses).
 */
export async function lectureContenu(url: URL, opts: { rapide?: boolean } = {}) {
  const debut = Date.now();
  const avecFirecrawl = firecrawlDisponible() && !opts.rapide;
  // Statut renvoyé au navigateur (sans détail sensible) pour savoir si le connecteur fonctionne.
  let firecrawlStatut = !firecrawlDisponible() ? "non relié" : opts.rapide ? "désactivé (limite)" : "ok";
  const lire = async (u: string): Promise<{ texte: string; html: string; liens: string[]; source: "firecrawl" | "html" } | null> => {
    if (avecFirecrawl) {
      try {
        const p = await firecrawl(u, 10000);
        if (p.markdown.trim().length > 80) return { texte: nettoyerMarkdown(p.markdown), html: p.html, liens: p.liens, source: "firecrawl" };
      } catch (e) {
        const code = String(e).match(/firecrawl (\d{3})/)?.[1];
        firecrawlStatut = code ? `erreur ${code}` : String(e).includes("aucune route") ? "erreur route" : "erreur";
        console.error("simulateur firecrawl:", String(e));
      }
    }
    try {
      const p = await telechargerPage(new URL(u), 6000);
      return { texte: textePage(p.html), html: p.html, liens: liensHtml(p.html), source: "html" };
    } catch {
      return null;
    }
  };

  // L'HTML brut arrive vite : s'il contient déjà des liens utiles, les pages internes partent en même temps que l'accueil.
  const brut = await telechargerPage(url, 5000).catch(() => null);
  const base = brut?.url ?? url;
  let pages = brut ? choisirPages(liensHtml(brut.html), base) : [];
  const accueilP =
    avecFirecrawl || !brut
      ? lire(base.href)
      : Promise.resolve({ texte: textePage(brut.html), html: brut.html, liens: liensHtml(brut.html), source: "html" as const });
  let internesP = Promise.all(pages.map((p) => lire(p.url)));
  const accueil = await accueilP;
  if (!pages.length && accueil && Date.now() - debut < 9000) {
    pages = choisirPages(accueil.liens, base);
    internesP = Promise.all(pages.map((p) => lire(p.url)));
  }
  const internes = await internesP;

  const lues: { page: PageLue; texte: string; html: string; source: string }[] = [];
  if (accueil) lues.push({ page: { url: base.href, libelle: "Accueil" }, texte: accueil.texte, html: accueil.html, source: accueil.source });
  internes.forEach((r, i) => {
    if (r && r.texte.length > 80) lues.push({ page: pages[i], texte: r.texte, html: r.html, source: r.source });
  });
  if (!lues.length) return null;

  const contenu = lues
    .map((l, i) => `## Page : ${l.page.libelle}\n${l.texte.slice(0, i === 0 ? TAILLE_PAGE.accueil : TAILLE_PAGE.autre)}`)
    .join("\n\n");
  // Les pages lues par Firecrawl n'ont pas les balises meta : on les ajoute en tête.
  const meta0 = brut ? textePage(brut.html).split("\n").slice(0, 2).join("\n") : "";
  const entete = lues[0].source === "firecrawl" ? `${meta0}\n\n` : "";
  const { objet, modele } = await demanderIA(`${entete}${contenu}`.slice(0, 14000));
  const contenuPlat = plat(`${meta0}\n${lues.map((l) => l.texte).join("\n")}`);

  return {
    ...assainir(objet, contenuPlat),
    pages: lues.map((l) => l.page),
    outils: detecterOutils(...lues.map((l) => l.html), brut?.html ?? ""),
    logo: trouverLogo(lues[0].html || brut?.html || "", base),
    source: lues.some((l) => l.source === "firecrawl") ? "firecrawl" : "html",
    firecrawl: firecrawlStatut,
    modele,
  };
}
