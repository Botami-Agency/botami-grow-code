/**
 * Échanges du simulateur avec le serveur. Chaque appel échoue en silence :
 * le parcours continue même si une fonction serveur est indisponible.
 */
import { supabase } from "@/integrations/supabase/client";
import { forwardLeadToCrm } from "@/lib/forwardLeadToCrm";
import type { Resultat } from "./bareme";
import { ASSISTANTS, BUDGETS, FREINS, IMPACTS, OUTILS, POLE_PAR_ID, STATUTS, TAILLES } from "./donnees";
import type { Contact, Parcours, ResultatLookup } from "./parcours";

export const ROUTE_SIMULATEUR = "/simulateur";

async function appeler<T>(body: Record<string, unknown>, delaiMs: number): Promise<T | null> {
  const minuteur = new Promise<null>((r) => setTimeout(() => r(null), delaiMs));
  const appel = supabase.functions
    .invoke("simulateur", { body })
    .then(({ data, error }) => (error ? null : (data as T)))
    .catch(() => null);
  return Promise.race([appel, minuteur]);
}

export function rechercherEntreprise(nom: string, siteUrl: string | null) {
  return appeler<ResultatLookup>({ action: "lookup", nom, siteUrl }, 20000);
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
  return (!p.ficheIgnoree && p.lookup?.registre?.nom) || p.nom.trim();
}

const libelles = <T extends { id: string; label: string }>(liste: T[], ids: string[]) =>
  ids.map((id) => liste.find((x) => x.id === id)?.label ?? id);

export function resumeLead(p: Parcours, r: Resultat | null): string {
  const lignes = [
    `Simulateur IA — ${p.poste || STATUTS.find((s) => s.id === p.statut)?.label || "rôle non précisé"} chez ${nomEntreprise(p)}`,
    `Secteur : ${p.secteur || "non précisé"} · Taille : ${TAILLES.find((t) => t.id === p.taille)?.label ?? "?"}${p.effectif ? ` (${p.effectif} salariés)` : ""}`,
    `Pôles : ${p.poles.map((x) => POLE_PAR_ID[x].label).join(", ") || "—"}`,
    `Tâches : ${p.taches.join(" ; ") || "—"}${p.tachesLibre ? ` ; « ${p.tachesLibre} »` : ""}`,
    `Impacts : ${libelles(IMPACTS, p.impacts).join(" ; ") || "—"}${p.impactAutre ? ` ; « ${p.impactAutre} »` : ""}`,
    `Outils : ${libelles(OUTILS, p.outils).join(", ") || "—"} · Abonnements : ${BUDGETS.find((b) => b.id === p.budget)?.label ?? "?"} par mois`,
    `IA : ${p.noteIA ?? "?"}/10 · ${libelles(ASSISTANTS, p.assistants).join(", ") || "—"}`,
    `Freins : ${libelles(FREINS, p.freins).join(" ; ") || "—"}`,
    `Outil idéal : ${p.outilIdeal ? `« ${p.outilIdeal} »` : "—"}`,
  ];
  if (r) {
    lignes.push(
      `Résultat affiché : ${r.heuresParMois} h/mois · ${r.equivalentTempsPlein} temps plein · ${r.economieParAn.toLocaleString("fr-FR")} €/an · abonnements sur 3 ans ${r.coutOutilsTroisAns.toLocaleString("fr-FR")} €`,
    );
  }
  if (p.siteUrl) lignes.push(`Site : ${p.siteUrl}`);
  return lignes.join("\n");
}

export async function enregistrerLead(args: {
  parcours: Parcours;
  resultat: Resultat | null;
  contact: Contact;
  origine: "resultat" | "rappel";
}): Promise<boolean> {
  const { parcours: p, resultat, contact, origine } = args;
  const leadId = crypto.randomUUID();
  const situation = origine === "rappel" ? "Simulateur IA — demande de rappel" : "Simulateur IA";
  const entreprise = nomEntreprise(p) || null;
  const taille = TAILLES.find((t) => t.id === p.taille)?.label ?? null;
  const message = resumeLead(p, resultat);

  // On ne stocke pas la trace technique de l'analyse, seulement ce qui sert au commercial.
  const { lookup, ...reste } = p;
  const reponses = JSON.parse(
    JSON.stringify({
      parcours: { ...reste, registre: lookup?.registre ?? null, site: lookup?.site ?? null },
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
