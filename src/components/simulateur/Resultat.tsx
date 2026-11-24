/**
 * Résultat du simulateur : calculé dès la fin du questionnaire, affiché flouté
 * derrière le mur de contact, puis débloqué (l'adresse passe en /simulateur/merci).
 */
import { useMemo, useState } from "react";
import { ChevronDown, Clock, Info, Lock, LockOpen, User } from "lucide-react";
import { calculerResultat, COUT_EMPLOYEUR_MENSUEL, type Resultat as R } from "@/lib/simulateur/bareme";
import { FREINS, HEURES_PAR_MOIS, POLE_PAR_ID } from "@/lib/simulateur/donnees";
import { conversionLead, enregistrerLead, envoyerResultatParEmail, nomEntreprise, suivreEvenement } from "@/lib/simulateur/api";
import type { Contact, Parcours } from "@/lib/simulateur/parcours";
import { ArrowRightIcon, Brand } from "@/components/home/atoms";
import { cn } from "@/lib/utils";
import theo from "@/assets/theo.webp";
import elias from "@/assets/elias.webp";
import { ChampTelephone, ModalePartage, useFormulaireContact } from "./Modales";
import { BoutonAction, Champ } from "./ui";

const CALENDLY = "https://calendly.com/elias-botami-agency/30min";
const nb = (n: number, decimales = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: decimales, minimumFractionDigits: decimales });

export function resultatDuParcours(p: Parcours): R {
  return calculerResultat({
    effectif: p.effectif,
    taille: p.taille,
    poles: p.poles,
    outils: p.outils,
    freins: p.freins,
    noteIA: p.noteIA,
    assistants: p.assistants,
    budget: p.budget,
  });
}

function lienRdv(p: Parcours) {
  const params = new URLSearchParams({ utm_source: "simulateur", utm_medium: "resultat" });
  if (p.contact) {
    params.set("name", p.contact.nom);
    params.set("email", p.contact.email);
  }
  return `${CALENDLY}?${params.toString()}`;
}

/* ---------- Jauge d'usage de l'IA ---------- */
function Jauge({ valeur }: { valeur: number }) {
  const angle = Math.PI * (1 - Math.min(100, Math.max(0, valeur)) / 100);
  const x = 60 + 48 * Math.cos(angle);
  const y = 62 - 48 * Math.sin(angle);
  const grandArc = 0;
  return (
    <svg viewBox="0 0 120 72" className="w-40 h-auto" role="img" aria-label={`Usage actuel de l'IA : ${valeur} %`}>
      <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="#E5E0D8" strokeWidth="10" strokeLinecap="round" />
      {valeur > 0 && (
        <path d={`M12 62 A48 48 0 ${grandArc} 1 ${x.toFixed(2)} ${y.toFixed(2)}`} fill="none" stroke="#C4872C" strokeWidth="10" strokeLinecap="round" />
      )}
      <text x="60" y="58" textAnchor="middle" className="fill-ink" style={{ font: "600 26px 'Space Grotesk', sans-serif" }}>
        {valeur}
        <tspan style={{ font: "500 13px 'DM Sans', sans-serif" }} dx="2">%</tspan>
      </text>
    </svg>
  );
}

function Tuile({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-band border border-n-300 bg-white p-6 flex flex-col items-center justify-center text-center", className)}>{children}</div>;
}

/* ---------- Feuille de route ---------- */
function FeuilleDeRoute({ p }: { p: Parcours }) {
  const [ouverte, setOuverte] = useState(0);
  const pole = p.poles[0] ? POLE_PAR_ID[p.poles[0]].label.toLowerCase() : "premier pôle";
  const etapes = [
    { titre: "Échange gratuit (30 min)", texte: `En visio. On passe en revue votre pôle ${pole}, on repère les tâches à outiller en priorité et celles qui n'en valent pas la peine.` },
    { titre: "Cahier des charges", texte: "On écrit le périmètre, l'ordre des priorités et la proposition commerciale. Le cahier des charges est inclus." },
    { titre: "Développement", texte: "On construit votre outil sur mesure, branché sur les logiciels que vous utilisez déjà. Livraison en 4 à 8 semaines selon la complexité." },
    { titre: "Mise en service et suivi", texte: "Formation de l'équipe, ajustements sur vos vrais dossiers. Le code source vous appartient." },
  ];
  return (
    <section className="mt-14">
      <h2 className="font-display font-semibold text-[24px] tracking-[-0.02em] text-ink">La suite, étape par étape</h2>
      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        {etapes.map((e, i) => (
          <button
            key={e.titre}
            type="button"
            onClick={() => setOuverte(i)}
            aria-expanded={ouverte === i}
            className={cn(
              "flex flex-col text-left rounded-card border-[1.5px] px-5 py-4 transition-colors bo-focus",
              ouverte === i ? "border-ambre bg-ambre-bg/60" : "border-n-300 bg-white hover:border-ambre/60",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ambre-dark">Étape {i + 1}</span>
              <ChevronDown className={cn("w-4 h-4 text-n-500 transition-transform lg:hidden", ouverte === i && "rotate-180")} aria-hidden />
            </div>
            <p className="mt-1 font-medium text-[15px] text-ink">{e.titre}</p>
            <p className={cn("mt-2 text-[14px] leading-relaxed text-n-700", ouverte === i ? "block" : "hidden lg:block lg:opacity-60")}>{e.texte}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Contenu du résultat ---------- */
function Contenu({ p, r, onPartager }: { p: Parcours; r: R; onPartager: () => void }) {
  const n = p.taches.length;
  const exemples = p.taches.slice(0, 2).map((t) => `«\u00a0${t.charAt(0).toLowerCase()}${t.slice(1)}\u00a0»`);
  const frein = FREINS.find((f) => f.id === p.freins[0]);
  const entreprise = nomEntreprise(p);
  const rdv = lienRdv(p);
  const clicRdv = () => suivreEvenement("cta_click", "simulateur_rdv");

  return (
    <div>
      <h1 className="font-display font-semibold tracking-[-0.03em] text-ink text-[32px] leading-[1.08] sm:text-[48px] max-w-4xl">
        <span className="italic text-ambre">{`${r.potentielRestant}\u00a0%`}</span> du potentiel de l'IA reste à exploiter
        {entreprise ? ` chez ${entreprise}` : ""}
      </h1>
      <div className="mt-5 max-w-3xl space-y-3 text-[16px] sm:text-[17px] leading-[1.6] text-n-700">
        {n > 0 ? (
          <p>
            On a repéré {n === 1 ? "une tâche répétitive" : `${n} tâches répétitives`}
            {exemples.length ? `, comme ${exemples.join(" et ")}` : ""}. {n === 1 ? "Elle revient" : "Elles reviennent"} chaque semaine. Ce sont exactement le genre de tâches qu'un outil sur mesure prend en charge.
          </p>
        ) : (
          <p>Les tâches que vous avez décrites reviennent chaque semaine. Ce sont exactement le genre de tâches qu'un outil sur mesure prend en charge.</p>
        )}
        {frein && r.faisabilite < 0.95 && (
          <p>
            Votre premier frein, {`«\u00a0${frein.label.charAt(0).toLowerCase() + frein.label.slice(1)}\u00a0»`}, ramène le gain atteignable à {`${Math.round(r.faisabilite * 100)}\u00a0%`} du potentiel.
          </p>
        )}
      </div>
      <a
        href={rdv}
        target="_blank"
        rel="noreferrer"
        onClick={clicRdv}
        className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-ambre px-6 py-3.5 text-[16px] font-medium text-white hover:bg-ambre-dark transition-colors bo-focus"
      >
        Je récupère ≈ {nb(r.heuresParMois)} h par mois
        <ArrowRightIcon className="w-[14px] h-[14px]" />
      </a>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Tuile>
          <Jauge valeur={r.usageIA} />
          <p className="mt-2 text-[14px] text-n-700">Usage actuel de l'IA</p>
        </Tuile>
        <Tuile>
          <Clock className="w-7 h-7 text-ambre-dark" aria-hidden />
          <p className="mt-3 font-display font-semibold text-[44px] leading-none text-ink">
            <span className="text-[24px] text-n-500 font-normal">≈ </span>
            {nb(r.heuresParMois)}
            <span className="text-[20px] text-n-500 font-normal"> h</span>
          </p>
          <p className="mt-2 text-[14px] text-n-700">Heures récupérables par mois</p>
        </Tuile>
        <Tuile>
          <User className="w-7 h-7 text-ambre-dark" aria-hidden />
          <p className="mt-3 font-display font-semibold text-[44px] leading-none text-ink">
            <span className="text-[24px] text-n-500 font-normal">≈ </span>
            {nb(r.equivalentTempsPlein, 1)}
          </p>
          <p className="mt-2 text-[14px] text-n-700">Équivalent temps plein</p>
          <p className="mt-2 text-[13px] text-n-500 flex items-center gap-1.5">
            ≈ {nb(r.economieParMois)} € par mois, soit
            <strong className="text-ambre-dark text-[15px]">≈ {nb(r.economieParAn)} €</strong> par an
            <span className="relative group">
              <Info className="w-3.5 h-3.5 cursor-help" aria-label="Hypothèses de calcul" tabIndex={0} />
              <span className="pointer-events-none absolute bottom-6 right-0 w-64 rounded-lg bg-ink p-3 text-left text-[12px] leading-relaxed text-cream opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                Hypothèses : {nb(r.effectifRetenu)} personnes × {nb(HEURES_PAR_MOIS, 2)} h par mois, une part automatisable propre à chacun de vos 3 pôles, un temps plein au coût employeur de {nb(COUT_EMPLOYEUR_MENSUEL)} € par mois.
              </span>
            </span>
          </p>
        </Tuile>
      </div>

      {r.coutOutilsTroisAns > 0 && (
        <div className="mt-4 rounded-band border border-n-300 bg-white p-6 sm:p-8 grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-n-500">Vos abonnements logiciels sur 3 ans</p>
            <p className="mt-2 font-display font-semibold text-[40px] leading-none text-ink">≈ {nb(r.coutOutilsTroisAns)} €</p>
            <p className="mt-2 text-[14px] text-n-700">
              {nb(r.coutOutilsMensuel)} € par mois × 36 mois. Vous louez ces outils sans jamais les posséder.
            </p>
          </div>
          <div className="rounded-card bg-ambre-bg/70 border border-ambre/30 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ambre-dark">Votre outil sur mesure</p>
            <p className="mt-2 font-display font-semibold text-[26px] leading-tight text-ink">À partir de 5 000 € HT, payé une fois</p>
            <p className="mt-2 text-[14px] text-n-700">Sans abonnement. Le code source vous appartient.</p>
          </div>
        </div>
      )}

      <FeuilleDeRoute p={p} />

      <section className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-band bg-ink p-7 sm:p-9 text-cream">
          <div className="flex -space-x-3">
            <img src={theo} alt="Théo, cofondateur" className="w-14 h-14 rounded-full object-cover border-2 border-ink" />
            <img src={elias} alt="Elias, cofondateur" className="w-14 h-14 rounded-full object-cover object-top border-2 border-ink" />
          </div>
          <p className="mt-5 font-display font-semibold text-[26px] leading-tight">
            On regarde ensemble ce que l'IA peut faire pour {entreprise || "votre entreprise"}{"\u00a0?"}
          </p>
          <p className="mt-2 text-[15px] text-cream/70">30 minutes en visio avec Théo ou Elias, les fondateurs. Gratuit.</p>
          <a href={rdv} target="_blank" rel="noreferrer" onClick={clicRdv} className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-ambre px-5 py-3 text-[15px] font-medium text-white hover:bg-ambre-dark transition-colors bo-focus">
            Je réserve mon échange gratuit
            <ArrowRightIcon className="w-[14px] h-[14px]" />
          </a>
        </div>
        <div className="rounded-band border border-n-300 bg-white p-7 sm:p-9 flex flex-col justify-between">
          <div>
            <p className="font-display font-semibold text-[22px] leading-tight text-ink">Faites passer le test à votre équipe</p>
            <p className="mt-2 text-[15px] text-n-700">Chacun répond de son côté. Les écarts montrent où regarder.</p>
          </div>
          <BoutonAction variante="contour" className="mt-6 self-start" onClick={onPartager}>
            J'invite mes collaborateurs
          </BoutonAction>
        </div>
      </section>
    </div>
  );
}

/* ---------- Page résultat avec mur de contact ---------- */
export function Resultat({
  p,
  onDeverrouille,
  onRecommencer,
}: {
  p: Parcours;
  onDeverrouille: (c: Contact) => void;
  onRecommencer: () => void;
}) {
  const r = useMemo(() => resultatDuParcours(p), [p]);
  const verrouille = !p.contact;
  const [partage, setPartage] = useState(false);
  const f = useFormulaireContact(true);
  const [envoi, setEnvoi] = useState(false);

  const deverrouiller = async (e: React.FormEvent) => {
    e.preventDefault();
    f.setTente(true);
    if (!f.valide || envoi) return;
    setEnvoi(true);
    const contact = f.contact();
    const parcours = { ...p, contact };
    const enregistre = await enregistrerLead({ parcours, resultat: r, contact, origine: "resultat" });
    if (enregistre) envoyerResultatParEmail(parcours, r, contact);
    conversionLead();
    suivreEvenement("cta_click", "simulateur_deverrouille");
    onDeverrouille(contact);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="bo-wrap pt-6 flex items-center justify-between">
        <Brand brandName="Botami" brandSuffix="Software" size={32} />
        {!verrouille && (
          <button type="button" onClick={onRecommencer} className="text-[13px] text-n-500 underline underline-offset-4 hover:text-ink bo-focus rounded">
            Refaire le simulateur
          </button>
        )}
      </header>

      <main className="bo-wrap relative pt-10 pb-20">
        <div className={cn(verrouille && "pointer-events-none select-none blur-[7px] opacity-80")} aria-hidden={verrouille}>
          <Contenu p={p} r={r} onPartager={() => setPartage(true)} />
        </div>

        {verrouille && (
          <div className="absolute inset-x-0 top-6 z-20 flex justify-center px-4">
            <form onSubmit={deverrouiller} noValidate className="w-full max-w-md rounded-band border border-n-300 bg-white p-7 shadow-[0_24px_80px_rgba(26,26,26,0.18)] animate-fade-up">
              <p className="font-display font-semibold text-[26px] leading-tight text-ink">
                Votre résultat est <span className="italic text-ambre">prêt</span>
              </p>
              <p className="mt-2 text-[15px] text-n-700">
                Trois informations pour le voir. Vous le recevez aussi par e-mail pour le retrouver facilement.
              </p>
              <div className="mt-6 space-y-4">
                <Champ id="contact-nom" label="Prénom et nom" valeur={f.champs.nom} onChange={f.champs.setNom} autoComplete="name" erreur={f.erreurs.nom} placeholder="Camille Martin" />
                <Champ
                  id="contact-email"
                  label="Adresse e-mail"
                  type="email"
                  valeur={f.champs.email}
                  onChange={f.champs.setEmail}
                  onBlur={f.controlerEmail}
                  autoComplete="email"
                  erreur={f.erreurs.email}
                  placeholder="camille@votre-entreprise.fr"
                />
                <ChampTelephone label="Téléphone" valeur={f.champs.telephone} pays={f.champs.pays} onChange={f.champs.setTelephone} onPays={f.champs.setPays} erreur={f.erreurs.telephone} />
              </div>
              <BoutonAction
                type="submit"
                desactive={envoi}
                className="mt-6 w-full py-3.5 text-[16px]"
                icone={f.valide ? <LockOpen className="w-4 h-4" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
              >
                {envoi ? "Un instant…" : "Je débloque mon résultat"}
              </BoutonAction>
              <p className="mt-4 text-[12px] leading-relaxed text-n-500">
                En validant, vous acceptez d'être recontacté par Botami au sujet de votre projet. Vous pouvez vous y opposer à tout moment.{" "}
                <a href="/politique-de-confidentialite" target="_blank" rel="noreferrer" className="underline">
                  Politique de confidentialité
                </a>
                .
              </p>
            </form>
          </div>
        )}
      </main>

      <footer className="bo-wrap pb-10 flex gap-5 text-[13px] text-n-500">
        <a href="/politique-de-confidentialite" className="underline underline-offset-4 hover:text-ink">Confidentialité</a>
        <a href="/mentions-legales" className="underline underline-offset-4 hover:text-ink">Mentions légales</a>
      </footer>

      <ModalePartage ouverte={partage} onFermer={() => setPartage(false)} />
    </div>
  );
}
