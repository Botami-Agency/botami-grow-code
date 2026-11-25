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

export interface OutilRepere {
  nom: string;
  categorie: string;
}

/** Lecture technique du site (sans IA) : logo, outils repérés dans le code, villes du balisage schema.org. */
export interface LectureTechnique {
  logo: string | null;
  outils: OutilRepere[];
  villes: string[];
  titre: string | null;
}

/** Lecture du contenu du site par l'IA. Les champs ajoutés en V2 sont optionnels (parcours déjà en cours). */
export interface LectureSite {
  activite: string | null;
  secteur: string | null;
  polesSuggeres: PoleId[];
  tachesParPole: Partial<Record<PoleId, string[]>>;
  postesSuggeres: string[];
  services?: string[];
  clientele?: string | null;
  citation?: string | null;
  villes?: string[];
  pages?: { url: string; libelle: string }[];
  outils?: OutilRepere[];
  logo?: string | null;
  source?: "firecrawl" | "html";
  firecrawl?: string;
  modele?: string;
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
  technique?: LectureTechnique | null;
  site: LectureSite | null;
  trace: EtapeAnalyse[];
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MOTS_GENERIQUES = new Set(["sarl", "sasu", "eurl", "societe", "entreprise", "groupe", "france", "services", "conseil", "agence"]);
const motsSignificatifs = (s: string) => sansAccents(s).split(/[^a-z0-9]+/).filter((m) => m.length >= 4 && !MOTS_GENERIQUES.has(m));

/**
 * Fiche du registre à retenir. Une correspondance seulement « probable » est écartée quand le site
 * la contredit : ses mots distinctifs (absents du nom saisi) n'apparaissent ni dans le titre du site
 * ni dans l'activité lue. Évite d'afficher l'entreprise d'un homonyme à côté du logo du visiteur.
 */
export function registrePlausible(lookup: ResultatLookup | null, nomSaisi: string): FicheRegistre | null {
  const reg = lookup?.registre ?? null;
  if (!reg || reg.correspondance === "exacte") return reg;
  const t = lookup?.technique ?? null;
  const site = lookup?.site ?? null;
  if (!t && !site) return reg;
  const saisis = new Set(motsSignificatifs(nomSaisi));
  const distinctifs = motsSignificatifs(reg.nom).filter((m) => !saisis.has(m));
  if (!distinctifs.length) return reg;
  const reference = sansAccents(`${t?.titre ?? ""} ${site?.activite ?? ""}`);
  return distinctifs.some((m) => reference.includes(m)) ? reg : null;
}

/** Ce qu'on a trouvé sur le site, niveaux technique et contenu confondus. */
export function trouvaillesSite(lookup: ResultatLookup | null) {
  const t = lookup?.technique ?? null;
  const s = lookup?.site ?? null;
  const outils = [...(t?.outils ?? []), ...(s?.outils ?? [])].filter((o, i, l) => l.findIndex((x) => x.nom === o.nom) === i);
  const villes = [...(s?.villes ?? []), ...(t?.villes ?? [])].filter(
    (v, i, l) => l.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
  );
  // Le service d'icônes de Google n'est qu'un repli : un vrai logo trouvé ailleurs passe devant.
  const logos = [t?.logo, s?.logo].filter((l): l is string => !!l);
  return {
    logo: logos.find((l) => !l.includes("google.com/s2/favicons")) ?? logos[0] ?? null,
    activite: s?.activite ?? null,
    services: s?.services ?? [],
    clientele: s?.clientele ?? null,
    citation: s?.citation ?? null,
    villes: villes.slice(0, 4),
    outils,
    pages: s?.pages ?? [],
  };
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
  /** Nom court de l'outil idéal, donné par l'IA (« générateur de devis »). Repris en tête du lead. */
  projetNom?: string | null;
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
    projetNom: null,
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
