import { describe, expect, it } from "vitest";
import { calculerResultat, EXEMPLE_ACCUEIL, type EntreeBareme } from "./bareme";

const base: EntreeBareme = { ...EXEMPLE_ACCUEIL };

describe("barème du simulateur", () => {
  it("donne un résultat cohérent pour l'exemple de l'accueil", () => {
    const r = calculerResultat(base);
    expect(r.effectifRetenu).toBe(20);
    expect(r.usageIA).toBeGreaterThan(0);
    expect(r.usageIA).toBeLessThan(15);
    expect(r.potentielRestant).toBe(100 - r.usageIA);
    expect(r.heuresParMois).toBeGreaterThan(300);
    expect(r.equivalentTempsPlein).toBeCloseTo(r.heuresParMois / 151.67, 1);
    expect(r.economieParMois % 100).toBe(0);
    expect(r.coutOutilsTroisAns).toBe(800 * 36);
  });

  it("ne dépasse jamais 25 % du temps de l'équipe", () => {
    const r = calculerResultat({ ...base, poles: ["reporting", "administratif", "comptabilite"], noteIA: 1, freins: [] });
    expect(r.heuresParMois).toBeLessThanOrEqual(Math.round(r.heuresEquipe * 0.25));
  });

  it("baisse le gain quand l'IA est déjà très utilisée", () => {
    const faible = calculerResultat({ ...base, noteIA: 2 });
    const forte = calculerResultat({ ...base, noteIA: 9 });
    expect(forte.usageIA).toBeGreaterThan(faible.usageIA);
    expect(forte.heuresParMois).toBeLessThan(faible.heuresParMois);
  });

  it("applique les freins et le papier à la faisabilité, sans descendre sous 0,4", () => {
    const r = calculerResultat({
      ...base,
      outils: ["papier", "tableur_maison"],
      freins: ["donnees", "equipe", "budget", "temps", "competences", "confiance", "decu", "par_ou"],
    });
    expect(r.faisabilite).toBeCloseTo(0.42, 2);
    expect(r.faisabilite).toBeGreaterThanOrEqual(0.4);
  });

  it("utilise la taille quand l'effectif manque, et 60 € par personne si le budget est inconnu", () => {
    const r = calculerResultat({ ...base, effectif: null, taille: "moyenne", budget: "inconnu" });
    expect(r.effectifRetenu).toBe(100);
    expect(r.coutOutilsMensuel).toBe(6000);
  });

  it("ne compte que les trois premiers pôles", () => {
    const r = calculerResultat({ ...base, poles: ["commercial", "administratif", "finance", "rh"] });
    expect(r.detailPoles).toHaveLength(3);
  });
});
