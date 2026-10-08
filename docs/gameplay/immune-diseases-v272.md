# V272 — paludisme et peste

Le schéma 207 ajoute deux maladies humaines immunisantes aux incidents et à la clinique existants : symptômes, repos, soins physiques, consommation de médicaments, immunité, guérison ou décès. Les épisodes et immunités sont indépendants ; ces maladies n’ajoutent aucune contagion entre personnes.

## Référence primaire

Core local **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. XML `Hediffs_Local_Infections.xml`, `Incidents_Map_Disease.xml`, `Storytellers.xml` et biomes ; classes `HediffComp_Immunizable`, `ImmunityRecord`, `ImmunityHandler`, `HediffComp_TendDuration`, `IncidentWorker_DiseaseHuman` et `StorytellerComp_Disease`. Lecture et références privées : `tmp/immune-diseases-v272-reference/SUMMARY.md`, `tmp/infection-reference` et `tmp/pacing-reference` ; aucune copie propriétaire intégrée au produit.

| Valeur par jour Core | Paludisme | Peste |
|---|---:|---:|
| Progression avant immunité complète | +0,3702 | +0,666 |
| Progression après immunité complète | −0,7297 | −0,333 |
| Gain nominal d’immunité malade | +0,3145 | +0,5224 |
| Perte d’immunité après guérison | −0,03 | −0,02 |
| Correction sous soin | −0,232 × qualité | −0,3628 × qualité |

La gravité commence à 0,001 et devient mortelle à 1. Son évolution précède l’immunité du même pas ; un décès atteint ne peut être annulé par ce gain. L’immunité dépend des capacités, de l’âge, de la faim, du repos, du lit réellement utilisé et d’une chance individuelle stable de 0,8 à 1,2. Elle persiste après disparition des symptômes.

Le paludisme réduit notamment la filtration sanguine, donc son propre gain d’immunité ; à 0,78 apparaissent douleur et vomissements, puis à 0,91 la conscience est plafonnée à 0,1. La peste aggrave douleur, conscience et manipulation aux seuils 0,6/0,8/0,9 ; son stade critique affecte aussi la respiration. Elle ne déclenche pas de vomissement.

## Boucle clinique et adaptations

L’horloge locale conserve **10 ticks Core par tick** : gravité toutes les 20 unités locales, immunité à chaque pas médical. Un soin apporte **37 500 ticks Core**, renouvelable seulement quand son restant est **strictement inférieur à 7 500** ; le restant positif est conservé et la qualité remplacée. La grippe historique conserve ses propres durées.

Le médecin atteint le patient, collecte et transporte une dose autorisée, travaille puis soigne. Les plafonds existants restent actifs : soins secs/plantes 0,7, industriel 1, glitterworld 1,3, avec variance clinique ±0,25 et règles de soin sur soi. L’autorisation « Aucun soin » empêche le traitement sans supprimer le besoin de repos. Une dose traite une maladie ; grippe, infection et nouvelles maladies gardent des cibles distinctes. Le groupe en voyage utilise ses médicaments réellement portés, retire leur masse et n’attribue pas l’XP du travail clinique local.

Le paludisme réutilise l’interruption conservative du travail, le vomissement physique, la faim et la saleté. À chaque sonde de **600 ticks Core**, sa probabilité vaut **1/150** au stade majeur et **1/75** au stade critique. Un épisode déjà commencé garde son propriétaire ; les gardes refusent les propriétaires simultanés et les cellules hors carte. Les anciens chemins sans nouvelle maladie gardent leurs tirages.

Les incidents complètent la catégorie **DiseaseHuman** existante, à partir du jour 9 et sans ticket Misc supplémentaire. Le paludisme est admissible dans le biome tempéré local, pas en boréal/aride ; les poids de maladies encore absentes restent des choix silencieux. Les calendriers et flux privés sont prospectifs : aucune maladie n’est accordée rétroactivement au chargement. La probabilité exponentielle historique de cette catégorie est conservée explicitement ; elle diffère du ratio de `Rand.MTBEventOccurs` Core. Le périmètre ne prétend pas couvrir chaque biome, immunité spéciale ou système d’exclusion absent.

## Validation

**140 cas uniques passent dans 23 fichiers, dont 42 nouveaux**, par reprise ciblée. Le groupe couvre noyau/stades/capacités, transport et consommation réels, reprise clinique, maladies coexistantes, refus de soins, plafonds et renouvellement strict, groupe hors carte, vomissement physique, immunité résiduelle, RNG et tickets, lecteurs stricts et anciennes vues. Les 62 sauvegardes publiques passent. Le groupe initial conserve 139 réussites et un échec de fixture attendant encore le schéma204 (56,312 s) ; le seul fichier corrigé passe ensuite, dix cas en4,836 s. Le premier typage (5,725 s) conserve un échec de fixture206 sans assertion de type ; build et typage final passent en6,917 s. Aucun correctif produit nécessaire après ce groupe.

**Chromium WebGPU passe en20,124 s** : deux maladies préparées sont inspectées, le médecin rejoint réellement le lit et collecte les doses ; sauvegarde/rechargement exact au tick3068 pendant un soin, puis deux traitements actifs au tick3204. Deux médicaments consommés, XP Médecin et immunité progressent, erreurs natives vides. Capture inspectée dans `tmp/immune-diseases-v272-native-QKzWal`, navigateur et serveur5303 possédés fermés. Journaux `tmp/validation-runs/v272-*`, rouges conservés.

La relecture a aussi couvert le retrait du dernier épisode après vomissement quand immunité et gravité sont nulles, et le départ en reconnaissance avec seule immunité résiduelle. Les ordres ne peuvent interrompre le vomissement. Documentation et liens contrôlés en fin de lot. Aucun fichier public de sauvegarde modifié ; ce parcours préparé ne prouve ni fréquence naturelle des incidents, ni campagne longue, ni performances générales.
