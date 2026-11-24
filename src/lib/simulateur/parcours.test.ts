import { describe, expect, it } from "vitest";
import { registrePlausible, trouvaillesSite, type ResultatLookup } from "./parcours";

describe("fiche du registre et trouvailles du site", () => {
  const fiche = (nom: string, correspondance: "exacte" | "probable") => ({
    nom, siren: null, correspondance, forme: null, anneeCreation: null, ville: null, dirigeant: null,
    tranche: null, effectif: 8, naf: null, secteur: null,
  });
  const lookup = (reg: ReturnType<typeof fiche> | null, titre: string | null): ResultatLookup => ({
    registre: reg, candidats: [], trace: [], site: null,
    technique: titre === null ? null : { logo: null, outils: [], villes: [], titre },
  });

  it("garde une correspondance exacte", () => {
    expect(registrePlausible(lookup(fiche("Menuiserie Dupont", "exacte"), "Autre chose"), "Menuiserie Dupont")).not.toBeNull();
  });
  it("écarte un homonyme probable que le site contredit", () => {
    const l = lookup(fiche("Le Plombier Gentleman (pg)", "probable"), "Artisan Plombier Dépannage Express 24/7");
    expect(registrePlausible(l, "plombier lille")).toBeNull();
  });
  it("garde une correspondance probable sans site pour recouper", () => {
    expect(registrePlausible(lookup(fiche("Le Plombier Gentleman", "probable"), null), "plombier lille")).not.toBeNull();
  });
  it("garde une correspondance probable sans mot distinctif", () => {
    expect(registrePlausible(lookup(fiche("Botami", "probable"), "Botami — Agence marketing"), "Botami Agency")).not.toBeNull();
  });
  it("préfère un vrai logo au service d'icônes de Google", () => {
    const l: ResultatLookup = {
      registre: null, candidats: [], trace: [],
      technique: { logo: "https://www.google.com/s2/favicons?domain=x.fr&sz=128", outils: [{ nom: "WordPress", categorie: "Site" }], villes: ["Lille"], titre: null },
      site: { activite: null, secteur: null, polesSuggeres: [], tachesParPole: {}, postesSuggeres: [], logo: "https://x.fr/logo.png", villes: ["lille", "Roubaix"], outils: [{ nom: "WordPress", categorie: "Site" }, { nom: "Stripe", categorie: "Paiement" }] },
    };
    const t = trouvaillesSite(l);
    expect(t.logo).toBe("https://x.fr/logo.png");
    expect(t.outils.map((o) => o.nom)).toEqual(["WordPress", "Stripe"]);
    expect(t.villes).toEqual(["lille", "Roubaix"]);
  });
});
