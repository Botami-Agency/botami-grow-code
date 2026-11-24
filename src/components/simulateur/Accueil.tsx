import { useEffect, useState } from "react";
import { Check, Clock, Euro, ListChecks } from "lucide-react";
import { calculerResultat, EXEMPLE_ACCUEIL } from "@/lib/simulateur/bareme";
import theo from "@/assets/theo.webp";
import elias from "@/assets/elias.webp";
import { BoutonAction } from "./ui";
import { ArrowRightIcon, Brand } from "@/components/home/atoms";

const EXEMPLE = calculerResultat(EXEMPLE_ACCUEIL);

function Compteur({ cible, duree = 1400 }: { cible: number; duree?: number }) {
  const [valeur, setValeur] = useState(0);
  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return setValeur(cible);
    let frame = 0;
    const debut = performance.now();
    const tick = (t: number) => {
      const avance = Math.min(1, (t - debut) / duree);
      setValeur(Math.round(cible * (1 - (1 - avance) ** 3)));
      if (avance < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cible, duree]);
  return <>{valeur.toLocaleString("fr-FR")}</>;
}

function Carte({ icone, titre, children, className }: { icone: React.ReactNode; titre: string; children: React.ReactNode; className: string }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-card bg-white/95 backdrop-blur px-4 py-3 shadow-[0_8px_30px_rgba(26,26,26,0.12)] border border-n-300 ${className}`}>
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-ambre-bg text-ambre-dark">{icone}</span>
      <div>
        <p className="text-[12px] text-n-500 leading-none">{titre}</p>
        <p className="mt-1 font-display font-semibold text-[18px] text-ink leading-none">{children}</p>
      </div>
    </div>
  );
}

export default function Accueil({ onDemarrer }: { onDemarrer: () => void }) {
  const promesses = [
    ["Les heures", " que votre équipe peut récupérer chaque mois"],
    ["L'économie en euros", " et son équivalent en salariés"],
    ["Le coût de vos outils", " actuels sur 3 ans"],
  ];
  return (
    <div className="min-h-[100dvh] flex items-center">
      <div className="bo-wrap w-full py-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="animate-fade-up">
          <Brand brandName="Botami" brandSuffix="Software" />
          <h1 className="mt-10 font-display font-semibold tracking-[-0.035em] text-ink text-[40px] leading-[1.02] sm:text-[58px]">
            Mesurez <span className="italic text-ambre">le potentiel de l'IA</span> pour votre entreprise
          </h1>
          <p className="mt-6 text-[17px] text-n-700">En 5 minutes, vous repartez avec :</p>
          <ul className="mt-3 space-y-2.5">
            {promesses.map(([fort, suite]) => (
              <li key={fort} className="flex items-start gap-3 text-[16px] text-n-700">
                <span className="mt-0.5 grid place-items-center w-5 h-5 rounded-[5px] bg-ambre-bg text-ambre-dark flex-none">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span>
                  <strong className="font-semibold text-ink">{fort}</strong>
                  {suite}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <BoutonAction onClick={onDemarrer} icone={<ArrowRightIcon className="w-[14px] h-[14px]" />} className="px-6 py-3.5 text-[16px]">
              Je lance le simulateur
            </BoutonAction>
            <span className="text-[13px] text-n-500">Gratuit · 10 questions · 5 min</span>
          </div>
        </div>

        <figure className="animate-fade-up [animation-delay:120ms]">
          <div className="relative">
          <div className="grid grid-cols-2 gap-3 rounded-band overflow-hidden bg-n-200 p-3">
            <img src={theo} alt="Théo, cofondateur de Botami Software" className="w-full h-[300px] sm:h-[420px] object-cover rounded-card" />
            <img src={elias} alt="Elias, cofondateur de Botami Software" className="w-full h-[300px] sm:h-[420px] object-cover object-top rounded-card" />
          </div>
          <Carte icone={<Clock className="w-4 h-4" aria-hidden />} titre="Temps récupéré" className="left-2 sm:-left-6 top-8">
            ≈ <Compteur cible={EXEMPLE.heuresParMois} /> <span className="text-[13px] font-normal text-n-500">h / mois</span>
          </Carte>
          <Carte icone={<Euro className="w-4 h-4" aria-hidden />} titre="Économie estimée" className="right-2 sm:-right-6 top-1/2">
            ≈ <Compteur cible={EXEMPLE.economieParMois} /> <span className="text-[13px] font-normal text-n-500">€ / mois</span>
          </Carte>
          <Carte icone={<ListChecks className="w-4 h-4" aria-hidden />} titre="Tâches prioritaires" className="left-6 -bottom-5">
            <Compteur cible={3} duree={700} />
          </Carte>
          </div>
          <figcaption className="mt-9 text-[13px] italic text-n-500">
            Exemple pour une PME de 20 salariés. Votre résultat est calculé à partir de vos réponses.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
