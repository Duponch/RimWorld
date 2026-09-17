# Validation courante — V48

17 septembre 2026. [Alimentation assistée physique](../development/feeding.md), [sources et incertitudes](../research/feeding-reference.md). Preuves V47 [archivées](../history/validation-tending-v47.md). Les résultats ci-dessous ne garantissent ni tous les cas possibles ni une fluidité parfaite.

## Simulation, sauvegardes et partie

**180 scénarios sur 180 passent, 55 suites, 155,2 s** : [rapport global](../../artifacts/core-feeding-v48.json). Le pilote développe trois cartes 250² pendant cinq jours et poursuit la graine 42 pendant huit jours ; il dure 153,8 s dans ce passage. Après relecture, le seuil adulte du nourrissage est corrigé de 27 à 26 % selon le miroir identifié, le type de phase est validé strictement sans coercition et l'ingestion complète de riz cru est ajoutée au scénario existant. Les **22 contrôles médicaux ciblés** repassent ensuite : [rapport final](../../artifacts/feeding-final-v48.json). Ces comptes se recouvrent et ne sont pas additionnés. La suite d'intégration complète n'a pas été rejouée.

Les six scénarios de nourrissage croisent source réservée, prélèvement partiel, type et âge de l'aliment, portage, chevet cardinal, nutrition seulement au terme du repas, régime du patient, seuil exact, patient mobile au repos, politique de soin indépendante, priorité forcée, incapacité, décès, obstacle et pourriture. Ils vérifient aussi deux médecins pour un patient, source unique, refus atomique sur sol saturé, cargaison indéposable puis récupération, reprise exacte des trois phases, snapshots et migration V47 stricte. Un repas couché ne crée pas de pensée sans table ; le riz conserve sa pensée de nourriture crue. Aucun gain de Médecine pendant l'alimentation.

La clinique de cinq jours commence avec une personne à secourir, des blessures à traiter et quarante repas au sol. Les médecins la transportent, la soignent et la nourrissent plusieurs fois par les commandes de travail ; aucun repas injecté pendant l'exécution. Nutrition maintenue, lit conservé, bilan exact repas présents + ingérés, expérience provenant uniquement des soins et continuation sauvegardée contrôlés. Le pilote civil et cette clinique couvrent des situations complémentaires, pas toutes les urgences médicales.

Les essais initiaux ont révélé des fixtures à corriger : version attendue encore 47, dépôt artificiel sur une case de lit incompatible, XP attendue sans tenir compte de la passion brûlante, annulation d'un travail automatique confondue avec annulation d'un ordre forcé. Ces corrections n'assouplissent ni le validateur ni les règles de conservation.

## Gestes et présentation dans le navigateur

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le parcours médical emploie Travail, clic droit **Nourrir**, pauses/vitesses et sauvegarde/rechargement pendant le repas. Il observe les vrais attributs GPU après rendu : médecin face au patient, travail au chevet, cargaison visible et patient allongé. [Rapport](../../artifacts/feeding-ui-v48.json) : 1 179 observations, dont 414 pendant l'alimentation, cinq portions conservées jusqu'à consommation puis quatre, zéro XP et aucune erreur. Capture du chevet inspectée. Ce parcours a partagé une partie de son exécution avec des tests CPU ; aucune mesure de performance n'en est déduite.

Le [parcours de trois jours par l'interface](../../artifacts/feeding-colony-v48.json) passe en **419,9 s**, avec [bilan métier](../../artifacts/feeding-colony-gameplay-v48.json) : trois lits, repas et sièges, cultures, taille de pierre, porte, toiture, générateur et lampe opérationnels, stocks entretenus, bois conservé et nourriture réconciliée. Dix-neuf repas cuisinés, dix-huit ingérés pendant le parcours observé. Ce camp sans blessure vérifie les anciennes boucles, les soins étant exercés séparément. Les corps encodés des pièces jointes sont retirés du rapport compact, pas les résultats et assertions.

`npm run test:presentation` passe après les derniers changements : 45 s de minage puis 45 s d'abattage naturels, trois colons sur 250², changements 1×/6×/3× toutes les deux secondes. Aucun saut, aucune occupation solide et aucune famine du tampon observés ; réponses aux changements de vitesse entre 8,2 et 19,4 ms. Intervalle image p95 4,3 ms dans les deux cas, maxima 25 / 20,9 ms. [Rapport complet](../../artifacts/feeding-presentation-v48.json). Ces mesures de trois colons ne remplacent pas celles de charge ci-dessous.

## Charge CPU séparée

Node 24.11.1, même Ryzen/Windows. `scripts/rescue-bench.ts --feeding` : carte dégagée 250², 800 ticks, 1/15/50 couples médecin/patient. Résultats, validité et continuation exacte contrôlés hors chronométrage. [Mesures](../../artifacts/feeding-cpu-v48.json).

| Acteurs / patients nourris | Tick p50 / p95 | p99 / maximum | Clone intégral p95 |
|---|---|---|---|
| 2 / 1 | 0,039 / 0,173 ms | 0,766 / 20,458 ms | 52,50 ms |
| 30 / 15 | 0,244 / 0,738 ms | 1,333 / 23,406 ms | 57,25 ms |
| 100 / 50 | 0,878 / 2,474 ms | 11,512 / 29,961 ms | 49,64 ms |

Le banc partagé conserve les clés `rescued` pour les patients nourris et `carryTicks` pour les ticks observés au chevet ; le protocole les explicite. La dernière des 75 étapes consomme le repas et retire la tâche : 74 observations actives par patient. Le clone intégral des 62 500 cellules ne mesure pas les messages différentiels du worker. Un passage par combinaison, sans autre banc natif simultané ; aucun FPS déduit des temps CPU.

## Charge graphique et limites ouvertes

Même matériel, vrai worker en 6×, carte dégagée 250², 90 images d'échauffement. `FEED_LOAD=1` active le nourrissage dans le banc médical partagé. [Rapport](../../artifacts/feeding-native-v48.json).

| Acteurs / patients nourris | Intervalle image p50 / p95 / p99 / max | CPU image p95 | Draw calls max | Observations au chevet |
|---|---|---|---|---|
| 2 / 1 | 4,2 / 12,3 / 12,6 / 16,6 ms | 8,7 ms | 121 | 210 |
| 30 / 15 | 4,2 / 8,5 / 16,6 / 25,1 ms | 7,4 ms | 131 | 3 427 |
| 100 / 50 | 8,3 / 24,9 / 37,5 / 41,7 ms | 9,2 ms | 144 | 8 426 |

Tous les patients sont nourris, aucune pose invalide détectée, géométrie stable, zéro nouveau pipeline et aucune erreur JS/GPU. **Les pointes restent un problème ouvert**, malgré ces invariants graphiques. Le temps GPU direct n'est pas mesuré.

Un [passage comparatif du traitement existant](../../artifacts/feeding-care-comparison-v48.json), mêmes paramètres de banc, retrouve à cent acteurs p50 4,2 ms, p95 16,5 ms, p99 29,3 ms, maximum 45,9 ms ; CPU image p95 7,7 ms, 122 draw calls maximum. Il montre que des pointes existent aussi dans l'activité précédente, sans isoler leur cause. Les fixtures n'ont pas la même disposition ni le même nombre de piles ; ce n'est pas une comparaison causale à contenu identique. Le coût exact du nourrissage, des transferts, de l'application de scène, du HUD et du rendu demande un audit mixte instrumenté. Ni ces essais courts ni les FPS ne prouvent une colonie de cent personnes entretenue plusieurs jours, une forêt chargée ou un combat.

## Périmètre livré

TypeScript et Vite compilent le lot ; avertissement habituel de taille du chunk graphique. Documentation, guide, inventaire et catalogue distinguent l'action médicale et les objets : aucun nouvel aliment ni médicament ajouté. Originaux du corpus préservés. V47 validée strictement avant passage à V48, sans repas ou tâche inventés.

Auto-soins, médicaments, préemption générale d'urgence, files médicales, maladies/complications et chirurgie restent absents. L'équipement/combat et les relations restent les prochains grands systèmes après la chaîne médicale élémentaire. Aucun jalon G0–G5 n'est déclaré terminé.
