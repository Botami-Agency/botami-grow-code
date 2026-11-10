// Le CRM est un projet séparé : on passe par sa fonction publique, comme
// public/rendez-vous-2.html. C'est lui qui trie le spam et crée la fiche.
const CRM_LEAD_URL = "https://twyzzagqvbhnzzhjelpl.supabase.co/functions/v1/public-booking";

export interface CrmLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  situation?: string;
  budget?: string;
  company_size?: string;
  source: string;
}

/**
 * Crée la fiche CRM du lead. Sans effet sur le visiteur si le CRM est en panne :
 * le lead est déjà enregistré dans la base du site et notifié par mail.
 */
export function forwardLeadToCrm(lead: CrmLead): void {
  fetch(CRM_LEAD_URL, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "site_form", ...lead }),
  }).catch(() => {});
}
