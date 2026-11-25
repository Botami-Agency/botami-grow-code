/**
 * Détail du calcul par pôle, relié aux tâches cochées par le visiteur.
 * Sert au résultat (« d'où viennent ces heures ? ») et au résumé envoyé au CRM,
 * pour que l'équipe puisse expliquer le chiffre pendant l'appel.
 */
import type { Resultat } from "./bareme";
import { HEURES_PAR_MOIS, POLE_PAR_ID, TAILLES, tachesDuPole, type PoleId } from "./donnees";
import type { Parcours } from "./parcours";

export interface DetailPole {
  pole: PoleId;
  label: string;
  heures: number;
  taches: string[];
}

export function detailParPole(p: Parcours, r: Resultat): DetailPole[] {
  const effectif = p.effectif ?? TAILLES.find((t) => t.id === p.taille)?.effectifType ?? 5;
  // Les heures par pôle sont calculées avant le plafond : on les ramène au total affiché.
  const somme = r.detailPoles.reduce((s, d) => s + d.heuresParMois, 0);
  const facteur = somme > 0 ? r.heuresParMois / somme : 0;
  const restantes = new Set(p.taches);
  return r.detailPoles.map((d) => {
    const proposees = tachesDuPole(d.pole, p.statut === "dirigeant", effectif, p.lookup?.site?.tachesParPole?.[d.pole] ?? []);
    const taches = proposees.filter((t) => restantes.has(t));
    taches.forEach((t) => restantes.delete(t));
    return { pole: d.pole, label: POLE_PAR_ID[d.pole].label, heures: Math.round(d.heuresParMois * facteur), taches };
  });
}

/** Les hypothèses du calcul, en une ligne lisible par l'équipe commerciale. */
export function hypothesesCalcul(r: Resultat): string {
  const parts = r.detailPoles.map((d) => Math.round(POLE_PAR_ID[d.pole].partAutomatisable * 100));
  return [
    `${r.effectifRetenu} pers. × ${String(HEURES_PAR_MOIS).replace(".", ",")} h/mois`,
    "pôles pondérés 20 / 15 / 10 % du temps d'équipe",
    `part automatisable des pôles ${parts.join(" / ")} %`,
    `faisabilité ${String(r.faisabilite).replace(".", ",")} (outils et freins)`,
    `usage actuel de l'IA ${r.usageIA} %`,
    "plafond 25 % du temps d'équipe",
  ].join(" ; ");
}
