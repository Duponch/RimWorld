# Validation V81 — infection et soins prolongés

20 septembre 2026. [Contrat](../development/infections.md), [sources et désaccords](../research/infection-reference.md). Reprise en mode jour ; automatisation nocturne suspendue. Branche main, base publiée V80 `5715e57`.

## Résultat fonctionnel

Une nouvelle plaie peut déclencher une infection différée. Gravité et immunité sont distinctes, visibles dans Santé, avec échéances de traitement. Les soins reviennent physiquement au chevet, utilisent de nouvelles doses et conservent réservations, besoins et continuation. L’immunité ouvre une convalescence ; la maladie peut aussi rendre incapable ou tuer. Le noyau concerne humains/lièvres ; soins vétérinaires, autres maladies et chirurgie absents. Aucun nouvel objet ni état médical ajouté aux anciennes sauvegardes.

## Scénarios ciblés et corrections conservées

- Noyau : 19/19 contrôles regroupés (`infection` et `injuries`), dont 11 scénarios d’infection : doubles tirages, délai, fusion, permanence tardive, parties perdues, immunité commune, seuils humains/lièvres, soins répétés, récupération/décès, continuation et refus atomiques.
- Soins : 15/15 (`infection-care`, `care`, `medicine`, 7,27 s), puis 4/4 finaux (2,17 s) après précision eau/propreté et annulation lorsque l’immunité est acquise pendant le travail. Première fixture avec porte sans matériau corrigée ; assertions métier conservées.
- Première régression centrale : 45/47, deux attentes corrigées. Une balle ciblée explicitement doit maintenant effectuer le tirage d’exposition ; l’ancienne attente zéro tirage restait valable seulement pour sélection/cicatrice. Le nouveau test d’amputation de copie utilisait un dégât encore sujet à la protection externe : 100 dégâts assurent la destruction, sans changer la règle. Reprise ciblée 21/21 en 3,34 s.
- Revue des sources : seuil de faim urgente du lièvre 18 % plutôt que celui humain 12 % ; eau ordinaire de propreté 0, plutôt que généralisation du sol à −1. Les corrections et la datation sont dans la recherche. La validation des risques exclut les délais inférieurs à 15 000 Core depuis la naissance d’une plaie non fusionnable ; l’écrasement conserve son échéance originale malgré une fusion.
- Campagne centrale : **186/186, 34 fichiers, 79,96 s, un seul worker**. Domaines : physiologie, soins/repas/secours, tirs/mêlée/réveils, animaux/chasse/corps/boucherie, exposition thermique, humeur/crise, pièces/toits, migrations et snapshots. Elle inclut les parcours existants de clinique cinq jours et d’expédition thermique, distincts du nouveau parcours infectieux. Après borne maximale d’exposition rattachée à la naissance de la plaie : **13/13 noyau et sauvegarde, 2,08 s**. Aucun schéma ancien n’accepte les nouveaux champs.

## Rencontre et parcours médical réel

`tests/infection-colony.test.ts` : 2/2 en 4,54 s, graine 11. Clinique préparée, trois colons et une sentinelle **initialement sains**, armes/provisions/lits annoncés. Les commandes du pilote commun jouent défense, secours et soins. Les tirs, lésions et tirages de maladie restent réels ; aucun cas d’infection n’est injecté. Le hasard favorable de cette graine ne prouve pas l’équilibrage de la difficulté.

| Étape | Tick réel |
|---|---:|
| Début de rencontre | 3 000 |
| Première blessure | 3 017 |
| Incapacité | 3 051 |
| Secours au lit | 3 238 |
| Infection déclarée | 6 197 |
| Traitements de l’infection | 6 997 / 10 098 / 13 877 |
| Immunité complète | 15 227 |
| Infection disparue | 17 862 |

Environ 2,48 jours depuis le début : dix doses consommées, dont trois pour l’infection, treize repas dont quatre par la patiente ; conservation exacte du stock et XP réelle. Sommeil de la médecin et usage physique du lit observés. La sentinelle meurt réellement d’hémorragie et reste conservée sur carte ; aucun retrait d’adversaire pour simplifier les soins. Reprises identiques à plusieurs frontières de journée. [Bilan brut](../../artifacts/infection-colony-v81.json). Checkpoints réels `tmp/infection-{declaration,renewal,immune,near-recovery,recovered}-v81.json`.

## Interface et présentation

Le parcours reprend les intervalles des checkpoints réels à 1×/6× ; il ne constitue pas une seconde passe ininterrompue de plusieurs jours dans le navigateur. Première tentative arrêtée avant soin : checkpoint installé après bootstrap, bouton Charger désactivé ; harnais corrigé pour installer la sauvegarde avant démarrage. Log et trace initiaux conservés sous `tmp/infection-ui-v81-initial.log` et `tmp/infection-ui-v81-initial-trace.zip`.

Première passe native verte : **1/1 en 53,7 s**, deux vitesses, dose portée et restauration, soin, renouvellement, immunité puis disparition. La revue des captures a conduit à remonter le bloc infection avant la liste de blessures et à défiler réellement jusqu’à lui. Un compteur diagnostic de dose utilisait un champ inexistant ; il a été remplacé par la propriété réelle de pile et l’attribut de cargaison GPU, avec assertion positive. Les assertions initiales de prélèvement/stock étaient déjà actives. [Preuve avant amélioration de disposition](../../artifacts/infection-ui-v81-before-inspection-layout.json).

**Passe native finale : 1/1, 53,5 s**, à 1× puis 6×. Dose rendue sur 2 704 / 458 images observées, travail 2 040 / 340, aucune mauvaise orientation, aucune nouvelle compilation pendant les soins et aucune erreur navigateur. Captures examinées : patient allongé, médecin adjacent, bloc maladie lisible avant les blessures, compteur FPS visible. [Rapport final](../../artifacts/infection-ui-v81.json), [soin 1×](../../artifacts/infection-care-1x-v81.png), [soin 6×](../../artifacts/infection-care-6x-v81.png), [convalescence terminée](../../artifacts/infection-recovery-6x-v81.png). Ces nombres d’images sont des observations de présentation, pas des mesures de FPS.

### Garde générale minage/abattage

Premier `test:presentation` : minage vert ; abattage en échec sur **une image sans progression, 4,2 ms**, à 6×, curseur rendu 3 050 et réserve confirmée vide (`lag=0`). Aucun saut, occupation solide, disparition anticipée ou erreur navigateur ; les 22 changements de vitesse répondent en 39,4 ms au plus, donc ce n’est pas un dépassement du budget de commande 100 ms. Le message générique « Delayed speed controls » couvre aussi cet oracle de progression. [Échec initial conservé](../../artifacts/harvest-sync-v81-initial.json).

Diagnostic ciblé : même abattage 45 s et mêmes assertions, `HARVEST_TRACE=1`, **réussi** ; 9 587 images, zéro image sans progression, zéro saut/occupation solide, commandes ≤37,6 ms. Les traces montrent notamment un pic de lot worker de62,8 ms ; elles ne capturent pas l’événement initial et n’en établissent pas la cause en amont. [Reprise diagnostique](../../artifacts/harvest-sync-v81-chop-diagnostic.json). Aucun changement d’horloge, règle de jeu, tampon ou assertion pour faire passer le contrôle. Ne pas présenter ces deux parcours comme une nouvelle passe monolithique verte, ni la non-reproduction comme une garantie de disparition du phénomène intermittent.

### Compilation et documentation

`npm run build` réussi : typage et bundle de production ; avertissement existant de chunk graphique supérieur à500 kB conservé. `python scripts/check-docs.py` et `git diff --check` passent ; originaux du corpus inchangés. Contrats, guide, inventaire, catalogue, matrice, index, architecture et roadmap actualisés. Les anciens résumés README/simulation/architecture annonçant encore V77/V74/V78 sont corrigés.

Le test thermique écrivait encore son checkpoint sous le nom historique V74. Sa sortie V81 est conservée séparément ([checkpoint](../../artifacts/heatwave-checkpoint-v81.json), [bilan](../../artifacts/heatwave-colony-v81.json)) et le fichier V74 publié est restauré octet pour octet. Les prochaines sorties prennent `VALIDATION_VERSION` ou le schéma réel ; aucune assertion du parcours ne change.

## Mesures séparées

CPU : Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1, carte naturelle 250², 650 ticks après chauffe distincte. 3/30/100 personnes avec recherche, confection, minage/abattage ; un patient contrôlé et un médecin par groupe de six, lit physique et cinq doses. Cette fixture mesure un cas médical déjà déclaré, pas sa probabilité d’acquisition. Tous les 1/5/17 patients reçoivent un soin physique ; ateliers des autres acteurs maintenus.

| Colons | Tick p95 | p99 | Maximum | Encodage snapshot p95 |
|---:|---:|---:|---:|---:|
| 3 | 0,62 ms | 1,68 ms | 7,87 ms | 1,31 ms |
| 30 | 5,51 ms | 11,88 ms | 25,99 ms | 3,34 ms |
| 100 | 16,56 ms | 26,33 ms | 33,60 ms | 4,76 ms |

[Mesures CPU brutes](../../artifacts/infection-cpu-v81.json). La charge diffère du banc V79 avec cent animaux et chasse : aucun gain général n’est déduit de leur comparaison. Aucun budget 6× garanti à cent personnes.

Mesure native successive : même CPU, adaptateur WebGPU **AMD RDNA1** (nom commercial non exposé), Chromium matériel sans SwiftShader forcé, fenêtre 1 440×1 000. Ateliers, 1/5/17 traitements physiques, états valides et géométries conservées ; zéro nouveau pipeline et zéro erreur. Chauffe 90 images, vitesse demandée 6×, 659–667 ticks observés par cas. Les valeurs worker sont les moyennes par tick des lots publiés, pas des percentiles indépendants de chaque tick.

| Colons | Image p95 / p99 | Pic image | Worker p95 / maximum | Adoption snapshot p95 |
|---:|---:|---:|---:|---:|
| 3 | 4,30 / 8,30 ms | 16,60 ms | 1,70 / 23,00 ms | 0,10 ms |
| 30 | 8,30 / 10,30 ms | 24,90 ms | 7,00 / 40,90 ms | 0,10 ms |
| 100 | 16,60 / 20,90 ms | 29,30 ms | 18,67 / 51,30 ms | 2,60 ms |

[Données natives](../../artifacts/infection-render-v81.json). Cas cent : 659 ticks en 11,62 s, temps de commande/observation inclus ; aucune promesse de débit 6× permanent ni de fluidité parfaite. Le cas médical court ne remplace pas une foule combattante ou une colonie sur plusieurs jours. Sources gelées pendant les deux parcours UI et cette mesure ; aucun long pilote concurrent.

## Portée et cadence

G0 en consolidation ; G1/G2/G3 partiels ; G4 engagé ; G5 absent. Aucun jalon complet. L’estimation globale reste 25 % (20–30), santé environ 50 % (40–60), jugements fonctionnels incertains et non pourcentages de temps restant.

La reprise réutilise la recherche préparatoire et répartit noyau, soins/recherche et UI/pilote entre trois sous-agents, puis intègre/valide centralement. Les parcours longs, CPU et natifs sont successifs. Les durées ci-dessus mesurent les commandes, pas tout le développement ; interruption nocturne et consommation de tokens ne sont pas instrumentées, donc aucun gain chiffré de cadence n’est annoncé.

Le départ Trois survivants reste éprouvé sur ses trois premières journées sous V80 ; cette clinique V81 n’en valide pas la première semaine ni une difficulté équivalente à RimWorld. Catalogue médical, biomes/scénario mondial, saisons/incendies, prisonniers/commerce et systèmes sociaux complets restent partiels ou absents. Prochaine proposition dans ROADMAP : première semaine du vrai départ, nourriture renouvelable et suites d’une menace, après instruction en mode jour.
