# V95 — curseurs sémantiques et performance

Lot du 24 septembre 2026, depuis V94 `f993e3a`, sur `main`. Travail de moteur et de présentation ; gameplay suspendu à la demande du joueur. Schéma de sauvegarde **91**, catalogue V91, règles et dotations inchangés.

## Parcours acquis

- Curseurs : une seule flèche pour les outils, doigt pour les boutons, sablier lors de la préparation réelle, texte dans la saisie, interdit pour les commandes désactivées, loupe à la molette, main ouverte/fermée pour le déplacement. L'image de redimensionnement est prête pour une poignée qui l'emploie ; aucun panneau redimensionnable n'est livré implicitement.
- `tests/integration/interface-polish.spec.ts` : **2/2** parcours finaux réussis, 58,5 s + 26,5 s. Création, panneaux aux trois résolutions, outils, huit formes de curseur réellement utilisées, désignation/coupe, dossiers, sauvegarde exacte et dialogue commercial avec contact physique. [Rapport interface](../../artifacts/interface-native-v95.json), [commerce](../../artifacts/interface-trade-v95.json).
- Replays de simulation : trois personnes/40 ticks (41 checkpoints), cent personnes/80 ticks (9 checkpoints), charge mixte cent colons/cent lièvres/120 ticks (13 checkpoints). Sauvegardes et PRNG identiques aux témoins sur ces parcours. Aucun jour sauté ni règle accélérée.

## Mesures finales comparées

Windows, Chromium natif WebGPU, AMD RDNA 1, écran 240 Hz, viewport 1920×1080. Chaque fenêtre repart de la même sauvegarde et dure six secondes après préparation. Sources gelées ; témoin V94 `f993e3a` isolé, puis V95. Les moyennes courtes ne constituent pas une garantie et les variations entre passages restent visibles.

| Scène | FPS V94 → V95 | Intervalle p95 V94 → V95 | Pic V95 | Vitesse réellement simulée V95 |
|---|---:|---:|---:|---:|
| 3 colons, proche, pause | 178,0 → 173,5 | 8,4 → 8,4 ms | 29,1 ms | pause |
| 3 colons, carte entière, pause | 80,4 → 230,2 | 16,7 → 4,3 ms | 12,5 ms | pause |
| 3 colons, proche, 6× | 97,2 → 126,9 | 37,4 → 16,7 ms | 62,5 ms | 5,96× |
| 3 colons, carte entière, 6× | 50,1 → 188,1 | 50,1 → 8,5 ms | 41,6 ms | 5,97× |
| 100 colons + 100 animaux, carte entière, pause | 85,5 → 238,8 | 16,6 → 4,3 ms | 29,2 ms | pause |
| 100 colons + 100 animaux, carte entière, 6× | 37,5 → 142,9 | 62,5 → 20,8 ms | 58,3 ms | 1,97× (V94 : 1,92×) |

Le monde mixte contient aussi quatre personnes de visite/captivité, soit 104 personnes au total, et 266 piles au chargement. Le rendu progresse fortement au dézoom. **La vue proche en pause ne progresse pas dans ce comparatif**, et la simulation de grande colonie reste très loin de 6× : ne pas confondre FPS et jours simulés par seconde. Rapports : [V94 répété](../../artifacts/performance-v95-baseline-repeat.json), [V95 final](../../artifacts/performance-v95-final-resident.json), [charge mixte V94](../../artifacts/performance-v95-mixed-baseline.json), [charge mixte V95](../../artifacts/performance-v95-mixed-final.json).

Une passe diagnostique distincte mesure le GPU : proche/pause moyenne **1,46 ms**, p95 **2,75 ms** ; carte entière/6× moyenne **0,77 ms**, p95 **0,98 ms**. Les pics respectifs atteignent 6,55 et 2,49 ms. La soumission conservatrice ne garantit pas ce coût sur toutes les cartes. Les FPS de cette passe instrumentée ne remplacent pas les mesures sans timestamps. [GPU final](../../artifacts/performance-v95-gpu-final.json).

CPU seul, même charge habitat/habillement, 100 colons + 100 animaux, 650 ticks mesurés et 100 ticks d’échauffement séparés : médiane **35,93 → 24,27 ms** (−32,4 %), p95 **65,66 → 54,76 ms** (−16,6 %), maximum **122,32 → 123,77 ms**. Les champs d’issue des 650 ticks sont identiques. L’encodage seul régresse : médiane **6,31 → 7,36 ms**, p95 **11,54 → 14,62 ms**, notamment avec la comparaison privée des piles. Il faut évaluer aussi le transport et le décodage, pas annoncer un gain sur chaque étape. [CPU V94](../../artifacts/habitat-apparel-cpu-v95-baseline.json), [CPU V95](../../artifacts/habitat-apparel-cpu-v95.json), [hashes des trois replays](../../artifacts/navigation-equivalence-v95.json).

## Validation finale

- Groupe central : **39 contrôles, 12 fichiers** (navigation, planification/simulation, snapshots, buffers, paysage, curseurs et interface). Les changements finaux limités aux lots vides sont revérifiés avec les trois suites de rendu : **10/10** contrôles réussis (inclus dans le groupe, pas dix nouveaux cas).
- Images : **17/18 PNG strictement identiques** ; la vue nocturne proche diffère d’un seul pixel sur 1 440 000, écart maximal 22/255 par canal. **18/18** respectent le seuil raster déclaré (au plus deux pixels et 32/255). Aucun objet, sommet, espèce ou niveau d’ombre retiré. L’essai incluant les piles dans le bundle avait davantage d’écarts ; ces piles restent finalement indépendantes. [Résultat](../../artifacts/landscape-equivalence-v95.json), [comparaison stricte conservée](../../artifacts/landscape-equivalence-v95-strict.json), [essai des piles](../../artifacts/landscape-equivalence-v95-piles-trial.json).
- Les frontières de snapshots vérifient la mutation imbriquée, l’ordre, les ajouts/retraits, les valeurs exactes, la conservation de l’ancien instantané et le refus atomique après modifications candidates des ressources.
- Les états du monde et les décisions ne changent pas. Aucun horizon biologique ni fréquence du moteur n’est réduit pour les performances ; aucune nouvelle migration.

Build de production et typage réussis ; avertissement Vite de taille de bundle conservé (jeu 1,28 Mo avant gzip, worker 799 Ko). Audit documentaire : 357 documents, 3 881 liens, identifiants et trois corpus originaux conservés. `git diff --check` passe. Le parcours HTTPS du build publié est ajouté à la fin de ce rapport.

Banc isolé de transmission : 10 échauffements + 80 paquets, données inchangées sauf drapeau vestimentaire réel. À 1 731 piles : encode + clone + decode **12,10 → 8,15 ms** en moyenne ; 138 480 piles transmises deviennent huit mises à jour. À dix piles, **0,166 → 0,181 ms**, léger surcoût. Ce banc ne remplace pas le parcours de colonie ; il explique le compromis de l’encodage incrémental. [Données](../../artifacts/bridge-transport-v95.json), producteur `scripts/bridge-transport-v95.mjs`.

## Diagnostics conservés

Le premier passage après les seules corrections de buffers montre des résultats variables : certaines phases proches sont plus lentes et la phase éloignée suivante plus rapide. Ces fichiers sont conservés ; on n'en choisit pas arbitrairement le meilleur comme résultat final. [Avant](../../artifacts/performance-v95-before.json), [première passe](../../artifacts/performance-v95-after-first.json), [diagnostic CPU/GPU](../../artifacts/performance-v95-diagnostic.json), [essai des commandes conservées](../../artifacts/performance-v95-bundles-trial.json).

Un test de colonie historique lancé lors de l'audit CPU attend encore `schemaVersion === 90`, alors que sa reprise courante est 91. Il échoue avant la campagne : ce résultat ne prouve aucune régression de navigation, mais il n'est pas compté comme succès. Le pilote et ses assertions métier restent inchangés dans ce lot.

Le contrôle A/B des plantes V94 ne masquait pas durablement le lot, car `frame()` rétablissait sa visibilité. Cette limite est corrigée dans le contrat courant, sans réécrire la preuve historique.

## Portée

G0 reste en consolidation ; G1/G2/G3 partiels, G4 engagé, G5 absent. Le lot ne complète ni le monde, ni la diplomatie, ni le catalogue ou l'élevage. Les FPS dépendent du matériel, du cadrage et des activités. 240 FPS représentent seulement 4,17 ms par image : un bon débit moyen de simulation ne suffit pas à garantir cette échéance à chaque image.

Le protocole, les sources techniques et les choix sont consignés dans [l'audit V95](../research/performance-v95.md). La cible globale reste ouverte : adoption de végétation, pics d’interface, navigation et coût du worker à cent colons demandent encore du travail. Les tests courts et la campagne CPU portent sur les contrats touchés ; aucune campagne naturelle annuelle n’a été rejouée.

Incident de publication : HTTP 429 après création du déploiement, puis GET ne donnant pas la liste des fichiers encore manquants. Le premier contrôle public trouve toujours les anciens curseurs et échoue ; [preuve conservée](../../artifacts/netlify-smoke-v95-before-upload-resume.json). La reprise réutilise le même déploiement et renvoie le manifeste inchangé via l’opération officielle de mise à jour. Le contrôle du site doit réussir avant de déclarer la publication accomplie.

Déploiement final : `6ab57508f64713831acd4aec`, état API **ready**, 23 fichiers. La limite API et le défaut de reprise ont été résolus sans créer un second déploiement. Le contrôle public final est consigné dans [Netlify V95](../../artifacts/netlify-v95.json) et [son parcours HTTPS](../../artifacts/netlify-smoke-v95.json).

Contrôle public final : **réussi**, HTTPS 200, sept illustrations vérifiées, création/curseurs/sauvegarde/chargement et aucune erreur navigateur.
