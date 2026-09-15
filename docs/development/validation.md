# Validation courante — V30, constructions bois/acier

15 septembre 2026. G0 en consolidation, G1 partiel ; chaîne pierre G2 en cours. [Contrat](construction-materials.md), [recherche](../research/construction-materials-reference.md), [preuves V29 archivées](../history/validation-v29-steel.md).

## Simulation et continuité

**97 scénarios distincts validés**, en lots adaptés : [96 scénarios initiaux](../../artifacts/materials-suite.json) hors pilote long, [reprise de 52 concernés](../../artifacts/materials-recheck.json), puis [17 scénarios dont le pilote](../../artifacts/materials-pilot.json) et [trois frontières enrichies](../../artifacts/materials-boundaries.json). Ces nombres se recouvrent et ne s’additionnent pas.

Le premier lot passe 71/96 : attentes de version finale obsolètes, budgets de lits restés à 8 bois, une fixture essayant de déposer de la nourriture dans un lit et un import de test incorrect. La reprise passe 50/52 ; les deux derniers cas révèlent une fixture V20 contenant le nouveau champ matériau et une incompatibilité réelle de validation V2 avant l’introduction des ItemId. Après correction, les 17 scénarios concernés passent, puis les trois scénarios renforcés. Les règles historiques sont validées avant migration ; aucun relâchement pour accepter un ingrédient futur ou un excédent.

Couverture du lot : livraison bois/acier par deux transporteurs, capacité et type réservés, refus de substitution, annulation pendant portage, livraison complète avant travail, reprise exacte, faux plan/excédent/ingrédient non requis refusés ; lit acier emballé, réinstallé et remboursé en conservant propriétaire et matériau ; limite d’ID ne consommant pas le PRNG ; ancien lit V29 à 8 bois conservé, nouveaux lits à 45. Les scénarios antérieurs conservent leurs contrôles de sol saturé, usages, files, routes et bilans.

Le pilote naturel joue **huit jours sur 42, cinq sur 93 et 2048**, carte 250². Il récolte le bois requis pour les trois nouveaux lits, termine son camp, cultive, cuisine, mange, dort et entretient ses stocks ; reprise quotidienne et bilans exacts. Quatre cases de pierre et deux d’acier sont extraites, 80 acier rangés. Son stock initial n’est pas augmenté. Le test de génération 8² exerce mur + tabouret, compatibles avec ses 36 bois : il ne prétend plus financer un lit avec ce budget. Aucune garantie de couverture exhaustive.

## Interface et worker réels

[Trois parcours Chromium WebGPU](../../artifacts/materials-ui.json), tous passants sans reprise automatique ni erreur console/GPU :

- Colonie naturelle, trois jours via les commandes UI et le vrai worker, lits à 45 bois, récolte, construction, repas, sommeil, riz, cuisine, loisirs, réorganisation, minage et 80 acier stockés ; sauvegardes quotidiennes identiques : **362,1 s**.
- Fixture 32² de chantier sur une pile : dégagement porté, cadre, sauvegarde/rechargement et mur achevé : **5,2 s**.
- Fixture 32² : coût du lit affiché à 45, table à 28 bois et tabouret à 25 acier sélectionné dans Architecte ; piles alimentaires conservées, zones compatibles, matériaux incorporés, reprise et inspection « Acier » : **8,9 s**.

Les 19 checkpoints volumineux sont conservés localement dans `tmp/materials-ui-checkpoints`, avec tailles et SHA-256 dans le rapport suivi. Captures `artifacts/materials-ui.png` et `artifacts/colony-three-days.png` inspectées : teintes distinctes, inspection et compteur FPS visibles ; camp naturel alimenté à la fin. Une capture de FPS ne constitue pas un benchmark graphique. PNG locaux non suivis.

## Audit de charge ciblé

[Mesures brutes](../../artifacts/materials-cpu.json), Windows, Ryzen 5 3600, Node 24.11.1. Carte 250² synthétique dégagée, 3/30/100 bâtisseurs ; un mur en bois et un tabouret en acier par colon, matériaux physiquement présents et quatre livraisons par paire d’ouvrages. Trois répétitions jusqu’à achèvement, borne de 2 000 ticks, 100 ticks distincts de chauffe ; snapshots toutes les cinq étapes, validation hors chronométrage.

| Colons | Tick p95 / p99 / max, ms | Snapshot p95, ms | Résultat de chaque répétition |
|---|---|---:|---|
| 3 | 0,967 / 1,532 / 3,885 | 0,446 | 6 ouvrages en 190 ticks ; 15 bois + 75 acier |
| 30 | 4,505 / 10,129 / 16,244 | 0,407 | 60 ouvrages en 315 ticks ; 150 bois + 750 acier |
| 100 | 9,847 / 13,828 / 21,771 | 0,387 | 200 ouvrages en 716 ticks ; 500 bois + 2 500 acier |

Les trois répétitions atteignent les mêmes résultats et conservent les bilans. Charge différente du minage V29 : ce tableau ne prouve pas un gain ou une absence de régression entre versions. Le coût de planification reste à surveiller avant d’élargir les recettes et populations. Aucun relevé GPU de foule supplémentaire dans ce lot ; les couleurs réutilisent les lots existants, et les [mesures graphiques V29](../history/validation-v29-steel.md) gardent leurs conditions et leur date.

## Construction et documentation

Build/typage réussis ; 163 modules, worker 194,56 kB, entrée graphique 1 059,33 kB (296,93 kB gzip). Aucune dépendance ajoutée. L’avertissement de bundle supérieur à 500 kB demeure. Contrats, guide, catalogue, inventaire et ROADMAP actualisés ; anciennes phrases « minage absent » corrigées. Les originaux restent byte-identiques ; contrôles des liens et identifiants relancés à la livraison.

## Suite et limites

Bois/acier constructibles, recettes mixtes et atelier de taille encore absents. Prochain lot : atelier exigeant 75 matériau + 30 acier, puis taille et blocs typés. Les listes d’exigences préparent ce besoin sans le déclarer déjà jouable. Qualité, compétence, HP/inflammabilité des bâtiments, recherche, autres matériaux/minerais, portage par masse, toits/pièces, climat variable, santé, combat et grands systèmes sociaux restent ouverts dans l’[inventaire](../gameplay/implementation-status.md).
