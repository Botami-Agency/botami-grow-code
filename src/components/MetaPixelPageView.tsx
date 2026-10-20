import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * PageView Meta à chaque changement de page de l'app. Le premier est déjà envoyé
 * par le pixel d'index.html : on ne le double pas.
 */
const MetaPixelPageView = () => {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      (window as any).fbq?.("track", "PageView");
    } catch {
      /* pixel bloqué : rien à faire */
    }
  }, [pathname]);

  return null;
};

export default MetaPixelPageView;
