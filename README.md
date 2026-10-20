# Botami Build

Crée un site one-page scrollable pour **Botami**, une entreprise de développement d'applications sur mesure pour PME/TPE .

### Contexte

Le site est une vitrine de crédibilité. Le prospect type est un dirigeant de PME (35-55 ans, pas technique) qui arrive après un échange réseau ou une recherche Google "Botami". Il doit comprendre ce qu'on fait, être rassuré, et pouvoir nous contacter.

Ton de la marque : direct, professionnel sans être corporate, axé résultats concrets. Pas de jargon, pas de bullshit, pas de promesses vagues.

### Design

Tu as carte blanche sur le design. Choisis la direction esthétique, la palette de couleurs, la typographie, les animations et le layout que tu trouves les plus adaptés au contexte (B2B, services, PME française, confiance). Sois créatif et propose quelque chose de distinctif — pas un template générique.

Seules contraintes design :
- Responsive mobile-first
- Navigation sticky avec CTA toujours accessible
- Les sections alternent visuellement (fond, espacement) pour rythmer le scroll
- Formulaire de contact avec des focus states clairs
- Contraste accessible (WCAG AA minimum)


### Structure — 8 sections (contenu exact à respecter)

**NAV (sticky)**
- Logo texte "Botami"
- Liens ancrés : Le problème · Notre approche · Process · Réalisation · Équipe · FAQ
- Bouton CTA : "Discuter d'un projet" → ancre vers #contact
- Sur mobile : hamburger + CTA visible

**SECTION 1 — HERO**
- Contexte : "Développement sur mesure pour PME"
- Titre principal : "On remplace vos SaaS, Excel et outils bricolés par des applications qui vous appartiennent."
- Sous-titre : "Forfait transparent de 5 000 à 15 000 €. Code source, données, hébergement — tout est chez vous. Livré en semaines."
- 2 boutons : "Parler de votre projet" (primary) + "Voir comment ça marche" (secondary, ancre vers #process)
- 3 chiffres clés :  "4.8/5 satisfaction client" · "100% code transféré" , le 3eme je ne l'ai pas

**SECTION 2 — LE PROBLÈME**
- Titre : "Vous vous reconnaissez ?"
- Intro : "Les PME paient des outils qui coûtent trop cher pour ce qu'elles en font, sans les fonctionnalités dont elles ont vraiment besoin."
- 3 blocs (cards, colonnes, ou autre layout au choix) :
  1. **Le SaaS trop cher** — "Vous payez 100% pour 10%" — "Vous utilisez une fraction de votre SaaS. Le prix augmente chaque année. Vous ne pouvez ni le customiser, ni en sortir facilement."
  2. **L'Excel qui déborde** — "Votre fichier fait peur à tout le monde" — "Ça marchait au début. Maintenant c'est un chaos de versions, de macros cassées, et personne n'ose y toucher."
  3. **L'outil obsolète** — "Développé par quelqu'un qui n'est plus là" — "Un logiciel qui tourne à moitié, impossible à maintenir. Et pourtant, toute votre activité repose dessus."

**SECTION 3 — NOTRE APPROCHE**
- Titre : "Du logiciel qui vous ressemble"
- Sous-titre : "Pas une agence de dev à 80 000 €. Pas un SaaS de plus. Un outil sur mesure, à votre budget, qui vous appartient."
- 3 piliers :
  1. **Sur-mesure exact** — "On développe les fonctionnalités dont vous avez besoin. Pas 100 features dont vous utilisez 10. Votre outil fait exactement ce que vous voulez — rien de plus, rien de moins."
  2. **C'est votre outil** — "Code source, données, hébergement — tout est chez vous. Pas de loyer mensuel, pas de dépendance. Un autre développeur peut reprendre demain si vous le souhaitez."
  3. **Livré en semaines** — "L'IA comme assistant de développement nous permet de livrer vite, à des budgets PME. Forfait transparent, prix fixe annoncé avant de commencer."
- Encart comparatif (3 colonnes, la dernière mise en avant) :
  - SaaS à 200 €/mois → 7 200 € sur 3 ans / Vous possédez : Rien
  - SaaS à 500 €/mois → 18 000 € sur 3 ans / Vous possédez : Rien
  - Notre app (standard) → ~10 000 € une fois / Vous possédez : Tout

**SECTION 4 — PROCESS**
- Titre : "5 étapes. Vous validez à chacune."
- Sous-titre : "Vous ne gérez pas un projet IT. On pose les questions, on propose, vous validez. C'est tout."
- Afficher comme une timeline ou un stepper (layout au choix, pas un tableau) :
  1. **Diagnostic** / Gratuit · 1-2h / "On écoute votre problème, on challenge le besoin, on dit si le sur-mesure est la bonne réponse. Parfois, ce n'est pas le cas — et on vous le dit."
  2. **Cahier des charges** / ~1 semaine / "On rédige ce que l'application va faire, écran par écran. Vous validez avant qu'une seule ligne de code n'existe."
  3. **Développement** / 2-6 semaines / "On développe. Vous voyez l'avancement et pouvez tester en cours de route. Pas de tunnel de 3 mois sans nouvelles."
  4. **Recette** / ~1 semaine / "On teste ensemble sur vos cas réels. Les corrections sont incluses dans le forfait — pas de surprise."
  5. **Livraison** / 1-2 jours / "Installation sur votre hébergement. Formation de votre équipe. Documentation complète. Transfert du code source et de tous les accès."

**SECTION 5 — RÉALISATION**
- Titre : "Déjà en production"
- Étude de cas Transition Pro :
  - Client : Transition Pro — organisme public, reconversion professionnelle
  - Projet : Site événementiel "Le RDV de la Reconversion — Édition Printemps 2026"
  - Type : Application web événementielle
  - Stack : Lovable + Supabase
  - Prévoir un espace pour un screenshot (placeholder pour le moment)
- Bandeau logos clients : 3 emplacements (placeholders pour le moment)
- Mention : "L'équipe Botami est aussi notée 4.8/5 sur 50 avis pour son accompagnement en acquisition digitale."

**SECTION 6 — ÉQUIPE**
- Titre : "On comprend votre métier avant de coder"
- Sous-titre : "Pas une équipe de développeurs à l'aveugle. Deux profils business qui partent de votre problème."
- 2 profils :
  - **Elias** — Co-fondateur — "10 ans d'expertise Facebook Ads & Google Ads" — "Compréhension des flux métier, expérience client en agences. Il sait ce que vos outils doivent résoudre au quotidien."
  - **Théo** — Co-fondateur — "Responsable marketing en startup" — "Vision produit, UX, process de développement. Il structure le besoin et s'assure que l'outil fonctionne pour vous — pas juste techniquement."
  - Prévoir un emplacement pour les photos (placeholders avec initiales pour le moment)

**SECTION 7 — FAQ**
- Titre : "Vos doutes, nos réponses"
- Sous-titre : "Les vraies questions que nos clients posent avant de se lancer."
- 5 accordéons (un seul ouvert à la fois, le premier ouvert par défaut) :
  1. "Et si ça ne marche plus dans un an ?" → "Support inclus la première année. Après, maintenance optionnelle ou intervention à la demande. Et dans tous les cas, vous avez le code source — un autre développeur peut intervenir. Vous n'êtes jamais bloqué."
  2. "Comment je sais que c'est bien fait ?" → "Vous validez à chaque étape : cahier des charges, maquettes, prototype testable, recette sur vos cas réels. Rien n'est développé sans votre validation. Et tout le code est documenté et transférable."
  3. "5 à 15 000 € pour du sur-mesure, c'est pas trop beau ?" → "L'IA comme assistant de développement multiplie notre productivité. On n'a pas de structure de 50 personnes à financer. Le prix reflète le travail réel — pas une marge d'agence à amortir."
  4. "J'ai pas le temps de gérer un projet IT" → "Vous ne gérez rien. On pose les questions, on propose, vous validez. Le diagnostic prend 1-2h. Les validations en cours de projet : 30 minutes par semaine maximum."
  5. "Et si je veux changer de prestataire ?" → "Tout est à vous : code source, données, documentation technique, accès serveur. Un autre développeur peut reprendre le projet demain. Zéro lock-in, c'est dans le contrat."

**SECTION 8 — CONTACT**
- Titre : "Parlons de votre projet"
- Texte : "Diagnostic gratuit, sans engagement. On vous dit si le sur-mesure est la bonne réponse pour vous."
- Coordonnées : email contact@botami.fr (cliquable mailto:), localisation Nîmes France, lien LinkedIn
- Formulaire :
  - Prénom (requis)
  - Email (requis)
  - Téléphone (optionnel)
  - Radio buttons "Votre situation actuelle" : "Je paie un SaaS qui ne me convient pas" / "Mon fichier Excel a atteint ses limites" / "J'ai un outil interne obsolète" / "Autre / je ne suis pas sûr"
  - Textarea optionnel "Décrivez brièvement votre besoin"
  - Bouton : "Demander un diagnostic gratuit"
  - Micro-texte : "Pas de newsletter, pas de relance commerciale. Juste une réponse à votre besoin."

**FOOTER**
- Logo Botami + tagline "Applications sur mesure pour PME. Livrées en semaines. À vous pour toujours."
- Contact : email, Nîmes
- Légal : mentions légales, politique de confidentialité
- Copyright : "© 2026 Botami SAS. Tous droits réservés." + "SIREN 102688132 — Nîmes (30)"

### Contraintes techniques
- shadcn/ui + Tailwind CSS + Lucide React
- Smooth scroll entre sections
- Responsive (mobile, tablette, desktop)
- Emails et téléphone cliquables (mailto:, tel:)
- SEO : title "Botami — Applications sur mesure pour PME", meta description pertinente, balises sémantiques

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://botami-grow-code.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6cf584f2-c5be-409b-9fba-83418143fc9e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
