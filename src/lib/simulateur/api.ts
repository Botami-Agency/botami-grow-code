/**
 * Échanges du simulateur avec le serveur. Chaque appel échoue en silence :
 * le parcours continue même si une fonction serveur est indisponible.
 */
import { supabase } from "@/integrations/supabase/client";
import { forwardLeadToCrm } from "@/lib/forwardLeadToCrm";
import type { Resultat } from "./bareme";
import { detailParPole, hypothesesCalcul } from "./detail";
import { ASSISTANTS, BUDGETS, FREINS, IMPACTS, OUTILS, POLE_PAR_ID, STATUTS, TAILLES } from "./donnees";
import { registrePlausible, trouvaillesSite, type Contact, type LectureSite, type Parcours, type ResultatLookup } from "./parcours";

export const ROUTE_SIMULATEUR = "/simulateur";

async function appeler<T>(body: Record<string, unknown>, delaiMs: number): Promise<T | null> {
  const minuteur = new Promise<null>((r) => setTimeout(() => r(null), delaiMs));
  const appel = supabase.functions
    .invoke("simulateur", { body })
    .then(({ data, error }) => (error ? null : (data as T)))
    .catch(() => null);
  return Promise.race([appel, minuteur]);
}

/** Registre public + lecture technique du site (logo, outils, villes). Rapide. */
export function analyseRapide(nom: string, siteUrl: string | null) {
  return appeler<Pick<ResultatLookup, "registre" | "candidats" | "technique" | "trace">>(
    { action: "analyse-rapide", nom, siteUrl },
    12000,
  );
}

/** Lecture de 1 à 3 pages du site puis extraction par l'IA. Plus lent (quelques secondes). */
export async function analyseContenu(siteUrl: string) {
  const r = await appeler<{ site: LectureSite | null; trace: ResultatLookup["trace"] }>({ action: "analyse-contenu", siteUrl }, 28000);
  return r?.site ?? null;
}

export async function verifierEmail(email: string): Promise<"ok" | "invalide" | "inconnu"> {
  const r = await appeler<{ statut: "ok" | "invalide" | "inconnu" }>({ action: "verifier-email", email }, 5000);
  return r?.statut ?? "inconnu";
}

export async function verifierSite(url: string): Promise<"ok" | "injoignable" | "invalide" | "inconnu"> {
  const r = await appeler<{ statut: "ok" | "injoignable" | "invalide" | "inconnu" }>({ action: "verifier-site", url }, 5000);
  return r?.statut ?? "inconnu";
}

export function nomEntreprise(p: Parcours) {
  return (!p.ficheIgnoree && registrePlausible(p.lookup, p.nom)?.nom) || p.nom.trim();
}

const libelles = <T extends { id: string; label: string }>(liste: T[], ids: string[]) =>
  ids.map((id) => liste.find((x) => x.id === id)?.label ?? id);

/** Nom court de l'outil idéal (« générateur de devis »). Null si l'IA ne répond pas à temps. */
export async function nommerProjet(outilIdeal: string, secteur: string, delaiMs = 6000) {
  if (outilIdeal.trim().length < 5) return null;
  const r = await appeler<{ projet: string | null }>({ action: "nommer-projet", outilIdeal: outilIdeal.trim(), secteur }, delaiMs);
  return r?.projet ?? null;
}

/**
 * Première ligne du lead. Le CRM la lit pour rédiger le SMS et l'e-mail de bienvenue
 * (« Votre générateur de devis nous intéresse ») : elle doit nommer le projet du prospect,
 * pas l'outil qui a servi à le recueillir.
 */
function ligneProjet(p: Parcours) {
  const outil = p.outilIdeal.trim().replace(/\s+/g, " ");
  if (p.projetNom && outil) return `Projet : ${p.projetNom} (« ${outil} »)`;
  if (outil) return `Projet : « ${outil} »`;
  return "Projet : à préciser lors de l'appel";
}

export function resumeLead(p: Parcours, r: Resultat | null): string {
  const lignes = [
    ligneProjet(p),
    `Source : simulateur IA du site · ${p.poste || STATUTS.find((s) => s.id === p.statut)?.label || "rôle non précisé"} chez ${nomEntreprise(p)}`,
    `Secteur : ${p.secteur || "non précisé"} · Taille : ${TAILLES.find((t) => t.id === p.taille)?.label ?? "?"}${p.effectif ? ` (${p.effectif} salariés)` : ""}`,
    `Pôles : ${p.poles.map((x) => POLE_PAR_ID[x].label).join(", ") || "—"}`,
    // Avec un résultat, les tâches sont détaillées par pôle plus bas.
    ...(r ? [] : [`Tâches : ${p.taches.join(" ; ") || "—"}`]),
    ...(p.tachesLibre.trim() ? [`Tâches ajoutées : « ${p.tachesLibre.trim()} »`] : []),
    `Impacts : ${libelles(IMPACTS, p.impacts).join(" ; ") || "—"}${p.impactAutre ? ` ; « ${p.impactAutre} »` : ""}`,
    `Outils : ${libelles(OUTILS, p.outils).join(", ") || "—"} · Abonnements : ${BUDGETS.find((b) => b.id === p.budget)?.label ?? "?"} par mois`,
    `IA : ${p.noteIA ?? "?"}/10 · ${libelles(ASSISTANTS, p.assistants).join(", ") || "—"}`,
    `Freins : ${libelles(FREINS, p.freins).join(" ; ") || "—"}`,
  ];
  if (r) {
    lignes.push(
      `Résultat affiché : ${r.heuresParMois} h/mois · ${r.equivalentTempsPlein} temps plein · ${r.economieParAn.toLocaleString("fr-FR")} €/an · abonnements sur 3 ans ${r.coutOutilsTroisAns.toLocaleString("fr-FR")} €`,
    );
    // D'où viennent les heures : de quoi répondre au prospect pendant l'appel.
    for (const d of detailParPole(p, r)) {
      lignes.push(`  · ${d.label} ≈ ${d.heures} h/mois${d.taches.length ? ` : ${d.taches.join(" ; ")}` : " (aucune tâche cochée)"}`);
    }
    lignes.push(`Hypothèses du calcul (barème indicatif) : ${hypothesesCalcul(r)}`);
  }
  if (p.siteUrl) lignes.push(`Site : ${p.siteUrl}`);
  const t = trouvaillesSite(p.lookup);
  if (t.services.length) lignes.push(`Services lus sur le site : ${t.services.join(", ")}`);
  if (t.clientele) lignes.push(`Clientèle visée (site) : ${t.clientele}`);
  if (t.outils.length) lignes.push(`Outils repérés sur le site : ${t.outils.map((o) => o.nom).join(", ")}`);
  return lignes.join("\n");
}

export async function enregistrerLead(args: {
  parcours: Parcours;
  resultat: Resultat | null;
  contact: Contact;
  origine: "resultat" | "rappel";
}): Promise<boolean> {
  const { contact, resultat, origine } = args;
  // Le nom du projet est demandé dès la question 10 ; s'il n'est pas encore arrivé, on l'attend un peu.
  let p = args.parcours;
  if (!p.projetNom && p.outilIdeal.trim()) {
    const projetNom = await nommerProjet(p.outilIdeal, p.secteur, 4000).catch(() => null);
    if (projetNom) p = { ...p, projetNom };
  }
  const leadId = crypto.randomUUID();
  const situation = origine === "rappel" ? "Simulateur IA — demande de rappel" : "Simulateur IA";
  const entreprise = nomEntreprise(p) || null;
  const taille = TAILLES.find((t) => t.id === p.taille)?.label ?? null;
  const message = resumeLead(p, resultat);

  // On ne stocke pas la trace technique de l'analyse, seulement ce qui sert au commercial.
  const { lookup, ...reste } = p;
  const reponses = JSON.parse(
    JSON.stringify({
      parcours: { ...reste, registre: lookup?.registre ?? null, technique: lookup?.technique ?? null, site: lookup?.site ?? null },
      resultat,
      information_recontact_affichee: true,
    }),
  );

  const { error } = await supabase.from("leads").insert({
    id: leadId,
    first_name: contact.nom,
    email: contact.email,
    phone: contact.telephone || null,
    company: entreprise,
    company_size: taille,
    source_route: ROUTE_SIMULATEUR,
    situation,
    activite: p.secteur || null,
    message,
    reponses,
    utm_source: p.utm.utm_source ?? null,
    utm_medium: p.utm.utm_medium ?? null,
    utm_campaign: p.utm.utm_campaign ?? null,
    utm_term: p.utm.utm_term ?? null,
  });

  forwardLeadToCrm({
    name: contact.nom,
    email: contact.email,
    phone: contact.telephone || undefined,
    company: entreprise ?? undefined,
    company_size: taille ?? undefined,
    situation,
    message,
    source: ROUTE_SIMULATEUR,
  });

  const templateData = {
    firstName: contact.nom,
    email: contact.email,
    phone: contact.telephone || undefined,
    company: entreprise ?? undefined,
    situation,
    message,
    sourceRoute: ROUTE_SIMULATEUR,
  };
  ["elias@botami-agency.com", "theo@botami-agency.com"].forEach((destinataire) => {
    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "new-lead-notification",
          recipientEmail: destinataire,
          idempotencyKey: `simulateur-${leadId}-${destinataire}`,
          leadId,
          templateData,
        },
      })
      .catch(() => {});
  });

  if (error) console.error("simulateur : enregistrement du lead échoué", error.message);
  return !error;
}

export function envoyerResultatParEmail(p: Parcours, r: Resultat, contact: Contact) {
  void appeler(
    {
      action: "envoyer-resultat",
      email: contact.email,
      prenom: contact.nom.split(" ")[0],
      entreprise: nomEntreprise(p),
      resultat: r,
    },
    15000,
  );
}

type FenetreSuivi = Window & {
  gtag?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
  gtag_report_lead_form?: () => void;
};

export function suivreEvenement(type: "page_view" | "cta_click", nom: string) {
  supabase.from("landing_page_events").insert({ route: ROUTE_SIMULATEUR, event_type: type }).then(() => {});
  try {
    const w = window as FenetreSuivi;
    w.gtag?.("event", nom, { route: ROUTE_SIMULATEUR });
    w.clarity?.("event", nom);
  } catch {
    /* analytics bloqués */
  }
}

/** Conversion « lead » déjà définie dans index.html : Google Ads + Lead Meta. */
export function conversionLead() {
  try {
    (window as FenetreSuivi).gtag_report_lead_form?.();
  } catch {
    /* conversion bloquée */
  }
}
