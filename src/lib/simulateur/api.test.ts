import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, from: vi.fn() } }));

import { resumeLead } from "./api";
import { calculerResultat } from "./bareme";
import { detailParPole } from "./detail";
import { nouveauParcours } from "./parcours";

describe("résumé du lead envoyé au CRM", () => {
  const base = () => ({ ...nouveauParcours(), nom: "Alp-Audio", poste: "Gérant" });

  it("commence par le projet nommé, pas par l'outil qui l'a recueilli", () => {
    const lignes = resumeLead({ ...base(), outilIdeal: "préparer mes devis  pour moi ", projetNom: "générateur de devis" }, null).split("\n");
    expect(lignes[0]).toBe("Projet : générateur de devis (« préparer mes devis pour moi »)");
    expect(lignes[1]).toBe("Source : simulateur IA du site · Gérant chez Alp-Audio");
    expect(lignes[0]).not.toMatch(/simulateur/i);
  });

  it("reprend la description brute si le nom n'est pas arrivé", () => {
    expect(resumeLead({ ...base(), outilIdeal: "préparer mes devis" }, null).split("\n")[0]).toBe("Projet : « préparer mes devis »");
  });

  it("reste neutre pour une demande de rappel sans outil idéal", () => {
    expect(resumeLead(base(), null).split("\n")[0]).toBe("Projet : à préciser lors de l'appel");
  });
});

describe("détail du calcul par pôle", () => {
  const parcours = () => ({
    ...nouveauParcours(),
    nom: "Alp-Audio",
    statut: "dirigeant" as const,
    taille: "micro" as const,
    poles: ["administratif", "commercial", "rh"] as ("administratif" | "commercial" | "rh")[],
    taches: [] as string[],
    outils: [],
    freins: [],
    noteIA: 3,
  });

  it("relie chaque pôle à ses tâches cochées et retombe sur le total affiché", () => {
    const p = parcours();
    const r0 = calculerResultat({ effectif: null, taille: p.taille, poles: p.poles, outils: [], freins: [], noteIA: 3, assistants: [], budget: null });
    const d0 = detailParPole(p, r0);
    expect(d0.map((d) => d.label).length).toBe(3);
    const somme = d0.reduce((s, d) => s + d.heures, 0);
    expect(Math.abs(somme - r0.heuresParMois)).toBeLessThanOrEqual(2);
    expect(d0.every((d) => d.taches.length === 0)).toBe(true);
  });

  it("ajoute le détail et les hypothèses au résumé du lead", () => {
    const p = parcours();
    const r = calculerResultat({ effectif: null, taille: p.taille, poles: p.poles, outils: [], freins: [], noteIA: 3, assistants: [], budget: null });
    const texte = resumeLead(p, r);
    expect(texte).toMatch(/· Administratif ≈ \d+ h\/mois/);
    expect(texte).toMatch(/Hypothèses du calcul \(barème indicatif\) : 5 pers\./);
    expect(texte).not.toMatch(/^Tâches :/m);
  });
});
