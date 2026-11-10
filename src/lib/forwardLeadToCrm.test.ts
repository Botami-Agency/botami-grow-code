import { afterEach, describe, expect, it, vi } from "vitest";
import { forwardLeadToCrm } from "./forwardLeadToCrm";

const lead = { name: "Marie", email: "marie@acme.fr", message: "Un devis ?", source: "/" };

describe("forwardLeadToCrm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envoie le lead à l'entrée publique du CRM", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    forwardLeadToCrm(lead);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/public-booking");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toEqual({ action: "site_form", ...lead });
  });

  it("ne gêne pas le visiteur si le CRM ne répond pas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("panne")));

    expect(() => forwardLeadToCrm(lead)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve));
  });
});
