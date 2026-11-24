/**
 * Atomes d'interface du simulateur : coquille, titres, tuiles de choix, champs.
 * Charte Botami : crème, ambre pour l'action, Space Grotesk et DM Sans.
 */
import { Check, ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/home/atoms";

export const TOTAL_QUESTIONS = 10;

/* ---------- Coquille avec barre de progression ---------- */
export function Coquille({
  numero,
  onRetour,
  children,
  pied,
}: {
  numero?: number;
  onRetour?: () => void;
  children: React.ReactNode;
  pied?: React.ReactNode;
}) {
  const progression = numero ? (numero / TOTAL_QUESTIONS) * 100 : 0;
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="bo-wrap w-full pt-5 sm:pt-6">
        {numero ? (
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={onRetour}
              className="flex items-center gap-1 text-[13px] text-n-500 hover:text-ink transition-colors bo-focus rounded"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
              Retour
            </button>
            <div
              className="flex-1 h-[3px] rounded-full bg-n-300 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TOTAL_QUESTIONS}
              aria-valuenow={numero}
              aria-label={`Question ${numero} sur ${TOTAL_QUESTIONS}`}
            >
              <div className="h-full bg-ambre transition-all duration-500" style={{ width: `${progression}%` }} />
            </div>
            <span className="font-mono text-[12px] text-n-500 tabular-nums">
              <span className="text-ink font-medium">{numero}</span> / {TOTAL_QUESTIONS}
            </span>
          </div>
        ) : (
          <Brand brandName="Botami" brandSuffix="Software" size={32} />
        )}
      </header>
      <main className="bo-wrap w-full flex-1 pt-8 sm:pt-12 pb-32">{children}</main>
      {pied && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-n-300 bg-cream/95 backdrop-blur">
          <div className="bo-wrap py-3 sm:py-4 flex items-center justify-end gap-3">{pied}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Titre de question ---------- */
export function TitreQuestion({
  numero,
  avant,
  accent,
  apres,
  sousTitre,
  surtitre,
}: {
  numero?: number;
  avant?: string;
  accent: string;
  apres?: string;
  sousTitre?: React.ReactNode;
  surtitre?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="max-w-3xl animate-fade-up">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ambre-dark">
        {surtitre ?? `Question ${numero}`}
      </p>
      <h1
        ref={ref}
        tabIndex={-1}
        className="mt-3 font-display font-semibold tracking-[-0.03em] text-ink text-[30px] leading-[1.08] sm:text-[44px] outline-none"
      >
        {avant}
        <span className="italic text-ambre">{accent}</span>
        {apres?.replace(/ ([?!:;])/g, "\u00a0$1")}
      </h1>
      {sousTitre && <p className="mt-3 text-[16px] sm:text-[17px] leading-[1.55] text-n-700 max-w-2xl">{sousTitre}</p>}
    </div>
  );
}

export function Libelle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[13px] font-medium text-n-700 mb-2", className)}>{children}</p>;
}

/* ---------- Tuile de choix ---------- */
export function Tuile({
  label,
  hint,
  icone: Icone,
  choisie,
  rang,
  onClick,
  multi = true,
  compacte = false,
  desactivee = false,
}: {
  label: string;
  hint?: string;
  icone?: LucideIcon;
  choisie: boolean;
  rang?: number;
  onClick: () => void;
  multi?: boolean;
  compacte?: boolean;
  desactivee?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={choisie}
      aria-disabled={desactivee}
      onClick={() => !desactivee && onClick()}
      className={cn(
        "group relative w-full text-left rounded-card border-[1.5px] bg-white transition-all bo-focus",
        compacte ? "px-4 py-3" : "px-5 py-4",
        choisie
          ? "border-ambre bg-ambre-bg/70 shadow-[0_0_0_3px_rgba(196,135,44,0.12)]"
          : "border-n-300 hover:border-ambre/60 hover:-translate-y-0.5",
        desactivee && !choisie && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:border-n-300",
      )}
    >
      <div className="flex items-start gap-3">
        {Icone && <Icone className={cn("w-5 h-5 mt-0.5 flex-none", choisie ? "text-ambre-dark" : "text-n-500")} aria-hidden />}
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-ink leading-snug", compacte ? "text-[14px]" : "text-[15px]")}>{label}</p>
          {hint && <p className="mt-1 text-[13px] leading-snug text-n-500">{hint}</p>}
        </div>
        <span
          className={cn(
            "flex-none grid place-items-center w-5 h-5 text-[11px] font-semibold transition-colors",
            multi ? "rounded-[5px]" : "rounded-full",
            choisie ? "bg-ambre text-white" : "border-[1.5px] border-n-300 bg-white",
          )}
          aria-hidden
        >
          {choisie && (rang ? rang : <Check className="w-3.5 h-3.5" strokeWidth={3} />)}
        </span>
      </div>
    </button>
  );
}

/* ---------- Champ texte ---------- */
export function Champ({
  id,
  label,
  valeur,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  erreur,
  suffixe,
  autoFocus,
  inputMode,
  onBlur,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  erreur?: string | null;
  suffixe?: React.ReactNode;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onBlur?: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-n-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={valeur}
          autoFocus={autoFocus}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!erreur}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
          className={cn(
            "w-full rounded-[10px] border-[1.5px] bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-n-500/70 outline-none transition-colors",
            erreur ? "border-red-400" : "border-n-300 focus:border-ambre",
            suffixe && "pr-11",
          )}
        />
        {suffixe && <span className="absolute right-4 top-1/2 -translate-y-1/2">{suffixe}</span>}
      </div>
      {erreur && (
        <p id={`${id}-erreur`} className="mt-1.5 text-[13px] text-red-600">
          {erreur}
        </p>
      )}
    </div>
  );
}

export function ZoneTexte({
  id,
  label,
  valeur,
  onChange,
  placeholder,
  max = 600,
  lignes = 3,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  lignes?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-n-700 mb-2">
        {label}
      </label>
      <textarea
        id={id}
        rows={lignes}
        value={valeur}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border-[1.5px] border-n-300 bg-white px-4 py-3 text-[16px] text-ink placeholder:text-n-500/70 outline-none focus:border-ambre resize-y"
      />
      <p className="mt-1 text-right font-mono text-[11px] text-n-500">
        {valeur.length} / {max}
      </p>
    </div>
  );
}

/* ---------- Bouton d'action ---------- */
export function BoutonAction({
  children,
  onClick,
  desactive,
  type = "button",
  icone,
  variante = "plein",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  desactive?: boolean;
  type?: "button" | "submit";
  icone?: React.ReactNode;
  variante?: "plein" | "contour";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={desactive}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-[15px] font-medium transition-colors bo-focus disabled:cursor-not-allowed",
        variante === "plein"
          ? "bg-ambre text-white hover:bg-ambre-dark disabled:bg-ambre/40"
          : "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-cream disabled:opacity-50",
        className,
      )}
    >
      {children}
      {icone}
    </button>
  );
}

/* ---------- Raccourcis clavier : Entrée pour continuer, Échap pour revenir ---------- */
export function useRaccourcis(peutSuivre: boolean, onSuivant: () => void, onRetour?: () => void) {
  useEffect(() => {
    const ecoute = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.tagName === "TEXTAREA") return;
      if (document.querySelector("[data-modale-ouverte]")) return;
      if (e.key === "Enter" && peutSuivre) {
        e.preventDefault();
        onSuivant();
      } else if (e.key === "Escape" && onRetour && cible?.tagName !== "INPUT") {
        onRetour();
      }
    };
    window.addEventListener("keydown", ecoute);
    return () => window.removeEventListener("keydown", ecoute);
  }, [peutSuivre, onSuivant, onRetour]);
}
