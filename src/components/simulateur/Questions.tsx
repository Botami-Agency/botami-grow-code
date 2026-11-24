/**
 * Les dix questions du simulateur, plus l'écran d'analyse.
 * Une question par écran, bouton bloqué tant que la réponse manque.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Check, Globe, LoaderCircle, CircleMinus, PenLine } from "lucide-react";
import {
  ASSISTANTS,
  BUDGETS,
  FREINS,
  IMPACTS,
  OUTILS,
  POLES,
  POLE_PAR_ID,
  POSTES_DIRIGEANT,
  POSTES_SUPPORT,
  STATUTS,
  TAILLES,
  USAGES,
  tachesDuPole,
  tailleDepuisEffectif,
  type FreinId,
  type OutilId,
  type PoleId,
} from "@/lib/simulateur/donnees";
import { rechercherEntreprise, verifierSite } from "@/lib/simulateur/api";
import type { EcranId, Parcours } from "@/lib/simulateur/parcours";
import { ArrowRightIcon } from "@/components/home/atoms";
import { cn } from "@/lib/utils";
import { BoutonAction, Champ, Coquille, Libelle, TitreQuestion, Tuile, ZoneTexte, useRaccourcis } from "./ui";

export interface PropsQuestion {
  p: Parcours;
  maj: (m: Partial<Parcours> | ((p: Parcours) => Partial<Parcours>)) => void;
  aller: (e: EcranId) => void;
}

const fleche = <ArrowRightIcon className="w-[14px] h-[14px]" />;

function basculer<T>(liste: T[], v: T): T[] {
  return liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
}

function Pied({ actif, onClick, libelle = "Continuer", aside }: { actif: boolean; onClick: () => void; libelle?: string; aside?: React.ReactNode }) {
  return (
    <>
      {aside}
      <BoutonAction onClick={onClick} desactive={!actif} icone={fleche}>
        {libelle}
      </BoutonAction>
    </>
  );
}

function Question({
  numero,
  precedent,
  actif,
  suivant,
  libelle,
  aside,
  children,
}: {
  numero: number;
  precedent: () => void;
  actif: boolean;
  suivant: () => void;
  libelle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  useRaccourcis(actif, suivant, precedent);
  return (
    <Coquille numero={numero} onRetour={precedent} pied={<Pied actif={actif} onClick={suivant} libelle={libelle} aside={aside} />}>
      {children}
    </Coquille>
  );
}

/* ================= Q1 — Entreprise et site ================= */
const URL_VALIDE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export function Q1({ p, maj, aller }: PropsQuestion) {
  const [etatSite, setEtatSite] = useState<"vide" | "verif" | "ok" | "injoignable">("vide");
  const urlOk = URL_VALIDE.test(p.siteUrl.trim());

  useEffect(() => {
    if (!p.aSite || !urlOk) return setEtatSite("vide");
    setEtatSite("verif");
    const t = setTimeout(async () => {
      const s = await verifierSite(p.siteUrl.trim());
      setEtatSite(s === "injoignable" || s === "invalide" ? "injoignable" : "ok");
    }, 700);
    return () => clearTimeout(t);
  }, [p.aSite, p.siteUrl, urlOk]);

  const actif = p.nom.trim().length >= 2 && p.aSite !== null && (!p.aSite || urlOk);
  const suivant = () => {
    if (!actif) return;
    // Nouvelle recherche si le nom ou le site a changé depuis la dernière analyse.
    const cle = `${p.nom.trim()}|${p.aSite ? p.siteUrl.trim() : ""}`;
    if (sessionStorage.getItem("botami.simulateur.cle") !== cle) {
      sessionStorage.setItem("botami.simulateur.cle", cle);
      maj({ lookup: null, ficheIgnoree: false });
    }
    aller("analyse");
  };

  return (
    <Question numero={1} precedent={() => aller("accueil")} actif={actif} suivant={suivant}>
      <TitreQuestion
        numero={1}
        avant="Quel est le nom de "
        accent="votre entreprise"
        apres=" ?"
        sousTitre="On part des informations publiques sur votre entreprise pour vous éviter de tout ressaisir."
      />
      <div className="mt-8 max-w-xl space-y-7">
        <Champ
          id="nom-societe"
          label="Nom de la société"
          valeur={p.nom}
          onChange={(v) => maj({ nom: v.slice(0, 120) })}
          placeholder="Ex. Menuiserie Dupont"
          autoComplete="organization"
          autoFocus
        />
        {p.nom.trim().length >= 2 && (
          <div className="animate-fade-up">
            <Libelle>Avez-vous un site internet ?</Libelle>
            <div className="grid grid-cols-2 gap-3">
              <Tuile label="Oui" icone={Globe} choisie={p.aSite === true} multi={false} onClick={() => maj({ aSite: true })} />
              <Tuile label="Pas encore" icone={CircleMinus} choisie={p.aSite === false} multi={false} onClick={() => maj({ aSite: false })} />
            </div>
          </div>
        )}
        {p.aSite && (
          <div className="animate-fade-up">
            <Champ
              id="site-url"
              label="Adresse du site"
              valeur={p.siteUrl}
              onChange={(v) => maj({ siteUrl: v.slice(0, 300) })}
              placeholder="www.votre-site.fr"
              inputMode="url"
              autoComplete="url"
              autoFocus
              suffixe={
                etatSite === "verif" ? (
                  <LoaderCircle className="w-4 h-4 animate-spin text-n-500" aria-label="Vérification" />
                ) : etatSite === "ok" ? (
                  <Check className="w-4 h-4 text-emerald-600" aria-label="Site trouvé" />
                ) : etatSite === "injoignable" ? (
                  <CircleAlert className="w-4 h-4 text-amber-600" aria-label="Site introuvable" />
                ) : null
              }
            />
            {etatSite === "injoignable" && (
              <p className="mt-1.5 text-[13px] text-amber-700">On ne trouve pas ce site. Vérifiez l'adresse, ou continuez sans.</p>
            )}
          </div>
        )}
      </div>
    </Question>
  );
}

/* ================= Analyse ================= */
export function Analyse({ p, maj, aller }: PropsQuestion) {
  const avecSite = !!p.aSite && !!p.siteUrl.trim();
  const etapes = useMemo(
    () => [
      "Recherche dans le registre des entreprises",
      "Lecture de la fiche officielle",
      ...(avecSite ? ["Lecture de votre site", "Analyse de votre métier par l'IA"] : []),
    ],
    [avecSite],
  );
  const [faites, setFaites] = useState(0);
  const lance = useRef(false);

  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    let reponseRecue = !!p.lookup;
    let fini = false;
    const debut = Date.now();

    const tic = setInterval(() => {
      setFaites((n) => {
        // La dernière étape attend la réponse du serveur.
        if (n >= etapes.length - 1 && !reponseRecue) return n;
        return Math.min(n + 1, etapes.length);
      });
    }, 750);

    const terminer = (lookup: Parcours["lookup"]) => {
      if (fini) return;
      fini = true;
      const attente = Math.max(0, 750 * (etapes.length + 1) - (Date.now() - debut));
      setTimeout(() => {
        clearInterval(tic);
        setFaites(etapes.length);
        maj((q) => {
          const reg = lookup?.registre;
          const effectif = q.effectif ?? reg?.effectif ?? null;
          return {
            lookup,
            secteur: q.secteur || lookup?.site?.secteur || reg?.secteur || "",
            effectif,
            taille: q.taille ?? tailleDepuisEffectif(effectif),
          };
        });
        setTimeout(() => aller("q2"), 450);
      }, attente);
    };

    if (p.lookup) {
      reponseRecue = true;
      terminer(p.lookup);
    } else {
      rechercherEntreprise(p.nom.trim(), avecSite ? p.siteUrl.trim() : null).then((r) => {
        reponseRecue = true;
        terminer(r ?? { registre: null, candidats: [], site: null, trace: [] });
      });
    }
    return () => clearInterval(tic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Coquille>
      <TitreQuestion
        surtitre="Analyse en cours"
        avant="On rassemble ce qui existe déjà sur "
        accent={p.nom.trim()}
        sousTitre="Notre IA lit les données publiques et votre site. Comptez quelques secondes."
      />
      <ul className="mt-9 max-w-xl space-y-3" aria-live="polite">
        {etapes.map((label, i) => {
          const etat = i < faites ? "fait" : i === faites ? "en_cours" : "attente";
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-card border bg-white px-5 py-4 text-[15px] transition-all duration-500",
                etat === "attente" ? "border-n-300/60 opacity-40" : "border-n-300",
              )}
            >
              <span className="grid place-items-center w-6 h-6">
                {etat === "fait" ? (
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-ambre text-white">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : (
                  <LoaderCircle className={cn("w-5 h-5 text-ambre", etat === "en_cours" && "animate-spin")} aria-hidden />
                )}
              </span>
              <span className={etat === "fait" ? "text-ink" : "text-n-700"}>{label}</span>
            </li>
          );
        })}
      </ul>
    </Coquille>
  );
}

/* ================= Q2 — Fiche entreprise ================= */
export function Q2({ p, maj, aller }: PropsQuestion) {
  const reg = !p.ficheIgnoree ? p.lookup?.registre ?? null : null;
  const site = p.lookup?.site ?? null;
  // Sans fiche au registre, on montre ce que l'IA a lu sur le site, sous le nom saisi par le visiteur.
  const ficheSite = !reg && !p.ficheIgnoree && !!(site?.activite || site?.secteur);
  const trouve = !!reg || ficheSite;
  const actif = p.secteur.trim().length >= 2 && !!p.taille;
  const suivant = () => actif && aller("q3");
  const champs = reg
    ? ([
        ["Forme", reg.forme],
        ["Créée en", reg.anneeCreation],
        ["Effectif", reg.tranche],
        ["Ville", reg.ville],
        ["Dirigeant", reg.dirigeant],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <Question numero={2} precedent={() => aller("q1")} actif={actif} suivant={suivant} libelle={trouve ? "C'est bien ça, je continue" : "Continuer"}>
      {trouve ? (
        <TitreQuestion numero={2} avant="Voici " accent="ce qu'on a trouvé" apres=". C'est bien vous ?" sousTitre="Corrigez ce qui ne va pas : vos réponses priment pour la suite." />
      ) : (
        <TitreQuestion numero={2} avant="Parlez-nous de " accent="votre activité" sousTitre="Trois informations suffisent pour adapter la suite." />
      )}

      <div className="mt-8 max-w-3xl space-y-7">
        {reg && (
          <div className="rounded-band border border-n-300 bg-white p-6 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-[20px] text-ink">{reg.nom}</p>
                {p.lookup?.site?.activite && <p className="mt-1 text-[14px] text-n-700">{p.lookup.site.activite}</p>}
              </div>
              <span className="flex-none rounded-full border border-n-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-n-500">
                Registre public
              </span>
            </div>
            {champs.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                {champs.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-n-500">{k}</dt>
                    <dd className="mt-1 text-[15px] font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-5 pt-4 border-t border-n-300 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
              <span className="text-n-500">{reg.correspondance === "probable" ? "Plusieurs entreprises portent un nom proche." : "Ce n'est pas votre entreprise ?"}</span>
              <button type="button" className="underline underline-offset-4 text-ink hover:text-ambre-dark bo-focus rounded" onClick={() => aller("q1")}>
                Modifier le nom
              </button>
              <button type="button" className="underline underline-offset-4 text-ink hover:text-ambre-dark bo-focus rounded" onClick={() => maj({ ficheIgnoree: true })}>
                Continuer sans cette fiche
              </button>
            </div>
          </div>
        )}

        {ficheSite && (
          <div className="rounded-band border border-n-300 bg-white p-6 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-[20px] text-ink">{p.nom.trim()}</p>
                {site?.activite && <p className="mt-1 text-[14px] text-n-700">{site.activite}</p>}
              </div>
              <span className="flex-none rounded-full border border-n-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-n-500">
                Lu sur votre site
              </span>
            </div>
            <div className="mt-5 pt-4 border-t border-n-300 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
              <span className="text-n-500">Ce n'est pas votre entreprise ?</span>
              <button type="button" className="underline underline-offset-4 text-ink hover:text-ambre-dark bo-focus rounded" onClick={() => aller("q1")}>
                Modifier le nom
              </button>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-[1fr_200px] gap-4">
          <Champ id="secteur" label="Votre secteur d'activité" valeur={p.secteur} onChange={(v) => maj({ secteur: v.slice(0, 80) })} placeholder="Ex. Menuiserie, cabinet comptable, transport" />
          <Champ
            id="effectif"
            label="Nombre de salariés"
            valeur={p.effectif ? String(p.effectif) : ""}
            inputMode="numeric"
            onChange={(v) => {
              const n = parseInt(v.replace(/\D/g, ""), 10);
              const effectif = isFinite(n) && n > 0 ? Math.min(n, 100000) : null;
              maj({ effectif, taille: tailleDepuisEffectif(effectif) ?? p.taille });
            }}
            placeholder="Ex. 12"
          />
        </div>

        <div>
          <Libelle>Et la taille de l'entreprise ?</Libelle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TAILLES.map((t) => (
              <Tuile key={t.id} label={t.label} icone={t.icone} multi={false} choisie={p.taille === t.id} onClick={() => maj({ taille: t.id })} />
            ))}
          </div>
        </div>
      </div>
    </Question>
  );
}

/* ================= Q3 — Rôle ================= */
const POSTES_INDEPENDANT = [
  { label: "Consultant", hint: "Je vends mon expertise" },
  { label: "Artisan", hint: "Je travaille sur le terrain" },
  { label: "Profession libérale", hint: "J'exerce en cabinet" },
  { label: "Commerçant", hint: "Je vends en boutique ou en ligne" },
];

export function Q3({ p, maj, aller }: PropsQuestion) {
  const effectif = p.effectif ?? TAILLES.find((t) => t.id === p.taille)?.effectifType ?? 5;
  const postes = useMemo(() => {
    if (p.statut === "dirigeant") return POSTES_DIRIGEANT;
    if (p.statut === "independant") return POSTES_INDEPENDANT;
    const duSite = (p.lookup?.site?.postesSuggeres ?? []).map((label) => ({ label, hint: "Poste typique de votre secteur" }));
    const support = POSTES_SUPPORT.slice(0, effectif >= 30 ? 7 : effectif >= 10 ? 4 : 2);
    const vus = new Set<string>();
    return [...duSite, ...support].filter((x) => (vus.has(x.label) ? false : (vus.add(x.label), true)));
  }, [p.statut, p.lookup, effectif]);

  const actif = !!p.statut && !!p.poste && (p.poste !== "Autre" || p.posteAutre.trim().length >= 2);
  const suivant = () => actif && aller("q4");

  return (
    <Question numero={3} precedent={() => aller("q2")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={3} avant="Et vous, quel est " accent="votre rôle" apres=" dans l'entreprise ?" />
      <div className="mt-8 space-y-7">
        <div>
          <Libelle>Votre statut</Libelle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATUTS.map((s) => (
              <Tuile key={s.id} label={s.label} icone={s.icone} multi={false} choisie={p.statut === s.id} compacte onClick={() => maj({ statut: s.id, poste: "", posteAutre: "" })} />
            ))}
          </div>
        </div>
        {p.statut && (
          <div className="animate-fade-up">
            <Libelle>Votre poste</Libelle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...postes, { label: "Autre", hint: "Je précise moi-même" }].map((x) => (
                <Tuile key={x.label} label={x.label} hint={x.hint} icone={x.label === "Autre" ? PenLine : undefined} multi={false} choisie={p.poste === x.label} onClick={() => maj({ poste: x.label })} />
              ))}
            </div>
            {p.poste === "Autre" && (
              <div className="mt-4 max-w-md animate-fade-up">
                <Champ id="poste-autre" label="Votre poste" valeur={p.posteAutre} onChange={(v) => maj({ posteAutre: v.slice(0, 60) })} autoFocus />
              </div>
            )}
          </div>
        )}
      </div>
    </Question>
  );
}

/* ================= Q4 — Pôles ================= */
export function Q4({ p, maj, aller }: PropsQuestion) {
  const ordre = useMemo(() => {
    const suggeres = (p.lookup?.site?.polesSuggeres ?? []).filter((x) => POLE_PAR_ID[x]);
    return [...suggeres.map((id) => POLE_PAR_ID[id]), ...POLES.filter((x) => !suggeres.includes(x.id))];
  }, [p.lookup]);
  const actif = p.poles.length === 3;
  const suivant = () => actif && aller("q5");
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuteur.current), []);

  const choisir = (id: PoleId) => {
    clearTimeout(minuteur.current);
    if (p.poles.includes(id)) return maj({ poles: p.poles.filter((x) => x !== id) });
    if (p.poles.length >= 3) return;
    const poles = [...p.poles, id];
    maj({ poles });
    if (poles.length === 3) minuteur.current = setTimeout(() => aller("q5"), 650);
  };

  return (
    <Question
      numero={4}
      precedent={() => aller("q3")}
      actif={actif}
      suivant={suivant}
      aside={
        <span className="hidden sm:inline-flex items-center gap-2 rounded-[10px] border border-n-300 bg-white px-4 py-2.5 text-[13px] text-n-700">
          {p.poles.length} sur 3 sélectionnés
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn("w-2 h-2 rounded-[2px]", i < p.poles.length ? "bg-ambre" : "bg-n-300")} />
            ))}
          </span>
        </span>
      }
    >
      <TitreQuestion numero={4} avant="Où passez-vous " accent="le plus de temps" apres=" ?" sousTitre="Choisissez les 3 pôles qui prennent le plus d'heures chaque semaine, du plus au moins chronophage." />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ordre.map((x) => {
          const rang = p.poles.indexOf(x.id);
          return (
            <Tuile
              key={x.id}
              label={x.label}
              hint={x.hint}
              icone={x.icone}
              choisie={rang >= 0}
              rang={rang >= 0 ? rang + 1 : undefined}
              desactivee={rang < 0 && p.poles.length >= 3}
              onClick={() => choisir(x.id)}
            />
          );
        })}
      </div>
    </Question>
  );
}

/* ================= Q5 — Tâches ================= */
export function Q5({ p, maj, aller }: PropsQuestion) {
  const effectif = p.effectif ?? TAILLES.find((t) => t.id === p.taille)?.effectifType ?? 5;
  const colonnes = p.poles.map((pole) => ({
    pole: POLE_PAR_ID[pole],
    taches: tachesDuPole(pole, p.statut === "dirigeant", effectif, p.lookup?.site?.tachesParPole?.[pole] ?? []),
  }));
  const visibles = new Set(colonnes.flatMap((c) => c.taches));
  const choisies = p.taches.filter((t) => visibles.has(t));
  const actif = choisies.length > 0 || p.tachesLibre.trim().length >= 3;
  const suivant = () => {
    if (!actif) return;
    maj({ taches: choisies });
    aller("q6");
  };

  return (
    <Question numero={5} precedent={() => aller("q4")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={5} avant="Concrètement, " accent="quelles tâches" apres=" reviennent chaque semaine ?" sousTitre="Cochez tout ce qui vous parle." />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {colonnes.map(({ pole, taches }) => (
          <div key={pole.id}>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-n-500 mb-3">
              <pole.icone className="w-4 h-4" aria-hidden />
              {pole.label}
            </p>
            <div className="space-y-2.5">
              {taches.map((t) => (
                <Tuile key={t} label={t} compacte choisie={choisies.includes(t)} onClick={() => maj({ taches: basculer(choisies, t) })} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 max-w-2xl">
        <ZoneTexte
          id="taches-libre"
          label="Autre chose ? (facultatif)"
          valeur={p.tachesLibre}
          onChange={(v) => maj({ tachesLibre: v })}
          placeholder="Ex. chaque devis est retapé dans un tableur, puis envoyé par e-mail. On relance les clients un par un le vendredi."
        />
      </div>
    </Question>
  );
}

/* ================= Q6 — Impacts ================= */
export function Q6({ p, maj, aller }: PropsQuestion) {
  const autre = p.impacts.includes("autre");
  const actif = p.impacts.length > 0 && (!autre || p.impactAutre.trim().length >= 2);
  const suivant = () => actif && aller("q7");
  return (
    <Question numero={6} precedent={() => aller("q5")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={6} avant="Ces tâches ont surtout " accent="quel impact" apres=" sur l'entreprise ?" sousTitre="Plusieurs réponses possibles." />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl">
        {IMPACTS.map((x) => (
          <Tuile key={x.id} label={x.label} choisie={p.impacts.includes(x.id)} onClick={() => maj({ impacts: basculer(p.impacts, x.id) })} />
        ))}
        <Tuile label="Autre" hint="Je précise moi-même" icone={PenLine} choisie={autre} onClick={() => maj({ impacts: basculer(p.impacts, "autre") })} />
      </div>
      {autre && (
        <div className="mt-4 max-w-xl animate-fade-up">
          <Champ id="impact-autre" label="Quel impact ?" valeur={p.impactAutre} onChange={(v) => maj({ impactAutre: v.slice(0, 200) })} autoFocus />
        </div>
      )}
    </Question>
  );
}

/* ================= Q7 — Outils et abonnements ================= */
export function Q7({ p, maj, aller }: PropsQuestion) {
  const actif = p.outils.length > 0 && !!p.budget;
  const suivant = () => actif && aller("q8");
  return (
    <Question numero={7} precedent={() => aller("q6")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={7} avant="Avec quels " accent="outils" apres=" travaillez-vous aujourd'hui ?" sousTitre="Toutes les réponses sont valables, le papier compris." />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {OUTILS.map((x) => (
          <Tuile key={x.id} label={x.label} hint={x.hint} compacte choisie={p.outils.includes(x.id)} onClick={() => maj({ outils: basculer<OutilId>(p.outils, x.id) })} />
        ))}
      </div>
      <div className="mt-9">
        <Libelle>Combien payez-vous d'abonnements logiciels par mois, pour toute l'équipe ?</Libelle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BUDGETS.map((b) => (
            <Tuile key={b.id} label={b.label} multi={false} compacte choisie={p.budget === b.id} onClick={() => maj({ budget: b.id })} />
          ))}
        </div>
      </div>
    </Question>
  );
}

/* ================= Q8 — Usage de l'IA ================= */
export function Q8({ p, maj, aller }: PropsQuestion) {
  const actif = !!p.noteIA && p.assistants.length > 0;
  const suivant = () => actif && aller("q9");
  const choisirAssistant = (id: string) => {
    if (id === "aucun") return maj({ assistants: p.assistants.includes("aucun") ? [] : ["aucun"], usages: [] });
    maj({ assistants: basculer(p.assistants.filter((a) => a !== "aucun"), id) });
  };
  const utilise = p.assistants.length > 0 && !p.assistants.includes("aucun");

  return (
    <Question numero={8} precedent={() => aller("q7")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={8} avant="À quel point l'IA est-elle " accent="utilisée aujourd'hui" apres=" ?" sousTitre="Sur une échelle de 1 à 10, au quotidien, dans votre équipe." />
      <div className="mt-8 max-w-2xl">
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Note d'usage de l'IA">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={p.noteIA === n}
              aria-label={`${n} sur 10`}
              onClick={() => maj({ noteIA: n })}
              className={cn(
                "h-12 sm:h-14 rounded-[10px] border-[1.5px] font-display font-semibold text-[16px] transition-colors bo-focus",
                p.noteIA && n <= p.noteIA ? "bg-ink border-ink text-cream" : "bg-white border-n-300 text-n-700 hover:border-ambre",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-n-500">
          <span>1 : jamais</span>
          <span>10 : tous les jours, par toute l'équipe</span>
        </div>
      </div>
      <div className="mt-9">
        <Libelle>Quelles IA utilisez-vous ?</Libelle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ASSISTANTS.map((a) => (
            <Tuile key={a.id} label={a.label} compacte choisie={p.assistants.includes(a.id)} onClick={() => choisirAssistant(a.id)} />
          ))}
        </div>
      </div>
      {utilise && (
        <div className="mt-9 animate-fade-up">
          <Libelle>Pour quoi faire ? (facultatif)</Libelle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {USAGES.map((u) => (
              <Tuile key={u.id} label={u.label} compacte choisie={p.usages.includes(u.id)} onClick={() => maj({ usages: basculer(p.usages, u.id) })} />
            ))}
          </div>
        </div>
      )}
    </Question>
  );
}

/* ================= Q9 — Freins ================= */
export function Q9({ p, maj, aller }: PropsQuestion) {
  const actif = p.freins.length > 0;
  const suivant = () => actif && aller("q10");
  return (
    <Question numero={9} precedent={() => aller("q8")} actif={actif} suivant={suivant}>
      <TitreQuestion numero={9} avant="Qu'est-ce qui " accent="freine l'IA" apres=" chez vous ?" sousTitre="Plusieurs réponses possibles. Mettez en premier le frein le plus fort." />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl">
        {FREINS.map((f) => {
          const rang = p.freins.indexOf(f.id);
          return (
            <Tuile
              key={f.id}
              label={f.label}
              choisie={rang >= 0}
              rang={rang >= 0 ? rang + 1 : undefined}
              onClick={() => maj({ freins: basculer<FreinId>(p.freins, f.id) })}
            />
          );
        })}
      </div>
    </Question>
  );
}

/* ================= Q10 — Outil idéal ================= */
export function Q10({ p, maj, aller }: PropsQuestion) {
  const actif = p.outilIdeal.trim().length >= 5;
  const suivant = () => actif && aller("resultat");
  return (
    <Question numero={10} precedent={() => aller("q9")} actif={actif} suivant={suivant} libelle="Je découvre mon résultat">
      <TitreQuestion
        surtitre="Question 10 · la dernière"
        avant="Si vous pouviez créer l'outil idéal, "
        accent="il ferait quoi"
        apres=" ?"
        sousTitre="Une phrase suffit. Ce que vous rêvez de ne plus jamais faire à la main."
      />
      <div className="mt-8 max-w-2xl">
        <Champ
          id="outil-ideal"
          label="Votre outil idéal"
          valeur={p.outilIdeal}
          onChange={(v) => maj({ outilIdeal: v.slice(0, 240) })}
          placeholder="Ex. un outil qui prépare mes devis à partir d'un message vocal"
          autoFocus
        />
      </div>
    </Question>
  );
}
