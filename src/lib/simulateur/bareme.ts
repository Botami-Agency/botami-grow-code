/**
 * Barème du simulateur IA. Calcul déterministe, sans IA, en hypothèse haute.
 * Toutes les constantes sont ici : les modifier ne demande pas de toucher à l'interface.
 */
import {
  ABONNEMENT_PAR_PERSONNE,
  BUDGETS,
  FREINS,
  HEURES_PAR_MOIS,
  OUTILS,
  POLE_PAR_ID,
  TAILLES,
  type BudgetId,
  type FreinId,
  type OutilId,
  type PoleId,
  type TailleId,
} from "./donnees";

export const VERSION_BAREME = 1;
/** Coût employeur mensuel retenu pour un temps plein (hypothèse). */
export const COUT_EMPLOYEUR_MENSUEL = 3500;
/** Part du temps de l'équipe attribuée aux pôles classés 1er, 2e et 3e. */
export const POIDS_RANG = [0.2, 0.15, 0.1];
/** Plafond : jamais plus de 25 % du temps total de l'équipe. */
export const PLAFOND_PART_EQUIPE = 0.25;

export interface EntreeBareme {
  effectif: number | null;
  taille: TailleId | null;
  poles: PoleId[];
  outils: OutilId[];
  freins: FreinId[];
  noteIA: number | null;
  assistants: string[];
  budget: BudgetId | null;
}

export interface Resultat {
  versionBareme: number;
  effectifRetenu: number;
  heuresEquipe: number;
  faisabilite: number;
  usageIA: number;
  potentielRestant: number;
  heuresParMois: number;
  equivalentTempsPlein: number;
  economieParMois: number;
  economieParAn: number;
  coutOutilsMensuel: number;
  coutOutilsTroisAns: number;
  detailPoles: { pole: PoleId; heuresParMois: number }[];
}

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function effectifRetenu(e: Pick<EntreeBareme, "effectif" | "taille">): number {
  if (e.effectif && e.effectif > 0) return Math.min(Math.round(e.effectif), 2000);
  const t = TAILLES.find((x) => x.id === e.taille);
  return t ? t.effectifType : 5;
}

export function calculerResultat(e: EntreeBareme): Resultat {
  const effectif = effectifRetenu(e);
  const heuresEquipe = effectif * HEURES_PAR_MOIS;

  // Faisabilité : les outils structurés aident, le papier, les tableurs maison et les freins pèsent.
  const structurants = e.outils.filter((o) => OUTILS.find((x) => x.id === o)?.structurant).length;
  let faisabilite = 1 + Math.min(0.15, structurants * 0.03);
  if (e.outils.includes("papier")) faisabilite -= 0.1;
  if (e.outils.includes("tableur_maison")) faisabilite -= 0.05;
  for (const f of e.freins) faisabilite -= FREINS.find((x) => x.id === f)?.penalite ?? 0;
  faisabilite = borner(faisabilite, 0.4, 1);

  // Usage actuel de l'IA, de 0 à 100. La note pèse au carré : un 3/10 reste très bas.
  const note = borner(e.noteIA ?? 1, 1, 10);
  const nbAssistants = e.assistants.filter((a) => a !== "aucun").length;
  const maturite = 0.6 + 0.25 * Math.min(1, nbAssistants / 3) + 0.15 * Math.min(1, structurants / 4);
  const usageIA = Math.round(100 * (note / 10) ** 2 * maturite);

  const detailPoles = e.poles.slice(0, 3).map((pole, rang) => ({
    pole,
    heuresParMois:
      heuresEquipe * POIDS_RANG[rang] * POLE_PAR_ID[pole].partAutomatisable * faisabilite * (1 - usageIA / 200),
  }));
  const brut = detailPoles.reduce((s, d) => s + d.heuresParMois, 0);
  const heuresParMois = Math.round(Math.min(brut, heuresEquipe * PLAFOND_PART_EQUIPE));
  const equivalentTempsPlein = Math.round((heuresParMois / HEURES_PAR_MOIS) * 10) / 10;
  const economieParMois = Math.round(((heuresParMois / HEURES_PAR_MOIS) * COUT_EMPLOYEUR_MENSUEL) / 100) * 100;
  const economieParAn = Math.round((economieParMois * 12) / 1000) * 1000;

  const budget = BUDGETS.find((b) => b.id === e.budget);
  const coutOutilsMensuel = budget
    ? budget.mensuel ?? effectif * ABONNEMENT_PAR_PERSONNE
    : 0;

  return {
    versionBareme: VERSION_BAREME,
    effectifRetenu: effectif,
    heuresEquipe: Math.round(heuresEquipe),
    faisabilite: Math.round(faisabilite * 100) / 100,
    usageIA,
    potentielRestant: 100 - usageIA,
    heuresParMois,
    equivalentTempsPlein,
    economieParMois,
    economieParAn,
    coutOutilsMensuel,
    coutOutilsTroisAns: coutOutilsMensuel * 36,
    detailPoles: detailPoles.map((d) => ({ ...d, heuresParMois: Math.round(d.heuresParMois) })),
  };
}

/** Profil d'exemple affiché sur l'accueil (PME de 20 personnes). */
export const EXEMPLE_ACCUEIL: EntreeBareme = {
  effectif: 20,
  taille: "petite",
  poles: ["commercial", "administratif", "finance"],
  outils: ["messagerie", "bureautique", "tableur_maison", "compta"],
  freins: ["par_ou"],
  noteIA: 3,
  assistants: ["chatgpt"],
  budget: "300_800",
};
