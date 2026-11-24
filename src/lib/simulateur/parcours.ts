/**
 * État du parcours du simulateur. Gardé dans le sessionStorage : un rechargement
 * de page ne fait rien perdre. Rien n'est envoyé au serveur avant le contact.
 */
import { useCallback, useEffect, useState } from "react";
import type { BudgetId, FreinId, OutilId, PoleId, StatutId, TailleId } from "./donnees";

export type EcranId =
  | "accueil"
  | "q1"
  | "analyse"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9"
  | "q10"
  | "resultat";

export const ORDRE_ECRANS: EcranId[] = ["accueil", "q1", "analyse", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "resultat"];

export interface FicheRegistre {
  nom: string;
  siren: string | null;
  correspondance: "exacte" | "probable";
  forme: string | null;
  anneeCreation: string | null;
  ville: string | null;
  dirigeant: string | null;
  tranche: string | null;
  effectif: number | null;
  naf: string | null;
  secteur: string | null;
}

export interface LectureSite {
  activite: string | null;
  secteur: string | null;
  polesSuggeres: PoleId[];
  tachesParPole: Partial<Record<PoleId, string[]>>;
  postesSuggeres: string[];
}

export interface EtapeAnalyse {
  id: string;
  label: string;
  status: "ok" | "vide" | "erreur";
  ms: number;
}

export interface ResultatLookup {
  registre: FicheRegistre | null;
  candidats: { nom: string; ville: string | null }[];
  site: LectureSite | null;
  trace: EtapeAnalyse[];
}

export interface Contact {
  nom: string;
  email: string;
  telephone: string;
  le: string;
}

export interface Parcours {
  version: 1;
  sessionId: string;
  debut: string;
  ecran: EcranId;
  nom: string;
  aSite: boolean | null;
  siteUrl: string;
  lookup: ResultatLookup | null;
  ficheIgnoree: boolean;
  secteur: string;
  effectif: number | null;
  taille: TailleId | null;
  statut: StatutId | null;
  poste: string;
  posteAutre: string;
  poles: PoleId[];
  taches: string[];
  tachesLibre: string;
  impacts: string[];
  impactAutre: string;
  outils: OutilId[];
  budget: BudgetId | null;
  noteIA: number | null;
  assistants: string[];
  usages: string[];
  freins: FreinId[];
  outilIdeal: string;
  contact: Contact | null;
  rappel: Contact | null;
  utm: Record<string, string>;
}

const CLE = "botami.simulateur.v1";

function lireUtm(): Record<string, string> {
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]) {
    const v = p.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }
  return utm;
}

export function nouveauParcours(): Parcours {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    debut: new Date().toISOString(),
    ecran: "accueil",
    nom: "",
    aSite: null,
    siteUrl: "",
    lookup: null,
    ficheIgnoree: false,
    secteur: "",
    effectif: null,
    taille: null,
    statut: null,
    poste: "",
    posteAutre: "",
    poles: [],
    taches: [],
    tachesLibre: "",
    impacts: [],
    impactAutre: "",
    outils: [],
    budget: null,
    noteIA: null,
    assistants: [],
    usages: [],
    freins: [],
    outilIdeal: "",
    contact: null,
    rappel: null,
    utm: lireUtm(),
  };
}

function charger(): Parcours {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (brut) {
      const p = JSON.parse(brut) as Parcours;
      if (p?.version === 1 && p.sessionId) {
        const utm = lireUtm();
        return Object.keys(utm).length ? { ...p, utm: { ...p.utm, ...utm } } : p;
      }
    }
  } catch {
    /* stockage indisponible : on repart de zéro */
  }
  return nouveauParcours();
}

export function useParcours() {
  const [parcours, setParcours] = useState<Parcours>(charger);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE, JSON.stringify(parcours));
    } catch {
      /* navigation privée stricte : l'état reste en mémoire */
    }
  }, [parcours]);

  const maj = useCallback((modif: Partial<Parcours> | ((p: Parcours) => Partial<Parcours>)) => {
    setParcours((p) => ({ ...p, ...(typeof modif === "function" ? modif(p) : modif) }));
  }, []);

  const recommencer = useCallback(() => setParcours({ ...nouveauParcours(), ecran: "q1" }), []);

  return { parcours, maj, recommencer };
}
