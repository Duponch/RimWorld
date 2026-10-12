# Carnet contextuel des premiers jours — V334

13 octobre 2026, schéma **230 conservé**. L’utilisateur autorise la poursuite autonome vers une version early access, sans attendre ses relances. Ce lot rend les premières décisions compréhensibles ; il n’ajoute ni dotation, ni tutoriel imposé, ni règle de simulation.

## Ce que voit le joueur

Après une création publique, **Conseils** s’ouvre avec sept préparations : travail, stockage, couchages, provisions, cultures alimentaires, cuisine et équipement. Chaque ligne se développe et ouvre les panneaux ou menus existants. Une sauvegarde chargée referme le carnet ; le joueur peut le rouvrir librement.

Les états décrivent la configuration actuelle, pas une mission accomplie définitivement. Les chantiers ne deviennent pas des lits, étagères ou cuisinières disponibles. Les filtres, propriétaires, personnes vivantes, professions admissibles, carburant, courant, factures et plantes sont réellement lus. Un lit double entièrement libre compte une place avant affectation ; les occupants manuels et le partage avec un partenaire sont distingués. Le stock de nourriture n’est pas une promesse d’autonomie ni d’accès ; la présence d’une zone ne promet pas une récolte. Coton, racines médicinales et foin ne constituent pas des cultures alimentaires humaines.

L’aide statique inclut désormais culture, factures de cuisine, toit, température, soins et bibliothèque de sauvegardes. L’équipement explique le geste réel : sélectionner un seul colon, clic droit sur une arme au sol, puis **Équiper**. Les références à l’ancien parcours de création et au choix exclusif Riz/Coton sont corrigées.

## Frontières et coût

`src/ui/first-day-guide.ts` dérive les faits d’un snapshot confirmé. Il ne modifie aucun World, propriétaire, priorité, PRNG ou commande. Les actions ouvrent les outils usuels ; aucune construction ou production n’est donnée à distance.

Le carnet fermé, l’accueil affiché et le remplacement du monde sortent avant toute lecture du World. Ouvert, il se rafraîchit avec le HUD confirmé, sans travail ajouté à la boucle de rendu. Les lignes sont conservées par identifiant, ce qui garde ouverture et focus lors des ticks ; un remplacement détruit les anciennes lignes et callbacks. Aucun cache par tick ne masque les commandes effectuées en pause. Aucun gain FPS ni coût nul du carnet ouvert n’est revendiqué.

Simulation, bridge, rendu, schéma et fixtures publiques sont inchangés. Les alertes existantes gardent leurs cibles et leurs interactions. Le carnet ne résout pas les trajets, régimes individuels ou ingrédients futurs : les explications signalent ces limites.

## Contrôles ROOT

Sources, tests, publics et pilote figés : **2 831 entrées**, contrôle exact avant/après le parcours. Aucun agent n’a exécuté les contrôles.

| Contrôle | Résultat | Preuve privée |
| --- | --- | --- |
| Unitaire, 19 cas / 1 fichier | PASS, 9,818 s | `tmp/validation-runs/v334-first-days-unit-2026-10-12T22-41-48.073Z-26256/output.log` |
| TypeScript natif, deux threads | PASS, 13,557 s | `tmp/validation-runs/v334-types-2026-10-12T22-42-47.379Z-15792/output.log` |
| Chrome natif, création publique 250² et carnet | PASS, 49,612 s | `tmp/validation-runs/v334-first-days-native-2026-10-12T22-43-46.149Z-1984/output.log` |
| Package Pages final | PASS, 2,327 s | `tmp/validation-runs/v334-pages-2026-10-12T22-45-33.151Z-25960/output.log` |
| Documentation et liens | PASS, 8,360 s | `tmp/validation-runs/v334-docs-2026-10-12T22-48-00.134Z-7308/output.log` |

Le parcours natif crée Camille, Ada et Gaël, vérifie les sept lignes, les ouvertures Production/Meubles/Travail/Zones sans mutation au tick 0, les vues 1440×1000 et 960×720, puis conserve la même ligne et son focus pendant les ticks. Export et recharge au **tick 7 exactement identiques**, lignes réinitialisées et textes non sélectionnables ; erreurs navigateur vides. Les deux captures sont inspectées. Les cas unitaires refusent les plans, filtres désactivés, propriétaires étrangers, morts, lits spéciaux, cultures non alimentaires et factures inutilisables ; lecture inactive/disposée et snapshots gelés sont contrôlés.

La correction de l’aide et de l’attribut `aria-expanded` du pilote a précédé le gel final natif. Une commande PowerShell de remplacement de texte a échoué au parsing ; aucun produit n’a été exécuté dans cette commande. Reprise explicite ensuite, sans modification des oracles métier. Aucun rouge de test de ce lot. Les anciens rouges V333, notamment le contrôle long de présentation refusé par WebGPU, restent historiques et non réparés par ce succès. Ce lot UI ne touche ni horloge, bridge, phases ni interpolation : ce banc long n’est pas rejoué sans cause.

## Livraison et suite

La livraison passe par commit/push sur `main` et publication regroupée avec le prochain lot ; production reste V332–V333 en `82fbe736` jusqu’à cette publication. Les serveurs/navigateurs de contrôle possédés sont fermés. Ni suite complète, campagne naturelle entière, parité Core exhaustive, disponibilité de l’arrivée en capsules, ni 240 FPS certifiés.

La relance de cette conversation est **ACTIVE**, à la nouvelle demande humaine, pour poursuivre les lots utiles. [Critères early access](early-access-readiness.md). Prochaine priorité : arrivée physique des personnes et possessions ; recherches Core et audit de custody préparés sous `tmp/arrival-v334/`, sans code propriétaire publié. Les couchages humains au sol, la première nuit dans les trois biomes et la qualification d’une campagne durable restent les lots suivants.
