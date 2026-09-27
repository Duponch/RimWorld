# Validation des fiches d'objets et du HUD — V130

27 septembre 2026. [Contrat](../development/object-inspection-v130.md) ; [relevé Core](../research/object-hud-core-v130.md). Les règles de simulation, le catalogue, le PRNG et le schéma 127 restent inchangés. Ce lot est une présentation et une mise en page, sans migration.

## Comportements contrôlés

- Objet sélectionné : le repas, la zone agricole et l'arbre se parcourent sur la même carte sans sélectionner le terrain nu. L'arbre montre une jauge de 200/200 issue de `resourceMaxHp`, le massif sa résistance minable et la barrière ses PV ; chaque ordre visible conserve sa commande réelle. Les pictogrammes d'action sont les cellules correspondantes de l'atlas Architecte existant. L'arbre historique `kind='tree'` bénéficie aussi de la fiche de croissance et de dégâts, sans changement de logique de culture.
- Survol : terre ordinaire/riche, fertilité, lumière et objet sont séparés de la sélection. Le vieux identifiant interne `tree` est présenté « Arbre ».
- HUD droit : alertes en texte sur la carte, état/date, vitesse et vue ont des groupes distincts ; les boutons feu/menace restent dans la colonne d'alertes. Les trois activations propres aux anciennes colonies sont accessibles dans le Menu quand le profil concerné les permet. « Conseils » ouvre les vrais panneaux Planning, Architecte et Recherche ; il ne prétend pas être l'Assistant adaptatif complet du Core.
- Alertes et trente événements coloniaux visibles : leurs nœuds DOM restent en place si le contenu du nouvel instantané est identique. Ce cache ne modifie ni sauvegarde ni simulation.

## Vérification

- `npm run test -- tests/map-selection-v129.test.ts tests/loose-rocks-v129.test.ts tests/inspection-dossiers.test.ts tests/journal-inspection-v129.test.ts tests/colonist-inspector.test.ts tests/visual-hud-contract.test.ts` : **16 tests / 6 fichiers réussis**. Le contrat historique de position des ressources attendait encore 16 px alors que le style en place avant V130 utilisait 18 px ; son attente a été remise en phase avec la position effective, sans modifier la largeur de 216 px.
- `npm run build` : typage et bundle réussis. L'avertissement Vite de paquet client supérieur à 500 kB reste présent.
- **10 parcours Chromium/WebGPU ciblés réussis** : `colonist-dossiers-v129`, `deconstruction`, les deux cas `farming`, `map-selection-v129`, `plants`, `mining`, `barriers`, `object-hud-v130` et `arrivals` (deux vitesses et reprise). Ces parcours ont été exécutés en groupes successifs, pas comme une campagne globale. Les premières passes ont révélé des assertions au vieux format « Croissance 21 % », un clic bloqué par la fiche ouverte et une destination tactique occupée ; tests et mise en page ont été corrigés puis les parcours concernés ont repassé. L'accueil historique reste pilotable depuis le Menu.

Les captures ciblées `artifacts/object-inspection-v130.png` et `artifacts/object-hud-v130.png` ont été inspectées : la carte et les boutons restent lisibles, et « Conseils » ne recouvre plus le compteur FPS. Les captures de tests ne sont pas des assets du jeu.

## Portée des preuves

Aucun banc A/B CPU ou timestamp GPU n'a été effectué. Les caches évitent des remplacements DOM inutiles mais ne démontrent ni hausse de FPS, ni objectif 240 FPS/×6. Les textes, catégories et boutons de toutes les fiches Core, les alertes conditionnelles absentes, les bascules de diagnostic restantes et la mémoire des notions apprises restent hors de cette validation. Le relevé installé Core et les captures utilisateur orientent l'implémentation, sans affirmer une identité de pixels ou de toutes les règles.
