/**
 * Simulateur IA — /simulateur et /simulateur/merci.
 * Accueil → 10 questions (avec analyse du registre et du site) → mur de contact → résultat.
 * Filets : état gardé en session, modale de rappel quand la souris quitte la page.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SEO from "@/components/seo/SEO";
import Accueil from "@/components/simulateur/Accueil";
import { Analyse, Q1, Q10, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, type PropsQuestion } from "@/components/simulateur/Questions";
import { Resultat } from "@/components/simulateur/Resultat";
import { ModaleRappel } from "@/components/simulateur/Modales";
import { suivreEvenement } from "@/lib/simulateur/api";
import { useParcours, type EcranId } from "@/lib/simulateur/parcours";

const QUESTIONS: Partial<Record<EcranId, (p: PropsQuestion) => JSX.Element>> = {
  q1: Q1,
  analyse: Analyse,
  q2: Q2,
  q3: Q3,
  q4: Q4,
  q5: Q5,
  q6: Q6,
  q7: Q7,
  q8: Q8,
  q9: Q9,
  q10: Q10,
};

const CLE_RAPPEL_VU = "botami.simulateur.rappel-vu";

/** Ouvre la modale de rappel une seule fois, sur ordinateur, quand la souris file vers le haut. */
function useSortieDePage(actif: boolean, ouvrir: () => void) {
  useEffect(() => {
    if (!actif || !window.matchMedia?.("(pointer: fine)").matches) return;
    try {
      if (sessionStorage.getItem(CLE_RAPPEL_VU)) return;
    } catch {
      /* stockage indisponible */
    }
    let dernierY = 0;
    let dernierT = 0;
    const declencher = () => {
      try {
        sessionStorage.setItem(CLE_RAPPEL_VU, "1");
      } catch {
        /* rien */
      }
      ouvrir();
      nettoyer();
    };
    const quitte = (e: MouseEvent) => {
      if (e.clientY <= 24) declencher();
    };
    const bouge = (e: MouseEvent) => {
      const t = performance.now();
      const vitesse = dernierT ? (dernierY - e.clientY) / (t - dernierT) : 0;
      if (e.clientY < 40 && vitesse > 1.2) declencher();
      dernierY = e.clientY;
      dernierT = t;
    };
    const nettoyer = () => {
      document.documentElement.removeEventListener("mouseleave", quitte);
      window.removeEventListener("mousemove", bouge);
    };
    document.documentElement.addEventListener("mouseleave", quitte);
    window.addEventListener("mousemove", bouge, { passive: true });
    return nettoyer;
  }, [actif, ouvrir]);
}

const Simulateur = () => {
  const { parcours: p, maj, recommencer } = useParcours();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rappelOuvert, setRappelOuvert] = useState(false);
  const vueEnvoyee = useRef(false);

  useEffect(() => {
    document.body.classList.add("bo-grain");
    if (!vueEnvoyee.current) {
      vueEnvoyee.current = true;
      suivreEvenement("page_view", "simulateur_vue");
    }
    return () => document.body.classList.remove("bo-grain");
  }, []);

  // /merci n'a de sens qu'une fois le résultat débloqué.
  useEffect(() => {
    if (pathname.endsWith("/merci") && !p.contact) navigate("/simulateur", { replace: true });
  }, [pathname, p.contact, navigate]);

  const aller = useCallback(
    (ecran: EcranId) => {
      maj({ ecran });
      window.scrollTo({ top: 0 });
    },
    [maj],
  );

  const ouvrirRappel = useCallback(() => setRappelOuvert(true), []);
  const enCours = !["accueil", "resultat"].includes(p.ecran);
  useSortieDePage(enCours && p.nom.trim().length >= 2 && !p.contact && !p.rappel, ouvrirRappel);

  let ecran: JSX.Element;
  if (p.ecran === "resultat" || (pathname.endsWith("/merci") && p.contact)) {
    ecran = (
      <Resultat
        p={p}
        onDeverrouille={(contact) => {
          maj({ contact, ecran: "resultat" });
          navigate("/simulateur/merci");
        }}
        onRecommencer={() => {
          recommencer();
          navigate("/simulateur");
        }}
      />
    );
  } else if (p.ecran === "accueil") {
    ecran = <Accueil onDemarrer={() => aller("q1")} />;
  } else {
    const Composant = QUESTIONS[p.ecran] ?? Q1;
    ecran = <Composant key={p.ecran} p={p} maj={maj} aller={aller} />;
  }

  return (
    <div className="bg-cream text-ink">
      <SEO
        title="Simulateur IA gratuit — mesurez le potentiel de l'IA pour votre entreprise | Botami Software"
        description="10 questions, 5 minutes : les heures que votre équipe peut récupérer, l'économie en euros et le coût de vos outils actuels sur 3 ans. Gratuit."
        canonical="/simulateur"
        noindex={pathname.endsWith("/merci")}
      />
      {ecran}
      <ModaleRappel
        ouverte={rappelOuvert}
        onFermer={() => setRappelOuvert(false)}
        parcours={p}
        onEnvoye={(rappel) => maj({ rappel })}
      />
    </div>
  );
};

export default Simulateur;
