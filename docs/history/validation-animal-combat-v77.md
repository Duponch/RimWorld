# Validation V77 — santé animale et tirs

19 septembre 2026. [Contrat](../development/animal-combat.md), [recherche](../research/animal-combat-reference.md). Les essais corrigés restent ci-dessous ; les résultats finaux sont distingués de ces diagnostics.

Première passe ciblée : 37/40 ; trois nouvelles fixtures incorrectes (28 parties, heure du camp à 3000 et non zéro), puis 5/5 scénarios animaux corrigés. Les assertions métier restent présentes. Les 35 autres contrôles anatomie/lésions/Bullet/faune/tir/projectiles n'avaient pas échoué. Une passe antérieure avait aussi détecté le numéro de schéma codé en dur dans la migration de la fixture V76, remplacé par la constante courante.

Le premier précontrôle UI a détecté l'absence d'acquittement `shoot` dans le pilote commun après le clic réussi. Correction de ce pilote avant le parcours long, sans modification du mécanisme de tir pour masquer l'échec.

Le contrôle UI suivant attendait le texte « PV » après une décapitation : l'état correct était « perdu ». La graine courte retenue pour la suite provoque une première blessure non létale, afin de vérifier réellement la fuite avant les impacts suivants, sans injecter le résultat médical. Le dernier échec comparait les ticks 3026 et 3027 : la capture précédait l'acquittement de la pause. Le helper commun `pause()` attend désormais l'état confirmé ; l'oracle exact n'est pas assoupli. Première réussite native : **1/1 en 26,4 s**, vitesses 1× et 6×, sauvegarde en visée puis après blessure, mouvement observé et absence de nouvelle compilation.

La relecture des images a aussi retiré l'affichage trompeur de capacités actives sur une victime morte ; la liste conserve ses lésions et précise que les PV affichés décrivent une blessure. Ce changement de libellé ne modifie pas les règles médicales. La correction des fractions d'arêtes ralenties dans `WildlifeLayer` évite de réinterpoler toute la case à chaque segment.

## Portée des scénarios

Le compagnon UI suit de vraies commandes de tir via `perform()` ; la campagne civile reste pacifique et relève séparément animaux blessés, à terre et morts. Une fixture médicale ou de charge n'est pas une partie de chasse obtenue naturellement. La filière de viande reste absente. Le banc mixte utilise autant de lièvres que de colons ; la moitié reçoit un impact de queue par le producteur médical, puis ses besoins, sa fuite et son sang évoluent normalement. Les colons travaillent à la recherche/confection/minage/abattage ; ce n'est pas un test de cent tireurs simultanés.

## Campagne finale commune

**387/387 tests, 87 fichiers, 277,29 s.** Une passe complète après stabilisation du noyau médical : scénarios humains existants, anatomie animale, impacts, réservations, sauvegardes/migrations, worker et présentation. Les trois pilotes civils ont atteint cinq à huit jours (graines 42/93/2048), avec construction, besoins, stocks, bilans alimentaires et continuation exacte. La graine 93 contient douze lièvres ; aucune attaque ajoutée arbitrairement au camp paisible. Le scénario de raid et les autres expéditions longues de la suite restent complémentaires.

Build et typage réussis. Avertissement de bundle Vite supérieur à 500 ko conservé ; il ne mesure pas le temps d'une image en partie. Contrôles documentaires : 269 documents, sources originales byte-identiques. Les preuves historiques réécrites par certaines fixtures globales sont restaurées à leurs octets publiés ; les nouveaux parcours civils sont nommés V77.

**UI finale : 2/2, 2,2 minutes.** Tir manuel 1×/6× depuis la fixture courte, puis continuation par le vrai pilote d'une sauvegarde de colonie V76. Les comparaisons de sauvegarde restent exactes. [Tirs et poses](../../artifacts/animal-combat-ui-v77.json), [continuation de colonie](../../artifacts/colony-continuation-v77.json). Ce second parcours est une reprise, pas une nouvelle passe monolithique de trois jours. Le changement de helper et le libellé médical relus sont inclus dans cette passe.

## Audit de charge

Machine : AMD Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1 ; Chromium natif WebGPU AMD RDNA-1, fenêtre 1440×1000. Carte 250², 650 ticks, échauffement séparé (100 ticks CPU, 90 images natives), une passe par charge. CPU puis natif successifs, après les longs pilotes, sources figées. Les valeurs worker sont des moyennes de ticks par lot publié, pas des percentiles indépendants par tick.

| Colons + lièvres | Tick CPU p50 / p95 / max (ms) | Image native p50 / p95 / max (ms) | Worker publié p95 / max (ms) |
|---|---|---|---|
| 3 + 3 | 1,14 / 2,29 / 17,55 | 4,20 / 8,30 / 20,90 | 3,80 / 35,00 |
| 30 + 30 | 1,80 / 10,77 / 30,73 | 4,20 / 8,50 / 37,60 | 16,92 / 51,10 |
| 100 + 100 | 6,94 / 27,64 / 48,58 | 8,30 / 24,90 / 50,00 | 31,03 / 62,80 |

[Données CPU](../../artifacts/animal-combat-cpu-v77.json), [données natives](../../artifacts/animal-combat-render-v77.json), avec p99, maximums, snapshots, appels de dessin et matériel. Aucune nouvelle compilation de pipeline durant les fenêtres, géométries résidentes, zéro erreur GPU/JavaScript/état invalide. Confections achevées : 1/10/33 ; alimentation animale effective dans les trois charges.

À 100 + 100, 664 ticks en 13,62 s : **6× non maintenu**. Image p95 24,9 ms, pointe 50 ms ; adoption d'un snapshot jusqu'à 20,2 ms. Ces limites restent ouvertes, sans promesse de fluidité parfaite. Les p95 sont inférieurs à ceux de V76 sur cette passe, mais la fuite modifie le travail de navigation : ce n'est pas une comparaison contrôlée démontrant un gain universel. Aucun changement opportuniste de règle pour diminuer le coût.

La continuation UI de camp va du tick 13 042 au tick 18 056 : quatre colons, douze lièvres, quatre lits, 28 toits, générateur/lampe, coton et atelier ; 100 unités récoltées, dix repas cuisinés et bilan des ressources exact depuis le checkpoint. [Parcours 42](../../artifacts/colony-v77-42.json), [93](../../artifacts/colony-v77-93.json), [2048](../../artifacts/colony-v77-2048.json), [camp soumis au raid](../../artifacts/raid-colony-v77.json).

## Garde de présentation et méthode

[Garde minage/abattage](../../artifacts/harvest-sync-v77.json) réussie, 20 s par phase sur 250² avec trois colons, vitesses 1×/6×/1×/3× alternées. Zéro saut de position, occupation solide, famine de l'horloge présentée ou erreur GPU. Image p95 8,4 ms au minage et 4,3 ms à l'abattage, pointes 20,8/25 ms. Réponse visible aux changements de vitesse : 9.3–24.6 ms. Les compteurs bruts de première arête future ne sont pas des sauts ; les gardes vérifient la pose présentée. Ce scénario garde son profil historique sans animaux ; le compagnon UI et la charge mixte couvrent leur présence.

Repères de cadence, heures locales : premières sources téléchargées vers 21 h 08, modèle partagé vers 21 h 10, premier scénario profond vers 21 h 20, pilote UI vers 21 h 23. Environ vingt minutes de recherche et intégration initiales, puis vérifications/corrections/UI/docs entrelacées ; pas de chronométrage isolé fiable de chacune de ces phases. Campagne globale finale 4 min 37 s, dernier groupe navigateur 2,2 min, audit natif environ une minute et garde minage/abattage environ une minute. Les reprises du pilote (acquittement de tir, fixture létale puis pause) ont encore ajouté du travail évitable ; le helper de pause et le pilote commun réduisent ce risque pour les prochains lots. Aucun gain universel de cadence ou de tokens déduit d'une seule livraison.

G0 en consolidation ; G1/G2/G3 partiels ; G4 engagé ; G5 absent. Prochaine boucle : riposte au contact, chasse automatique, dépouille transportable et boucherie jusqu'au repas. La victime V77 reste sur place et peut gêner chantier/porte ; cette limite doit être levée par la filière physique, sans effacement gratuit ni viande à distance.
