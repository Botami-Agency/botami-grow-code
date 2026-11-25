/**
 * Données du simulateur IA (/simulateur) : options des questions et tâches par pôle.
 * Textes écrits pour Botami : phrases courtes, « on » pour Botami, « vous » pour le visiteur.
 */
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Briefcase,
  Building,
  Building2,
  Calculator,
  ChartColumn,
  CircleMinus,
  Clock,
  Compass,
  Contact,
  Factory,
  FileText,
  FolderOpen,
  Frown,
  GraduationCap,
  Handshake,
  Hourglass,
  Languages,
  Laptop,
  Lightbulb,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
  NotebookPen,
  Package,
  PenLine,
  PiggyBank,
  Receipt,
  Scale,
  ScrollText,
  Search,
  Sheet,
  ShieldQuestion,
  ShoppingCart,
  Signature,
  Snail,
  Sparkles,
  SpellCheck,
  SquareKanban,
  ThumbsDown,
  TrendingDown,
  TriangleAlert,
  User,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  Workflow,
} from "lucide-react";

export const HEURES_PAR_MOIS = 151.67;

/* ---------- Taille d'entreprise ---------- */
export type TailleId = "seul" | "micro" | "petite" | "moyenne" | "grande";
export const TAILLES: { id: TailleId; label: string; effectifType: number; icone: LucideIcon }[] = [
  { id: "seul", label: "Je suis seul", effectifType: 1, icone: User },
  { id: "micro", label: "2 à 9 personnes", effectifType: 5, icone: Users },
  { id: "petite", label: "10 à 49 personnes", effectifType: 20, icone: Building },
  { id: "moyenne", label: "50 à 249 personnes", effectifType: 100, icone: Building2 },
  { id: "grande", label: "250 personnes et plus", effectifType: 300, icone: Factory },
];

export function tailleDepuisEffectif(effectif: number | null): TailleId | null {
  if (effectif === null || !isFinite(effectif) || effectif < 1) return null;
  if (effectif <= 1) return "seul";
  if (effectif <= 9) return "micro";
  if (effectif <= 49) return "petite";
  if (effectif <= 249) return "moyenne";
  return "grande";
}

/* ---------- Rôle ---------- */
export type StatutId = "dirigeant" | "salarie" | "alternant" | "independant";
export const STATUTS: { id: StatutId; label: string; icone: LucideIcon }[] = [
  { id: "dirigeant", label: "Dirigeant", icone: Briefcase },
  { id: "salarie", label: "Salarié", icone: Laptop },
  { id: "alternant", label: "Alternant ou stagiaire", icone: GraduationCap },
  { id: "independant", label: "Indépendant", icone: User },
];

export const POSTES_DIRIGEANT = [
  { label: "Gérant", hint: "Je dirige la société" },
  { label: "Président", hint: "Je préside la SAS" },
  { label: "Directeur général", hint: "Je pilote l'activité" },
  { label: "Associé", hint: "Je codirige avec d'autres" },
];

export const POSTES_SUPPORT = [
  { label: "Responsable commercial", hint: "Je développe les ventes" },
  { label: "Responsable administratif et financier", hint: "Je tiens la gestion" },
  { label: "Assistant de direction", hint: "J'appuie la direction" },
  { label: "Responsable des opérations", hint: "Je fais tourner la production" },
  { label: "Responsable RH", hint: "Je gère l'équipe" },
  { label: "Comptable", hint: "Je tiens les comptes" },
  { label: "Chef de projet", hint: "Je coordonne les projets" },
];

/* ---------- Pôles et tâches ---------- */
export type PoleId =
  | "commercial"
  | "finance"
  | "administratif"
  | "rh"
  | "comptabilite"
  | "reporting"
  | "production"
  | "service_client"
  | "marketing"
  | "logistique"
  | "achats"
  | "juridique"
  | "management"
  | "pilotage";

export interface Pole {
  id: PoleId;
  label: string;
  hint: string;
  icone: LucideIcon;
  /** Part du temps du pôle qu'on estime automatisable (hypothèse haute). */
  partAutomatisable: number;
  decision: string[];
  execution: string[];
}

export const POLES: Pole[] = [
  {
    id: "commercial",
    label: "Commercial",
    hint: "Prospection, devis, relances",
    icone: Handshake,
    partAutomatisable: 0.3,
    decision: ["Valider les devis avant envoi", "Arbitrer les remises", "Suivre le pipeline des affaires", "Préparer les rendez-vous clés"],
    execution: ["Rédiger les devis", "Relancer les prospects", "Mettre à jour le fichier clients", "Préparer les propositions commerciales", "Saisir les commandes", "Répondre aux demandes de prix"],
  },
  {
    id: "finance",
    label: "Finance",
    hint: "Facturation, encaissements, trésorerie",
    icone: Wallet,
    partAutomatisable: 0.3,
    decision: ["Suivre la trésorerie", "Valider les dépenses", "Décider des relances clients", "Préparer les échanges avec la banque"],
    execution: ["Éditer les factures", "Relancer les impayés", "Rapprocher les paiements", "Suivre les échéances fournisseurs", "Préparer les prévisions de trésorerie", "Contrôler les notes de frais"],
  },
  {
    id: "administratif",
    label: "Administratif",
    hint: "Dossiers, saisies, courriers",
    icone: FolderOpen,
    partAutomatisable: 0.45,
    decision: ["Vérifier les dossiers avant envoi", "Suivre les échéances administratives", "Répartir les dossiers dans l'équipe", "Signer les documents officiels"],
    execution: ["Classer les documents", "Ressaisir les mêmes informations", "Rédiger les courriers", "Traiter les e-mails entrants", "Remplir les formulaires", "Archiver les dossiers"],
  },
  {
    id: "rh",
    label: "Ressources humaines",
    hint: "Recrutement, plannings, congés",
    icone: Users,
    partAutomatisable: 0.3,
    decision: ["Valider les recrutements", "Arbitrer les congés", "Préparer les entretiens annuels", "Suivre la masse salariale"],
    execution: ["Trier les candidatures", "Organiser les entretiens", "Gérer les plannings", "Préparer les éléments de paie", "Accueillir les nouveaux arrivants", "Suivre les absences"],
  },
  {
    id: "comptabilite",
    label: "Comptabilité",
    hint: "Pièces, rapprochements, TVA",
    icone: Calculator,
    partAutomatisable: 0.4,
    decision: ["Valider la clôture du mois", "Suivre les déclarations de TVA", "Échanger avec l'expert-comptable", "Contrôler les écritures sensibles"],
    execution: ["Saisir les pièces comptables", "Rapprocher les relevés bancaires", "Classer les justificatifs", "Préparer la TVA", "Lettrer les comptes clients", "Envoyer les données au cabinet"],
  },
  {
    id: "reporting",
    label: "Reporting",
    hint: "Tableaux de bord, chiffres du mois",
    icone: ChartColumn,
    partAutomatisable: 0.5,
    decision: ["Analyser les chiffres du mois", "Choisir les indicateurs à suivre", "Présenter les résultats", "Décider des actions correctives"],
    execution: ["Compiler les tableaux de bord", "Extraire les données de plusieurs outils", "Mettre à jour les fichiers Excel", "Préparer les reportings clients", "Vérifier la cohérence des chiffres", "Envoyer les rapports de la semaine"],
  },
  {
    id: "production",
    label: "Production",
    hint: "Fabrication, chantiers, exécution",
    icone: Factory,
    partAutomatisable: 0.15,
    decision: ["Planifier la charge", "Arbitrer les priorités", "Valider la qualité", "Suivre les délais"],
    execution: ["Préparer les plannings d'équipe", "Rédiger les comptes rendus de chantier", "Suivre l'avancement des commandes", "Commander les matériaux", "Remplir les fiches de suivi", "Transmettre les infos au bureau"],
  },
  {
    id: "service_client",
    label: "Service client",
    hint: "Questions, SAV, suivi des demandes",
    icone: MessageCircle,
    partAutomatisable: 0.35,
    decision: ["Suivre la satisfaction client", "Traiter les réclamations sensibles", "Définir les réponses types", "Suivre les délais de réponse"],
    execution: ["Répondre aux questions fréquentes", "Suivre les demandes de SAV", "Informer les clients de l'avancement", "Saisir les tickets", "Rappeler les clients", "Mettre à jour l'historique client"],
  },
  {
    id: "marketing",
    label: "Marketing",
    hint: "Contenus, réseaux, campagnes",
    icone: Megaphone,
    partAutomatisable: 0.35,
    decision: ["Valider les campagnes", "Définir le calendrier éditorial", "Suivre les résultats", "Arbitrer le budget publicitaire"],
    execution: ["Rédiger les publications", "Créer les visuels", "Préparer les newsletters", "Mettre à jour le site", "Suivre les statistiques", "Répondre aux commentaires"],
  },
  {
    id: "logistique",
    label: "Logistique",
    hint: "Stocks, expéditions, livraisons",
    icone: Package,
    partAutomatisable: 0.25,
    decision: ["Suivre les niveaux de stock", "Choisir les transporteurs", "Planifier les livraisons", "Traiter les litiges"],
    execution: ["Préparer les expéditions", "Saisir les bons de livraison", "Faire l'inventaire", "Suivre les colis", "Mettre à jour les stocks", "Organiser les tournées"],
  },
  {
    id: "achats",
    label: "Achats",
    hint: "Fournisseurs, commandes, négociation",
    icone: ShoppingCart,
    partAutomatisable: 0.25,
    decision: ["Négocier avec les fournisseurs", "Valider les commandes", "Comparer les offres", "Suivre les contrats"],
    execution: ["Passer les commandes", "Relancer les fournisseurs", "Vérifier les factures fournisseurs", "Mettre à jour les prix d'achat", "Suivre les réceptions", "Demander des devis"],
  },
  {
    id: "juridique",
    label: "Juridique",
    hint: "Contrats, conformité, litiges",
    icone: Scale,
    partAutomatisable: 0.25,
    decision: ["Valider les contrats", "Suivre la conformité", "Gérer les litiges", "Arbitrer les risques"],
    execution: ["Rédiger les contrats types", "Suivre les échéances des contrats", "Archiver les documents signés", "Préparer les dossiers", "Mettre à jour les CGV", "Répondre aux demandes RGPD"],
  },
  {
    id: "management",
    label: "Management",
    hint: "Points d'équipe, suivi, arbitrages",
    icone: UserCog,
    partAutomatisable: 0.2,
    decision: ["Animer les points d'équipe", "Fixer les objectifs", "Arbitrer les priorités", "Suivre la performance"],
    execution: ["Préparer les réunions", "Rédiger les comptes rendus", "Suivre les tâches de l'équipe", "Répondre aux questions internes", "Mettre à jour les procédures", "Former les nouveaux"],
  },
  {
    id: "pilotage",
    label: "Pilotage stratégique",
    hint: "Objectifs, priorités, décisions",
    icone: Compass,
    partAutomatisable: 0.15,
    decision: ["Fixer la stratégie", "Suivre les indicateurs clés", "Préparer les décisions d'investissement", "Arbitrer les projets"],
    execution: ["Préparer les comités", "Consolider les chiffres", "Faire la veille du marché", "Rédiger les notes de synthèse", "Suivre les projets transverses", "Mettre à jour le plan d'action"],
  },
];

export const POLE_PAR_ID = Object.fromEntries(POLES.map((p) => [p.id, p])) as Record<PoleId, Pole>;
export const estPole = (v: string): v is PoleId => v in POLE_PAR_ID;

/**
 * 6 tâches par pôle. Un dirigeant d'une équipe de 10 personnes ou plus voit d'abord
 * les tâches de décision. Les tâches tirées du site passent en tête.
 */
export function tachesDuPole(pole: PoleId, dirigeant: boolean, effectif: number, duSite: string[] = []): string[] {
  const p = POLE_PAR_ID[pole];
  const ordre = dirigeant && effectif >= 10 ? [...p.decision, ...p.execution] : [...p.execution, ...p.decision];
  const vues = new Set<string>();
  return [...duSite, ...ordre].filter((t) => {
    const cle = t.toLowerCase();
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  }).slice(0, 6);
}

/* ---------- Impacts ---------- */
export const IMPACTS: { id: string; label: string; icone: LucideIcon }[] = [
  { id: "temps_dirigeant", label: "Elles me prennent du temps personnellement", icone: Clock },
  { id: "temps_equipe", label: "Elles occupent l'équipe au détriment du reste", icone: Users },
  { id: "ventes", label: "Elles ralentissent les ventes", icone: TrendingDown },
  { id: "erreurs", label: "Elles génèrent des erreurs", icone: TriangleAlert },
  { id: "clients", label: "Elles dégradent l'expérience client", icone: Frown },
  { id: "charge", label: "Elles créent de la charge mentale", icone: Brain },
  { id: "croissance", label: "Elles freinent notre croissance", icone: Snail },
];

/* ---------- Outils ---------- */
export type OutilId =
  | "messagerie"
  | "bureautique"
  | "tableur_maison"
  | "crm"
  | "compta"
  | "facturation"
  | "erp"
  | "projet"
  | "rh_paie"
  | "signature"
  | "vente"
  | "stockage"
  | "automatisation"
  | "papier";

export const OUTILS: { id: OutilId; label: string; hint: string; structurant: boolean; icone: LucideIcon }[] = [
  { id: "messagerie", label: "Messagerie et agenda", hint: "Gmail, Outlook", structurant: false, icone: Mail },
  { id: "bureautique", label: "Suite bureautique", hint: "Word, Excel, Google Docs", structurant: false, icone: FileText },
  { id: "tableur_maison", label: "Tableurs faits maison", hint: "Fichiers Excel bricolés", structurant: false, icone: Sheet },
  { id: "crm", label: "CRM", hint: "HubSpot, Pipedrive, Salesforce", structurant: true, icone: Contact },
  { id: "compta", label: "Logiciel de comptabilité", hint: "Pennylane, Sage, QuickBooks", structurant: true, icone: Calculator },
  { id: "facturation", label: "Devis et facturation", hint: "Axonaut, Sellsy, Tiime", structurant: true, icone: Receipt },
  { id: "erp", label: "Logiciel métier ou ERP", hint: "Odoo, Divalto, outil du secteur", structurant: true, icone: Factory },
  { id: "projet", label: "Gestion de projet", hint: "Trello, Notion, Monday", structurant: true, icone: SquareKanban },
  { id: "rh_paie", label: "Paie et RH", hint: "PayFit, Lucca, Silae", structurant: true, icone: Wallet },
  { id: "signature", label: "Signature électronique", hint: "Yousign, Docusign", structurant: true, icone: Signature },
  { id: "vente", label: "Caisse ou e-commerce", hint: "Shopify, WooCommerce, caisse", structurant: true, icone: ShoppingCart },
  { id: "stockage", label: "Fichiers partagés", hint: "Drive, Dropbox, SharePoint", structurant: true, icone: FolderOpen },
  { id: "automatisation", label: "Automatisations", hint: "Zapier, Make, n8n", structurant: true, icone: Workflow },
  { id: "papier", label: "Encore beaucoup de papier", hint: "Carnets, formulaires imprimés", structurant: false, icone: NotebookPen },
];

export type BudgetId = "moins_100" | "100_300" | "300_800" | "800_2000" | "plus_2000" | "inconnu";
/** Montant mensuel retenu : le haut de chaque tranche (hypothèse haute). */
export const BUDGETS: { id: BudgetId; label: string; mensuel: number | null }[] = [
  { id: "moins_100", label: "Moins de 100 €", mensuel: 100 },
  { id: "100_300", label: "100 à 300 €", mensuel: 300 },
  { id: "300_800", label: "300 à 800 €", mensuel: 800 },
  { id: "800_2000", label: "800 à 2 000 €", mensuel: 2000 },
  { id: "plus_2000", label: "Plus de 2 000 €", mensuel: 3500 },
  { id: "inconnu", label: "Je ne sais pas", mensuel: null },
];
/** Si le visiteur ne sait pas : 60 € d'abonnements par personne et par mois. */
export const ABONNEMENT_PAR_PERSONNE = 60;

/* ---------- Usage de l'IA ---------- */
/** `domaine` : site de l'éditeur, d'où vient le logo affiché sur la tuile. */
export const ASSISTANTS: { id: string; label: string; domaine?: string; icone?: LucideIcon }[] = [
  { id: "chatgpt", label: "ChatGPT", domaine: "chatgpt.com" },
  { id: "claude", label: "Claude", domaine: "claude.ai" },
  { id: "gemini", label: "Gemini", domaine: "gemini.google.com" },
  { id: "copilot", label: "Copilot", domaine: "copilot.microsoft.com" },
  { id: "mistral", label: "Le Chat de Mistral", domaine: "mistral.ai" },
  { id: "perplexity", label: "Perplexity", domaine: "perplexity.ai" },
  { id: "deepseek", label: "DeepSeek", domaine: "deepseek.com" },
  { id: "grok", label: "Grok", domaine: "grok.com" },
  { id: "midjourney", label: "Midjourney", domaine: "midjourney.com" },
  { id: "autre", label: "Une autre IA", icone: Sparkles },
  { id: "aucun", label: "Aucune", icone: CircleMinus },
];

export const USAGES: { id: string; label: string; icone: LucideIcon }[] = [
  { id: "emails", label: "Rédiger mes e-mails", icone: Mail },
  { id: "idees", label: "Trouver des idées", icone: Lightbulb },
  { id: "resumes", label: "Résumer des documents", icone: ScrollText },
  { id: "contenu", label: "Rédiger du contenu", icone: PenLine },
  { id: "recherche", label: "Chercher de l'information", icone: Search },
  { id: "traduction", label: "Traduire", icone: Languages },
  { id: "chiffres", label: "Analyser des chiffres", icone: ChartColumn },
  { id: "relecture", label: "Relire et corriger", icone: SpellCheck },
];

/* ---------- Freins ---------- */
export type FreinId = "temps" | "par_ou" | "competences" | "confiance" | "donnees" | "budget" | "equipe" | "decu";
export const FREINS: { id: FreinId; label: string; penalite: number; icone: LucideIcon }[] = [
  { id: "temps", label: "On n'a pas le temps de s'y mettre", penalite: 0.05, icone: Hourglass },
  { id: "par_ou", label: "On ne sait pas par où commencer", penalite: 0.03, icone: Compass },
  { id: "competences", label: "Personne ne maîtrise le sujet en interne", penalite: 0.05, icone: GraduationCap },
  { id: "confiance", label: "On doute de la fiabilité des résultats", penalite: 0.05, icone: ShieldQuestion },
  { id: "donnees", label: "Nos données sont sensibles", penalite: 0.08, icone: Lock },
  { id: "budget", label: "Le budget n'est pas là", penalite: 0.06, icone: PiggyBank },
  { id: "equipe", label: "L'équipe est réticente", penalite: 0.07, icone: UsersRound },
  { id: "decu", label: "On a essayé et on a été déçus", penalite: 0.04, icone: ThumbsDown },
];
