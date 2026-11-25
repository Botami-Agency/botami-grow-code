import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, from: vi.fn() } }));

import { resumeLead } from "./api";
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
