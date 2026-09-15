# Validation courante — V33, constructions en pierre

15 septembre 2026. G0 en consolidation, G1 partiel, filière pierre G2 désormais utilisable. [Contrat des matériaux](../development/construction-materials.md), [recherche récente](../research/stone-buildings-reference.md), [preuves V32 archivées](../history/validation-v32-stonecutting.md).

## Simulation et sauvegardes

**75 scénarios distincts passants**, union du [premier lot](../../artifacts/stone-buildings-focused.json), du [lot colonie et ordres](../../artifacts/stone-buildings-colony.json) et des [56 scénarios finaux](../../artifacts/stone-buildings-final-core.json). Les lots se recouvrent. Un échec initial provenait d'une attente de schéma 32 encore écrite dans une fixture ; correction puis reprise réussie, aucun échec restant dans ces scénarios. Aucun objectif de couverture exhaustive n'est annoncé.

Trois scénarios riches ajoutent les matrices indépendantes de coût/travail, cinq chaînes physiques de murs, plusieurs fournisseurs, livraison d'une unité manquante, absence de substitution de roche, annulation, reprise exacte et récupération 2/3 blocs avec bilan du type. Le lit de marbre est construit, rejoint et utilisé : dix ticks donnent exactement le gain de repos ×0,9 du témoin bois. Sauvegarde pendant sommeil puis portage, rotation et identité/propriétaire conservés. Déconstruction plafonnée, refus sans mutation ni PRNG engagé lorsque les IDs ou le compteur de pertes déborderaient. V32 migrée sans changement d'objet, bloc ou travail ; champs pierre futurs dans plans, bâtiments, paquets et bilan refusés. Matériaux inconnus, dont la chaîne `legacy`, explicitement refusés.

Le pilote naturel joue **huit jours sur 42, cinq sur 93 et 2048**, cartes 250². Il mine des fragments, fabrique, construit son premier mur de pierre puis reconstitue la réserve : **40 blocs produits = 5 incorporés + 35 rangés**. Sept murs au lieu de six, acier toujours **80 extraits = 30 incorporés à l'atelier + 50 rangés** ; aucun stock initial supplémentaire ni tirage de fragment forcé. Alimentation, couchages, loisirs, cultures et continuation quotidienne restent cohérents.

## Interface native

**Trois parcours natifs passants**, répartis entre le [premier lot](../../artifacts/stone-buildings-ui.json) et la [reprise ciblée](../../artifacts/stone-buildings-ui-recheck.json). Chromium sans arguments logiciels hérités, WebGPU sur le même poste Windows que le banc CPU, viewport 1440×1000.

- Production→construction : **12,207 s**. Fragment de marbre transporté et taillé, vingt blocs rangés, nouveau mur consommant cinq blocs, quinze restants. Reprise sauvegardée, matériau inspecté, repos 90 % annoncé au choix d'un lit, cinq pierres exclues du choix d'atelier, compteur FPS visible.
- Atelier mixte : **12,653 s** à la reprise. Choix 75 bois + 30 acier / 105 acier, rotation 1×3, chantier long rechargé, déplacement entier avec même matière/identité. Le premier passage échouait sur l'ancienne description « fabrication à venir », devenue obsolète en V32 ; assertion corrigée.
- Colonie naturelle trois jours : **373,474 s** à la reprise, nourriture et bois réconciliés, sept murs dont un en pierre, besoins satisfaits et rechargements quotidiens. Le premier passage exigeait à tort 35 blocs disponibles au même jalon que le pilote de cinq jours. Le joueur UI observe toutes les quatre heures, le pilote CPU chaque heure, et les fragments ont un rendement aléatoire. Le jalon corrigé exige un mur, quinze ou trente-cinq blocs rangés, et vérifie le réapprovisionnement lorsqu'il n'en reste que quinze : aucun fragment disponible, nouvelle désignation de minage effectivement acceptée puis sauvegardée/rechargée. Le bilan observé à trois jours est **20 produits = 5 incorporés + 15 rangés** ; la réserve de trente-cinq n'est pas revendiquée à ce stade. Les scénarios CPU de cinq/huit jours conservent leur exigence de trente-cinq.

Deux ensembles de dix-neuf checkpoints extraits sous `tmp/stone-buildings-ui-checkpoints` et `tmp/stone-buildings-ui-recheck-checkpoints` ; tailles et SHA-256 restent dans les rapports suivis. Aucun autre scénario n'a été relancé pour ces corrections d'assertions. Zéro erreur console/GPU dans les parcours passants. Captures locales `stone-buildings-ui.png`, `stonebench-ui.png` et `colony-three-days.png` produites ; mur de marbre et colonie inspectés visuellement. Aucune performance de rendu n'est déduite de ces captures.

## Audit CPU et snapshots

[Données brutes](../../artifacts/stone-buildings-cpu.json). Windows, Ryzen 5 3600, Node 24.11.1. Carte dégagée 250², un mur de cinq blocs et un tabouret de vingt-cinq par personne ; cinq pierres cyclées, vrais prélèvements/livraisons/travaux, besoins actifs. Trois répétitions jusqu'à achèvement, borne 2 000 ticks, départ à 2 000, cent ticks de chauffe séparés. Snapshots toutes les cinq étapes, validation hors chronométrage. Aucune charge de tests/browser lourde simultanée.

| Bâtisseurs | Tick p95 / p99 / max, ms | Snapshot p95, ms | Résultat identique des trois répétitions |
|---|---|---:|---|
| 3 | 0,109 / 1,372 / 5,428 | 0,398 | 6 ouvrages, 394 ticks, 90 blocs incorporés |
| 30 | 2,244 / 6,823 / 19,113 | 0,403 | 60 ouvrages, 798 ticks, 900 blocs incorporés |
| 100 | 8,049 / 10,586 / 19,937 | 0,393 | 200 ouvrages, 985 ticks, 3 000 blocs incorporés |

Chaque roche est comptabilisée séparément ; aucune matière substituée, aucun ouvrage restant en chantier. Le dernier cas incorpore 600 blocs de chaque type. Les coûts de travail diffèrent des bancs bois/acier antérieurs : ne pas présenter cette comparaison comme un gain de performance à comportement identique. Pas de mesure GPU matérielle ni promesse de FPS universels. Les nouvelles variantes ne changent ni géométrie ni nombre d'instances par ouvrage ; l'audit natif V32 reste une preuve historique et n'est pas réétiqueté V33.

## Build, docs et suites

Typage/build réussis : 169 modules, worker 202,25 kB, entrée graphique 1 062,56 kB / 297,98 kB gzip. Pas de dépendance ajoutée ; avertissement existant de bundle supérieur à 500 kB. Guide, catalogue, inventaire, contrats et ROADMAP actualisés. Originaux conservés byte-identiques et liens vérifiés. Une [première recherche des portes](../research/doors-reference.md) prépare le lot suivant sans en annoncer la livraison.

**V33 livre 25 variantes constructives**, sans nouvelle famille de bâtiment. La table de taille reste bois/acier ; le feu reste bois. Les lits en pierre récupèrent le repos 10 % moins vite ; les autres gains et services restent inchangés. Portes/toits/pièces sont les prochaines dépendances G2. Résistance, feu, beauté, valeur, qualité, fondations détaillées et autres contenus restent ouverts dans l'[inventaire](../gameplay/implementation-status.md).
