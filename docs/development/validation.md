# Validation courante — V12 horaires et repos

14 septembre 2026. [Contrat](schedules.md), [sources vérifiées](../research/schedules-reference.md). G0 reste en consolidation et G1 partiel. Les comptes de lots qui se recouvrent ne s'additionnent pas.

## Simulation et continuation

Le [premier groupe](../../artifacts/core-schedules-first.json) passe 32 scénarios sur 33 : besoins historiques, repas, cuisine, fraîcheur, cultures, espace et snapshots. L'unique échec concernait une égalité exacte de flottants dans la nouvelle attente de récupération (100,00000000000001 au lieu de 100). Une tolérance numérique précise a corrigé cette assertion, sans changement du moteur.

Le [groupe suivant, 5/5](../../artifacts/core-schedules-colony.json), rejoue les trois scénarios d'horaires complets, l'oracle de navigation et le pilote de cinq à huit jours sur trois graines. Il vérifie refus atomiques, frontières 0/6/22 h, lit rejoint, sommeil continu en Libre, réveil Travail à 20, nourriture prioritaire, lit inaccessible, famine, calibration et épuisement probabiliste avec reprise exacte. Le pilote décale la nuit de la cuisinière par commandes et conserve les bilans alimentaires et matériels.

## Interface et vraie partie

Le [lot UI court 3/3](../../artifacts/ui-schedules-first.json) passe en 31,7 s sur Chromium WebGPU natif : cuisine, conservation et Horaires. Le dernier scénario utilise le vrai tableau pour peindre, annuler, naviguer au clavier, copier/coller et sauvegarder ; il observe le sommeil puis le réveil physique. V11 migre vers le profil historique, un horaire corrompu est refusé sans remplacer la partie. La capture du tableau a été inspectée ; les cellules, libellés et FPS restent visibles.

La [partie UI de trois jours](../../artifacts/ui-schedules-colony.json) passe en 348 s, sans injection de besoins ou de stock. Au tick **18 096** : trois lits, table, trois tabourets, six murs, feu, quinze plants ; **21 repas cuisinés, 18 ingestions, trois dormeurs**, six repas simples en réserve, bois 47 et aucun ordre restant. Les huit heures prévues sont conservées pour chacun, avec le décalage de Mina. Nourriture minimale 39,60 et repos minimal 55,34 à ce checkpoint final. [Bilan complet](../../artifacts/colony-schedules-three-days.json) : bilans exacts, aucune erreur console/GPU. Les 19 checkpoints volumineux ont été extraits vers tmp avec leurs empreintes dans le rapport.

Le dernier contrôle de typage de la reprise avait trouvé un import manquant dans la fixture de conservation. Il a été corrigé avant compilation et parcours UI. La compilation de production passe : worker 105,77 ko, paquet jeu 1 026,96 ko avant gzip. L'avertissement de bundle supérieur à 500 ko reste connu.

## Audit court de charge

[Rapport 3/30/100](../../artifacts/schedules-bench.json) : Ryzen 5 3600, Node 24.11.1, carte 250², camps synthétiques avec cuisine, transport, cultures, construction et lits attribués ; 450 ticks de 21 h 36 à 23 h 24, puis réveil via plage Travail. Une passe sans préchauffage, simulation seule chronométrée ; génération, validation et sérialisation exclues. Aucun test lourd concurrent.

| Colons | Médiane ms/tick | p95 | p99 | Maximum | Ont travaillé / dormi |
|---:|---:|---:|---:|---:|---:|
| 3 | 0,012 | 0,38 | 2,09 | 11,64 | 3 / 3 |
| 30 | 0,179 | 5,30 | 14,30 | 28,72 | 30 / 30 |
| 100 | 1,49 | 26,73 | 34,33 | 39,65 | 100 / 97 |

À 100 acteurs, le tick de passage à 22 h coûte 5,28 ms ; celui du réveil Travail 31,44 ms. Trois personnes restent occupées pendant la fenêtre de sommeil observée : ni instantanéité ni absence de congestion ne sont prétendues. La médiane baisse quand les acteurs dorment ; ce scénario n'est pas un A/B avec une colonie constamment active. Ces valeurs ne sont pas des FPS et ne garantissent pas la vitesse ×6 à cent colons.

## Documentation et preuves précédentes

Guide, contrats, migration, adoption, inventaire, décisions et ROADMAP actualisés. Aucun objet supplémentaire n'est ajouté au catalogue par les horaires. Le vérificateur documentaire contrôle liens/fragments et les trois originaux intacts ; il ne certifie pas la fidélité au jeu de référence.

- [V11 — conservation, colonie et audit d'expiration](../history/validation-v11-conservation.md)
- [V10 — cuisine et navigation](../history/validation-v10-cuisine.md)
- [V9 — alimentation et reclassement](../history/validation-v9-alimentation.md)
- [V8 — cultures](../history/validation-v8-cultures.md)
- [V6–V7 — présentation](../history/validation-v6-v7-presentation.md)
- [V3–V5 — besoins](../history/validation-v3-v5-besoins.md)
