/**
 * Modale d'invitation de l'équipe, et champ téléphone avec indicatif (utilisé par le mur de contact).
 */
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Linkedin, Mail, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifierEmail } from "@/lib/simulateur/api";
import type { Contact } from "@/lib/simulateur/parcours";
import { Champ } from "./ui";

/* ---------- Téléphone ---------- */
export const PAYS = [
  { code: "FR", nom: "France", indicatif: "33", longueurs: [9] },
  { code: "BE", nom: "Belgique", indicatif: "32", longueurs: [8, 9] },
  { code: "CH", nom: "Suisse", indicatif: "41", longueurs: [9] },
  { code: "LU", nom: "Luxembourg", indicatif: "352", longueurs: [6, 7, 8, 9] },
  { code: "MC", nom: "Monaco", indicatif: "377", longueurs: [8, 9] },
];

export function chiffresTelephone(saisie: string) {
  return saisie.replace(/\D/g, "").replace(/^0+/, "");
}

export function telephoneValide(saisie: string, pays: string) {
  const p = PAYS.find((x) => x.code === pays) ?? PAYS[0];
  return p.longueurs.includes(chiffresTelephone(saisie).length);
}

export function telephoneComplet(saisie: string, pays: string) {
  const p = PAYS.find((x) => x.code === pays) ?? PAYS[0];
  const c = chiffresTelephone(saisie);
  const groupes = pays === "FR" ? c.replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5") : c;
  return `+${p.indicatif} ${groupes}`;
}

export function ChampTelephone({
  valeur,
  pays,
  onChange,
  onPays,
  label,
  erreur,
}: {
  valeur: string;
  pays: string;
  onChange: (v: string) => void;
  onPays: (v: string) => void;
  label: string;
  erreur?: string | null;
}) {
  return (
    <div>
      <label htmlFor="contact-telephone" className="block text-[13px] font-medium text-n-700 mb-2">
        {label}
      </label>
      <div className={cn("flex rounded-[10px] border-[1.5px] bg-white overflow-hidden transition-colors focus-within:border-ambre", erreur ? "border-red-400" : "border-n-300")}>
        <select
          aria-label="Indicatif du pays"
          value={pays}
          onChange={(e) => onPays(e.target.value)}
          className="bg-n-200/60 border-r border-n-300 px-3 text-[15px] text-ink outline-none"
        >
          {PAYS.map((x) => (
            <option key={x.code} value={x.code}>
              {x.code} +{x.indicatif}
            </option>
          ))}
        </select>
        <input
          id="contact-telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={valeur}
          onChange={(e) => onChange(e.target.value.slice(0, 20))}
          placeholder="6 12 34 56 78"
          className="flex-1 min-w-0 px-4 py-3.5 text-[16px] text-ink placeholder:text-n-500/70 outline-none"
        />
      </div>
      {erreur && <p className="mt-1.5 text-[13px] text-red-600">{erreur}</p>}
    </div>
  );
}

/* ---------- Formulaire de contact partagé ---------- */
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function useFormulaireContact(telephoneObligatoire: boolean) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [pays, setPays] = useState("FR");
  const [domaine, setDomaine] = useState<"inconnu" | "ok" | "invalide">("inconnu");
  const [tente, setTente] = useState(false);

  const nomOk = nom.trim().length >= 2;
  const emailOk = EMAIL_VALIDE.test(email.trim()) && domaine !== "invalide";
  const telVide = !telephone.trim();
  const telOk = telVide ? !telephoneObligatoire : telephoneValide(telephone, pays);
  const valide = nomOk && emailOk && telOk;

  const controlerEmail = async () => {
    if (!EMAIL_VALIDE.test(email.trim())) return;
    setDomaine(await verifierEmail(email.trim()));
  };

  const erreurs = {
    nom: tente && !nomOk ? "Indiquez votre prénom et votre nom." : null,
    email:
      domaine === "invalide"
        ? `Le domaine « ${email.split("@")[1] ?? ""} » n'existe pas. Vérifiez l'adresse.`
        : tente && !EMAIL_VALIDE.test(email.trim())
          ? "Indiquez une adresse e-mail valide."
          : null,
    telephone: tente && !telOk ? (telVide ? "Indiquez votre numéro pour débloquer le résultat." : "Ce numéro semble incomplet.") : null,
  };

  const contact = (): Contact => ({
    nom: nom.trim(),
    email: email.trim().toLowerCase(),
    telephone: telVide ? "" : telephoneComplet(telephone, pays),
    le: new Date().toISOString(),
  });

  return {
    champs: { nom, setNom, email, setEmail: (v: string) => (setEmail(v), setDomaine("inconnu")), telephone, setTelephone, pays, setPays },
    controlerEmail,
    erreurs,
    valide,
    setTente,
    contact,
  };
}

/* ---------- Coquille de modale ---------- */
function Modale({ ouverte, onFermer, children, titre }: { ouverte: boolean; onFermer: () => void; children: React.ReactNode; titre: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouverte) return;
    const ecoute = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", ecoute);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", ecoute);
  }, [ouverte, onFermer]);
  if (!ouverte) return null;
  return (
    <div data-modale-ouverte className="fixed inset-0 z-50 grid place-items-center p-4 bg-ink/40 backdrop-blur-[2px] animate-in fade-in" onClick={onFermer}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-band bg-white shadow-[0_24px_80px_rgba(26,26,26,0.25)] outline-none max-h-[92dvh] overflow-y-auto"
      >
        <button type="button" onClick={onFermer} aria-label="Fermer" className="absolute right-4 top-4 z-10 grid place-items-center w-8 h-8 rounded-full bg-white/90 text-n-700 hover:text-ink bo-focus">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ModalePartage({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);
  const lien = `${window.location.origin}/simulateur?utm_source=partage&utm_medium=equipe`;
  const message = "J'ai testé le simulateur IA de Botami pour notre entreprise. Ça prend 5 minutes, chacun répond de son côté :";
  const options = [
    { label: "WhatsApp", icone: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`${message} ${lien}`)}` },
    { label: "E-mail", icone: Mail, href: `mailto:?subject=${encodeURIComponent("Le simulateur IA de Botami")}&body=${encodeURIComponent(`${message}\n${lien}`)}` },
    { label: "LinkedIn", icone: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lien)}` },
  ];
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre="Inviter l'équipe">
      <div className="p-7 pr-14">
        <p className="font-display font-semibold text-[24px] leading-tight text-ink">Faites passer le test à votre équipe</p>
        <p className="mt-2 text-[15px] text-n-700">
          Chacun répond de son côté. Là où vos réponses divergent, il y a souvent quelque chose à regarder.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {options.map((o) => (
            <a key={o.label} href={o.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-card border-[1.5px] border-n-300 bg-white px-4 py-3.5 text-[15px] font-medium text-ink hover:border-ambre transition-colors bo-focus">
              <o.icone className="w-5 h-5 text-ambre-dark" aria-hidden />
              {o.label}
            </a>
          ))}
          <button type="button" onClick={copier} className="flex items-center gap-3 rounded-card border-[1.5px] border-n-300 bg-white px-4 py-3.5 text-[15px] font-medium text-ink hover:border-ambre transition-colors bo-focus">
            {copie ? <Check className="w-5 h-5 text-emerald-600" aria-hidden /> : <Copy className="w-5 h-5 text-ambre-dark" aria-hidden />}
            {copie ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      </div>
    </Modale>
  );
}
