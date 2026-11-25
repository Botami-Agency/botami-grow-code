/**
 * Illustration animée de l'écran d'analyse : une fenêtre de navigateur « lue » par l'IA.
 * Elle se remplit avec ce qui a réellement été trouvé (logo, outils, villes, services) :
 * rien n'y est inventé, les barres grises ne sont qu'un décor de page.
 */
import { Check, Globe, Landmark, MapPin, ScanSearch, Sparkles, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoEntreprise } from "./Fiche";

export interface TrouvaillesAnalyse {
  logo: string | null;
  outils: string[];
  villes: string[];
  services: string[];
  registre: string | null;
}

const LIGNES = ["w-11/12", "w-9/12", "w-10/12", "w-7/12", "w-8/12", "w-6/12"];

function Pastille({ icone: Icone, children, delai }: { icone: LucideIcon; children: React.ReactNode; delai: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-ambre/30 bg-white px-2.5 py-1 text-[12px] font-medium text-ink shadow-[0_2px_8px_rgba(26,26,26,0.06)] animate-fade-up"
      style={{ animationDelay: `${delai}ms`, animationFillMode: "both" }}
    >
      <Icone className="w-3.5 h-3.5 text-ambre-dark" aria-hidden />
      {children}
    </span>
  );
}

export function IllustrationLecture({
  site,
  nom,
  enCours,
  t,
}: {
  site: string | null;
  nom: string;
  enCours: boolean;
  t: TrouvaillesAnalyse;
}) {
  const hote = site ? site.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null;
  const pastilles: { icone: LucideIcon; texte: string }[] = [
    ...(t.registre ? [{ icone: Landmark, texte: t.registre }] : []),
    ...t.services.slice(0, 3).map((s) => ({ icone: Sparkles, texte: s })),
    ...t.outils.slice(0, 3).map((o) => ({ icone: Wrench, texte: o })),
    ...t.villes.slice(0, 2).map((v) => ({ icone: MapPin, texte: v })),
  ];

  return (
    <figure className="relative" aria-hidden>
      <style>{`@keyframes bo-scan{0%{transform:translateY(-120%)}100%{transform:translateY(520%)}}`}</style>
      <div className="relative overflow-hidden rounded-band border border-n-300 bg-white shadow-[0_24px_60px_-28px_rgba(26,26,26,0.25)]">
        {/* Barre du navigateur */}
        <div className="flex items-center gap-3 border-b border-n-300 bg-cream/70 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-n-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-n-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-n-300" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-n-300 bg-white px-3 py-1 text-[12px] text-n-700">
            {hote ? <Globe className="w-3.5 h-3.5 flex-none text-n-500" /> : <Landmark className="w-3.5 h-3.5 flex-none text-n-500" />}
            <span className="truncate">{hote ?? "Registre public des entreprises"}</span>
          </span>
        </div>

        {/* Page lue */}
        <div className="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3">
            {t.logo ? (
              <LogoEntreprise src={t.logo} nom={nom} />
            ) : (
              <span className="w-14 h-14 flex-none rounded-xl bg-n-300/50" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-semibold text-[17px] text-ink">{nom}</p>
              <span className="mt-2 block h-2 w-7/12 rounded-full bg-n-300/60" />
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            {LIGNES.map((l, i) => (
              <span key={i} className={cn("block h-2 rounded-full bg-n-300/45", l, i > 3 && "hidden sm:block")} />
            ))}
          </div>

          <div className="mt-5 flex min-h-[64px] flex-wrap content-start gap-2">
            {pastilles.map((x, i) => (
              <Pastille key={`${x.texte}-${i}`} icone={x.icone} delai={i * 120}>
                {x.texte}
              </Pastille>
            ))}
          </div>

          {/* Faisceau de lecture */}
          {enCours && (
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-16 motion-reduce:hidden"
              style={{
                background: "linear-gradient(180deg, transparent, rgba(196,135,44,0.16) 55%, rgba(196,135,44,0.32) 92%, transparent)",
                animation: "bo-scan 2.6s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Pastille d'état */}
      <span
        className={cn(
          "absolute -top-3 -right-3 grid place-items-center w-11 h-11 rounded-full text-white shadow-lg transition-colors",
          enCours ? "bg-ambre" : "bg-[#10B981]",
        )}
      >
        {enCours ? <ScanSearch className="w-5 h-5 motion-safe:animate-pulse" /> : <Check className="w-5 h-5" strokeWidth={3} />}
      </span>
    </figure>
  );
}
