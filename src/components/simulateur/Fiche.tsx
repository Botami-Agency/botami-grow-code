/**
 * Fiche entreprise de la question 2 : registre public et ce qu'on a lu sur le site du visiteur.
 * N'affiche que des éléments trouvés : rien n'est inventé, une ligne vide n'apparaît pas.
 */
import { useState } from "react";
import type { FicheRegistre, trouvaillesSite } from "@/lib/simulateur/parcours";
import { cn } from "@/lib/utils";

type Trouvailles = ReturnType<typeof trouvaillesSite>;

export function LogoEntreprise({ src, nom, taille = "grand" }: { src: string | null; nom: string; taille?: "petit" | "grand" }) {
  const [enErreur, setEnErreur] = useState(false);
  const dim = taille === "petit" ? "w-6 h-6 rounded-md text-[11px]" : "w-14 h-14 rounded-xl text-[20px]";
  if (!src || enErreur) {
    if (taille === "petit") return null;
    return (
      <span className={cn("grid flex-none place-items-center bg-ambre-bg font-display font-semibold text-ambre-dark", dim)} aria-hidden>
        {nom.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      loading="eager"
      onError={() => setEnErreur(true)}
      className={cn("flex-none border border-n-300 bg-white object-contain", dim, taille === "petit" ? "p-0.5" : "p-1.5")}
    />
  );
}

const Pastille = ({ children, titre }: { children: React.ReactNode; titre?: string }) => (
  <span title={titre} className="inline-flex items-center rounded-full border border-n-300 bg-cream px-3 py-1 text-[13px] text-ink">
    {children}
  </span>
);

const Ligne = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid gap-1.5 sm:grid-cols-[150px_1fr] sm:gap-4">
    <dt className="pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-n-500">{label}</dt>
    <dd className="text-[15px] text-ink">{children}</dd>
  </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="flex-none rounded-full border border-n-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-n-500">
    {children}
  </span>
);

export function FicheEntreprise({
  nom,
  registre,
  trouvailles: t,
  aDuSite,
  onModifierNom,
  onIgnorerRegistre,
}: {
  nom: string;
  registre: FicheRegistre | null;
  trouvailles: Trouvailles;
  aDuSite: boolean;
  onModifierNom: () => void;
  onIgnorerRegistre: () => void;
}) {
  const champs = registre
    ? ([
        ["Forme", registre.forme],
        ["Créée en", registre.anneeCreation],
        ["Effectif", registre.tranche],
        ["Ville", registre.ville],
        ["Dirigeant", registre.dirigeant],
      ].filter(([, v]) => v) as [string, string][])
    : [];
  const outilsVisibles = t.outils.slice(0, 6);
  const lignesSite = aDuSite && (t.services.length || t.clientele || t.villes.length || t.outils.length);

  return (
    <div className="rounded-band border border-n-300 bg-white p-6 animate-fade-up">
      <div className="flex items-start gap-4">
        {aDuSite && <LogoEntreprise src={t.logo} nom={nom} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <p className="font-display font-semibold text-[20px] leading-tight text-ink">{nom}</p>
            <div className="flex flex-wrap gap-2">
              {registre && <Badge>Registre public</Badge>}
              {aDuSite && <Badge>Lu sur votre site</Badge>}
            </div>
          </div>
          {t.activite && <p className="mt-1.5 text-[14px] text-n-700">{t.activite}</p>}
        </div>
      </div>

      {champs.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {champs.map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-n-500">{k}</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {lignesSite ? (
        <dl className={cn("space-y-3.5", champs.length ? "mt-6 border-t border-n-300 pt-5" : "mt-5")}>
          {t.services.length > 0 && (
            <Ligne label="Services repérés">
              <span className="flex flex-wrap gap-2">
                {t.services.map((s) => (
                  <Pastille key={s}>{s}</Pastille>
                ))}
              </span>
            </Ligne>
          )}
          {t.clientele && <Ligne label="Clientèle visée">{t.clientele}</Ligne>}
          {t.villes.length > 0 && <Ligne label="Implantations">{t.villes.join(" · ")}</Ligne>}
          {t.outils.length > 0 && (
            <Ligne label="Outils détectés">
              <span className="flex flex-wrap gap-2">
                {outilsVisibles.map((o) => (
                  <Pastille key={o.nom} titre={o.categorie}>
                    {o.nom}
                  </Pastille>
                ))}
                {t.outils.length > outilsVisibles.length && <Pastille>+{t.outils.length - outilsVisibles.length}</Pastille>}
              </span>
            </Ligne>
          )}
        </dl>
      ) : null}

      {aDuSite && t.citation && (
        <figure className="mt-5 border-l-2 border-ambre pl-4">
          <blockquote className="text-[15px] italic text-ink">« {t.citation} »</blockquote>
          <figcaption className="mt-1 text-[12px] text-n-500">Extrait de votre site</figcaption>
        </figure>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-n-300 pt-4 text-[13px]">
        <span className="text-n-500">
          {registre?.correspondance === "probable" ? "Plusieurs entreprises portent un nom proche." : "Ce n'est pas votre entreprise ?"}
        </span>
        <button type="button" className="rounded text-ink underline underline-offset-4 hover:text-ambre-dark bo-focus" onClick={onModifierNom}>
          Modifier le nom
        </button>
        {registre && (
          <button type="button" className="rounded text-ink underline underline-offset-4 hover:text-ambre-dark bo-focus" onClick={onIgnorerRegistre}>
            Ignorer la fiche du registre
          </button>
        )}
      </div>
    </div>
  );
}
