# Performance V89 — entretien, corps et hygiène

Mesures du 21 septembre 2026, Windows, Ryzen 5 3600, Node 24.11.1 ; navigateur Chromium natif, WebGPU AMD RDNA-1, fenêtre 1440×1000. CPU, navigateur et parcours colonial sont exécutés successivement. Les sources servies restent figées pendant le navigateur. L'activité extérieure à Lisière n'est pas contrôlée. [Méthode](../development/testing.md), [résultats métier](../history/validation-hygiene-v89.md).

## Optimisation isolée

Le profil CPU de la colonie publiée V88 désigne notamment les créations répétées du contexte de toiture. Son masque et sa liste de supports sont désormais alloués seulement si une requête les utilise. L'ordre de parcours, les supports et les règles restent identiques ; aucun cache autoritaire ne traverse une mutation.

Comparaison contre `f06dd61`, extrait en lecture seule sous `tmp/performance-v89/base`. Le candidat contient seulement cette optimisation. Chaque processus neuf poursuit les mêmes 600 ticks de la colonie V88 : quatre vivants, 36 identités mortes retenues et onze animaux. Validation finale sans erreur et même empreinte complète finale `6075d04b31d998b63571035d7b69afd840c711e989d1873800f0bb01ae06b006` dans les quatre passages.

| Passage, ordre d'exécution | Somme des pas CPU | Pas p95 | Maximum |
|---|---:|---:|---:|
| Base 3 | 890,30 ms | 2,367 ms | 54,17 ms |
| Candidat 2 | 822,35 ms | 2,284 ms | 52,83 ms |
| Candidat 3 | 834,61 ms | 2,345 ms | 53,67 ms |
| Base 4 | 885,47 ms | 2,277 ms | 53,45 ms |

Les deux comparaisons rapprochées réduisent la somme CPU de **7,63 % et 5,74 %**. Le p95 n'est pas systématiquement meilleur et les pics restent présents. C'est une courte comparaison à état identique, pas une garantie de fluidité ou de débit à 6×. Les essais de développement plus bruités restent dans `tmp` ; les quatre mesures successives sont conservées dans le [rapport comparable](../../artifacts/roof-context-comparison-v89.json).

## Charge mixte finale

`HYGIENE=1 VALIDATION_VERSION=v89` prolonge le banc TRADE/ENVIRONMENT. Il conserve 100 travailleurs, 100 lièvres et deux visiteurs, les ateliers et tous leurs oracles. Deux identités mortes supplémentaires, 36 sols de sept variantes, 24 traces, deux tombes et quatre intoxications sont des **conditions préparées annoncées**, non des résultats naturels. Quatre travailleurs nettoient, deux transportent les morts ; les anciens métiers continuent. Une validation initiale puis dix ticks précèdent la mesure.

Sur 650 ticks CPU : médiane **24,44 ms**, p95 **59,05 ms**, p99 **78,06 ms**, maximum **105,59 ms**. Après les vingt premiers ticks, p95 **51,41 ms**. Encodage de snapshots : médiane **5,14 ms**, p95 **8,98 ms**, maximum **14,95 ms**. Les 24 traces initiales disparaissent par nettoyage, les deux corps précis sont inhumés, les 36 sols restent présents et les quatre maladies progressent. Sept nouvelles traces peuvent rester : le test n'exige pas une carte perpétuellement propre. Cuisine, boucherie, chauffage, extinction et échange conservent leurs résultats. [Rapport CPU](../../artifacts/hygiene-cpu-v89.json).

Natif séparé : **661 ticks en 23,274 s**, soit **4,734× pour 6× demandé**. Image p50 **6 ms**, p95 **18 ms**, p99 **24,1 ms**, maximum **84 ms** ; worker p95 **54,5 ms**, maximum **111,6 ms**. Aucun pipeline ajouté pendant la mesure, buffers stables, aucun diagnostic de validité ou oracle métier en échec. [Rapport natif](../../artifacts/hygiene-render-v89.json).

V88 mesurait 2,640×, image p95 41,6 ms et pic 120,9 ms. Cette nouvelle charge inclut d'autres tâches et répartit autrement quelques travailleurs : la différence globale ne mesure pas l'effet causal de l'optimisation isolée. Le débit cible reste non tenu ; navigation, choix des tâches, simulation et communication demeurent à surveiller. Aucun saut de tick ou calendrier accéléré n'est employé.
