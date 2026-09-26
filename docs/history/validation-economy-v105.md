# Validation V105 — patrimoine, attentes, raids et commerce de l’art

26 septembre 2026 (date locale), RimWorld **Core 1.6.4871 rev590** comme référence datée. Les contrats de richesse, de menace et de commerce ont été confrontés séparément aux [recherches richesse](../research/wealth-reference-v105.md), [menace](../research/threat-reference-v105.md) et [Art échangeable](../research/art-trade-reference-v105.md). Les résultats ci-dessous concernent les mécanismes livrés par Lisière ; ils ne démontrent pas une parité générale avec RimWorld.

## Livraison et limites

Le patrimoine rassemble les valeurs de marché **connues** des objets, meubles minifiés, bâtiments et sols, sans compter deux fois un ouvrage ou une pile en transit. Une sculpture installée appartient aux bâtiments ; minifiée, elle appartient aux objets. Les possessions d’un marchand neutre sont exclues. Le relevé partagé, conservé dans la sauvegarde, est espacé de 501 ticks locaux ; l’inspection Historique lit cet instantané plutôt que de recompter la carte à chaque affichage. Les six paliers d’attentes modulent l’humeur et la tolérance aux loisirs, sans accélérer directement la baisse de la jauge de loisir.

La valeur des **personnes reste inconnue** : les données nécessaires au prix Core ne sont pas toutes modélisées. `knownTotal` et la richesse utilisée pour les points de menace sont donc des bornes inférieures du catalogue couvert, signalées comme provisoires. La courbe de points, la santé représentée, l’adaptation après pertes et les coûts des quatre profils pirates disponibles alimentent les raids ordinaires. Le raid d’introduction conserve son budget fixe et son assaillant unique. Le calendrier Cassandra reste distinct du budget et de la composition. Autres factions, stratégies, équipements et événements Core non livrés ne sont pas simulés ; les nombres de points ne sont pas des nombres de personnes.

Le petit visiteur outlander peut **acheter** une sculpture achevée et minifiée accessible au sol. Il n’arrive pas avec un stock d’art inventé ; la même œuvre peut être rachetée si elle reste dans son inventaire physique pendant la visite. Taille, matière, qualité, PV, auteur, date, identité et propriétaire suivent la cotation, la transaction, le reçu, la sauvegarde et le départ du marchand. Argent et dépôts d’un panier mixte sont prévalidés atomiquement. Une œuvre installée, portée, réservée ou hors zone n’est pas proposée. Le commerce générique des autres meubles minifiés reste hors périmètre.

Le **schéma 105** valide strictement V104 avant migration neutre : ni actif, ni argent, ni visiteur, ni richesse passée, ni raid, ni adaptation historique n’est ajouté. L’ancienne colonie adopte explicitement le suivi économique dans Historique ; elle conserve ses profils et règles tant que cette action n’a pas eu lieu. Les fixtures publiques antérieures restent immuables. G0 est en consolidation ; G1–G4 restent partiels et G5 absent.

## Contrôles de règles et de conservation

Les contrôles ciblés sont répartis par contrat, sans additionner leurs cas à des passes antérieures : [richesse et seuils](../../tests/colony-wealth.test.ts), [adoption, relevé, attentes et migration](../../tests/colony-economy.test.ts), [points et adaptation](../../tests/threat-points.test.ts), [composition et persistance des raids](../../tests/raids-v105.test.ts), [commerce d’Art](../../tests/art-trade.test.ts) et [bibliothèque](../../tests/test-colony-library.test.ts). Le fichier commerce a été rejoué avec **4 tests réussis sur 4**, dont vente/rachat de la même identité, panier saturé atomique, départ archivé et destruction du corps marchand avec l’œuvre encore dans son inventaire. Le typage a réussi. Les autres fichiers cités désignent leurs oracles ; aucun total global de tests n’est déduit de leur simple présence.

La [bibliothèque](../../public/test-saves/manifest.json) compte désormais **dix** colonies. La dixième, [Art et commerce](../../public/test-saves/v105/economie.json), est une **démonstration préparée** de 32×32 au tick 15000, avec un colon, un petit marchand généré par le moteur, 180 argent chez ce marchand, quelques biens de colonie et une petite sculpture de marbre bonne minifiée. Elle commence sans suivi économique ni échange conclu. La [génération](../../scripts/generate-economy-demo.ts) vérifie validation, aller-retour exact et empreinte SHA-256 `79bb80341733624a859cc53c222b91bccfa0b6057f82699cb92f98a0dc669789`. Ce n’est ni une colonie autonome ni une progression naturelle de sculpture ; contact, vente et paiement restent des actions réelles du joueur.

## Parcours natifs fonctionnels

Trois parcours Chromium affiché/WebGPU ont réussi sur les frontières V105 :

- [Défense du camp](../../tests/integration/raids.spec.ts) : l’[artefact](../../artifacts/raid-ui-v105.json) conserve la même issue au passage ×1 puis ×6, un assaillant mis à terre, aucun mort ni échappé, sans erreur JS/GPU. La [continuation bornée](../../artifacts/raid-colony-v105.json) consigne aussi son issue et les décisions du camp ; elle ne constitue pas une campagne annuelle.
- [Départ d’assaillant](../../tests/integration/raids.spec.ts) : l’[archive native](../../artifacts/raid-retreat-ui-v105.json) conserve le pion, sa chemise physique et les comptes de population pendant la retraite, sans erreur JS/GPU.
- [Économie et commerce](../../tests/integration/economy.spec.ts) : chargement par la bibliothèque, adoption dans Historique, affichage d’une valeur connue initiale de **358,2 argent**, contact réellement parcouru, puis vente de la sculpture `191` pour **99 argent**. Le [reçu](../../artifacts/economy-native-v105.json) conserve l’auteur `182`, la qualité bonne, le marbre, l’état intact, la vente de −1, l’argent physique et la reprise exacte de la sauvegarde au tick 15120 ; aucune erreur JS/GPU. [Historique](../../artifacts/economy-history-v105.png), [panier](../../artifacts/economy-trade-v105.png), [après vente](../../artifacts/economy-sold-v105.png).

Le premier essai du pilote économie a échoué **avant la vente** : le contact avait déjà mis le jeu en pause et la fenêtre modale interceptait le clic supplémentaire du pilote sur le bouton Pause. Le [diagnostic conservé](../../artifacts/economy-native-initial-failure-v105.md) montre ce blocage de pointeur. Le pilote corrigé vérifie l’état `aria-pressed` derrière la modale, puis le parcours complet ci-dessus réussit. Aucune règle de commerce n’a été assouplie pour réparer ce geste de test.

## Coûts CPU, worker et rendu

Le [relevé CPU V105](../../artifacts/energy-cpu-v105.json) reprend une charge **préparée** ENERGY sur carte naturelle 250² : 3/30/100 colons et autant de lièvres, cuisine, cultures, recherche et énergie, 100 ticks d’échauffement puis **650 ticks mesurés** par taille. `economy=true`, mais `trade=false`, `hygiene=false`, `environment=false` et `prisoners=false` dans ce protocole ; les parcours séparés ci-dessus couvrent commerce et raids. Les p95 de tick sont respectivement **3,23 / 15,90 / 47,06 ms** et ceux d’instantané **8,34 / 10,84 / 10,71 ms**. Ces chiffres CPU ne mesurent ni le rendu natif, ni une accélération causale, ni une garantie de ×6 à cent colons.

Le [banc natif V105](../../artifacts/energy-render-v105.json) suit le CPU, avec les sources gelées, Chromium WebGPU 1440×1000, Ryzen 5 3600 et charge ENERGY économique identique. Chaque taille a 90 images d’échauffement puis au moins 650 ticks à ×6 demandé.

| Colons + animaux | Image p95 / max | Débit réel pour ×6 | Worker p95 de moyenne par lot |
| --- | ---: | ---: | ---: |
| 3 + 3 | 4,3 / 20,8 ms | 5,90× | 3,8 ms |
| 30 + 30 | 16,7 / 33,3 ms | 5,91× | 14,1 ms |
| 100 + 100 | 12,6 / 37,5 ms | 4,67× | 44,15 ms |

Mondes valides, activités et allocations contrôlées, aucune erreur JS/GPU. Caméras adaptées aux emprises différentes : les FPS ne sont pas une fonction monotone de la population. La cadence économique évite le relevé par colon ou par image ; elle ne rend pas la simulation entièrement capable de ×6 à cent. Les variations avec V104 ne sont pas une comparaison causale contrôlée ; aucune garantie de 240 FPS ni de fluidité parfaite.

Compléments finaux : richesse **12/12**, économie **8/8**, raids V105 **5/5**, puis santé/feu/économie commerciale/bibliothèque **26/26** regroupés. La frontière supplémentaire de raid rate volontairement l’introduction J5,4 puis réussit la première attaque ordinaire J11+ : budget et composition restent appliqués même à l’identifiant 1, avec reprise active/terminée. Le contrôle historique de brèche conserve ses assertions mais attend le véritable dommage après la préparation du premier coup. Les anciens rapports restent immuables ; la continuation exécutée est conservée sous V105. Build et typage réussis ; pas de campagne annuelle pour ces frontières bornées.

## Publication

Production Netlify `6ab7114bcdaaa020bac5f765`, 35 fichiers, état `ready`. Le [contrôle général public](../../artifacts/netlify-smoke-v105.json) réussit : nouveau départ trois colons, schéma 105, sauvegarde et restauration à froid, 62 pictogrammes Architecte, curseurs et panneaux de gestion, aucune erreur JS/GPU. [Déploiement](../../artifacts/netlify-v105.json).


Le [parcours public des démonstrations](../../artifacts/economy-public-v105.json) compare les bundles publiés au build local et charge réellement les salles V103, l’atelier d’art V104 et le commerce V105 depuis les dix choix. Sauvegardes exactement conservées après migration attendue, priorité Art accessible, aucun export de diagnostic public.
