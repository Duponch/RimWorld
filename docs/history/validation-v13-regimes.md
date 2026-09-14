# Validation courante — V13 régimes alimentaires

14 septembre 2026. [Contrat](../development/food-policies.md), [sources et incertitudes](../research/food-policies-reference.md). G0 reste en consolidation et G1 partiel. Les lots qui se recouvrent ne s'additionnent pas en couverture indépendante.

## Scénarios et première intégration

Le [premier lot cœur](../../artifacts/core-food-policies-first.json) passe 30/31 scénarios : besoins, alimentation, conservation, cuisine, cultures, horaires, migrations et colonie. L'unique échec était une attente du nouveau test demandant plus de 90 points après une ration de 0,9 nutrition depuis zéro ; l'assertion vérifie désormais précisément 90 et la consommation d'une seule ration, sans changer la règle du jeu.

Le [lot suivant 7/7](../../artifacts/core-food-policies-final.json) valide les quatre scénarios de régimes, le pilote de cinq à huit jours sur trois graines, les snapshots et l'oracle de navigation. Le pilote utilise les affectations pour préserver les rations lorsque six repas sont préparés ; il peut les réautoriser lorsque les aliments frais manquent.

Les scénarios de domaine couvrent partage/copie indépendante, limites et refus atomiques, sauvegardes invalides, migration V12 conservant les états antérieurs, choix filtré avant goût/fraîcheur/accès, famine sans exception implicite, nourriture inaccessible avec repli, repas engagé lors d'un changement et cuisine/transport indépendants. Aucun test ne revendique tous les bugs possibles ni toutes les exceptions de RimWorld.

Le [premier lot UI](../../artifacts/ui-food-policies-first.json) valide Horaires ; le test des régimes réalise les opérations alimentaires puis échoue parce que son pilote tentait de cliquer Recharger sans rouvrir Menu, fermé normalement après chargement. Le pilote a été corrigé, sans changement de produit pour cet échec.

## Partie réelle et contrôle final

Le [lot UI régimes et trois jours 2/2](../../artifacts/ui-food-policies-final.json) passe en **346,5 s**, Chromium WebGPU natif. Le parcours long génère sa carte 250², utilise les vrais contrôles et ne reçoit aucun stock/besoin injecté. Au tick **18 050** : trois lits, une table, trois tabourets, six murs, un feu et quinze plants ; **21 repas cuisinés, 18 ingestions, trois dormeurs**. Six repas simples et quinze rations restent disponibles, les trois colons utilisent Sans rations après trois commandes d'affectation. [Bilan détaillé](../../artifacts/colony-food-policies-three-days.json) : nourriture minimale 39,31 et repos minimal 53,81 au checkpoint final ; bois et nourriture réconciliés, aucune erreur console/GPU. Dix-neuf checkpoints volumineux sont extraits vers tmp avec empreintes conservées dans le rapport.

L'éditeur a été inspecté visuellement : texte de nom affiché littéralement, aucune interprétation HTML, contrôles lisibles, avertissement de régime utilisé et compteur FPS visible. Le parcours court vérifie aussi copie, suppression, faim bloquée puis trois repas réellement pris après autorisation, sauvegarde/reprise et refus d'une référence de politique corrompue.

L'audit de charge suivant a révélé une anomalie supplémentaire, décrite ci-dessous. Après correction locale de l'état du cuisinier, [8/8 scénarios cœur](../../artifacts/core-food-policies-budget.json) rejouent régimes, cuisine et pilote multi-graines, avec attente de budget de navigation et reprise du produit. Le [lot UI final 3/3, 25,9 s](../../artifacts/ui-food-policies-budget.json) rejoue régimes, cuisine et conservation/migrations par le vrai worker. Le parcours UI long précédent n'a pas été relancé pour cette correction ciblée ; le pilote cœur l'a été. La compilation finale passe : 96 modules, worker 108,87 ko, jeu 1 032,66 ko / 287,98 ko gzip. Avertissement connu de bundle supérieur à 500 ko.

## Charge et anomalie corrigée

Conditions : Ryzen 5 3600, Node 24.11.1, simulation seule, carte 250² graine 42, camps synthétiques partagés à cinq colons par feu, cuisine/transport/construction/culture activés. Une passe sans préchauffage, aucun autre test lourd lancé simultanément ; setup, validation et bilans exclus du temps de tick. Ces chiffres ne sont ni des FPS ni une garantie à vitesse ×6.

Le [scénario habituel de 300 ticks](../../artifacts/cooking-food-policy-bench.json), avant la correction locale de l'état affamé, garde ses résultats métier : 2/7/12 repas, 6/36/120 cultures et 1/5/16 murs pour 3/30/100 acteurs. À cent acteurs : médiane 27,45 ms, p95 37,49, p99 43,14, maximum 45,79. Les compteurs confirment encore de larges recherches, dont certains replis visitent environ 40 000 cellules. Ce scénario ne force pas une famine.

Le scénario spécifique crée **32 régimes**, provoque une faim simultanée au tick 101, modifie trois politiques partagées (repas seulement, matières végétales/repas, rien), puis continue jusqu'à 450 ticks. Ce départ synthétique stressant n'est pas le pilote de joueur ordinaire.

Avant correction, il détectait quatre cuisiniers au tick 351 avec un repas en cours de rangement, mais l'état « affamé » : [diagnostic conservé](../../artifacts/food-policy-budget-failure.json). Les besoins écrasaient leur état alors que le processeur de cuisine attendait un budget de recherche. La correction conserve l'état de toute tâche active ; elle n'assouplit pas les invariants ni les restrictions alimentaires. Le scénario existant sauvegarde et reprend cette attente sans perdre le produit.

Le [rapport final 3/30/100](../../artifacts/food-policy-bench.json) passe avec bilans exacts, aucun nouvel aliment interdit accepté, et 4/13/23 repas cuisinés.

| Colons | Médiane ms/tick | p95 | p99 | Maximum | p95 commande ms |
|---:|---:|---:|---:|---:|---:|
| 3 | 0,015 | 1,09 | 2,72 | 26,27 | 0,040 |
| 30 | 0,776 | 15,28 | 42,09 | 43,32 | 0,0067 |
| 100 | 22,04 | 40,45 | 61,84 | 67,03 | 0,0034 |

À cent personnes, 56 nouveaux repas sont engagés et 44 terminés dans la fenêtre ; le tick du changement groupé coûte 7,94 ms, la commande maximale 0,019 ms. La progression différente interdit d'interpréter la différence entre les deux scénarios comme un gain du système de régimes. Les coûts de navigation et de congestion restent la priorité mesurée de consolidation G0.

## Documents et preuves précédentes

Guide, inventaire, adoption du corpus, catalogue (aucun objet ajouté), contrats, ADR-028 et ROADMAP actualisés. Les mentions obsolètes de conservation/horaires absents sont corrigées dans le guide ; les numéros de schéma recopiés inutilement dans les contrats de carte/logistique renvoient au contrat courant. Les originaux du corpus restent intacts. Vérification de liens/fragments et intégrité par `scripts/check-docs.py` ; cet outil ne certifie pas les règles de RimWorld.

- [V12 — horaires et sommeil](../history/validation-v12-horaires.md)
- [V11 — conservation](../history/validation-v11-conservation.md)
- [V10 — cuisine et navigation](../history/validation-v10-cuisine.md)
- [V9 — alimentation et reclassement](../history/validation-v9-alimentation.md)
- [V8 — cultures](../history/validation-v8-cultures.md)
- [V6–V7 — présentation](../history/validation-v6-v7-presentation.md)
- [V3–V5 — besoins](../history/validation-v3-v5-besoins.md)

