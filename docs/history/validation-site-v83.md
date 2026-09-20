# V83 — site local, sols et première récolte

20 septembre 2026, main, mode jour. Lot validé dans le périmètre décrit ci-dessous. Références primaires Core 1.6.4871 consultées en lecture seule, [carte](../research/map-calibration-reference.md), [sols et croissance](../research/site-soils-reference.md). Les fichiers propriétaires et sauvegardes personnelles brutes ne sont pas distribués.

## Périmètre et frontières

Trois reliefs locaux dans le parcours de création, forêt tempérée sans rivière, deux ou trois pierres réelles du site. Massifs/sol brut/gravier/terre riche, budget commun de filons avec occasions des minerais absents non substituées, fragments physiques transportables et végétation partielle. Croissance et inspection partagent les fertilités ; les sols naturels influencent les chemins et le déplacement. Couronnes génériques de feuillus en vue proche et distante, sans nouvelle espèce botanique.

Schéma 83, Crashlanded révision 2 et `site` révision 1. V82 validée avant migration strictement neutre : aucun paysage régénéré, sol requalifié, stock ajouté ou contexte de site déduit. Correction rétroactive explicite de l'heure de sommeil des lièvres pour le profil civil V82. Monde, autres biomes, mares, grottes, toits naturels, renouvellement écologique et catalogue complet restent absents ; aucun équilibrage Core global annoncé.

## Campagne de contrats

Première campagne : **42/44 contrôles réussis, 13 fichiers, 36,27 s**. Deux attentes de fixtures nécessitaient leur mise à jour : argument de site optionnel du client et comparaison de chance immunitaire dépendant d'identités différentes après génération. Les mêmes acteurs servent désormais à isoler l'effet de difficulté, sans supprimer la comparaison physiologique. Les deux fichiers repassent après correction (8/8). La campagne finale liée à navigation/présentation/faune/reprise passe 20/20 sur 7 fichiers en 9,42 s ; le typage passe. Au total, 51 contrôles distincts sont couverts par ces campagnes sélectionnées selon les contrats, sans prétendre rejouer tout le dépôt. Génération, admissibilité agricole, stricte migration depuis une véritable sauvegarde V82, reprise et snapshots vérifiés ensemble.

La revue indépendante a aussi détecté avant le natif une fusion de géométries indexées/non indexées sur les nouveaux arbres distants. Des indices identité préservent leurs normales plates et le masquage limité au feuillage. L'identité graphique de carte inclut désormais le relief : recréer la même graine avec un autre relief doit recentrer l'arrivée et renouveler les captures.

## Parcours naturel et diagnostic de coût

Premier parcours de **72 000 ticks, 250², graine 42, petites collines** : douze journées intégralement exécutées et assertions métier atteintes, mais **349,57 s dépassent le timeout de 240 s**. Cette passe reste un échec de campagne, pas une commande bloquée. [Journal conservé](../../artifacts/site-colony-initial-v83.txt). État et bilan complets conservés localement avant optimisation pour comparer le rejeu.

Transitions initialement observées : trois lits au tick 750, dortoir fermé/couvert à 1 500, premiers repas de baies à 2 250, stocks matériaux à 6 500, raid à 32 400 terminé à 33 250, riz récolté à 42 042 et premier repas contenant du riz à 42 268. Bilan : **120 riz récoltés et cuisinés, douze repas contenant du riz, vingt-deux repas totaux**, trois colons vivants, vingt plants ressemés, une ration restante à J12. Première production renouvelable prouvée, **autonomie durable non démontrée**. Les réserves de départ n'ont pas été retirées et ni récolte ni raid n'ont été forcés.

La navigation reconstruisait deux grandes Maps pour les coûts naturels à chaque décision et les recopiait encore à l'échelle animale. L'optimisation conserve un tableau de terrain compact partagé par deux superpositions d'objets clairsemés, propre à chaque décision. Aucun cache entre acteurs/ticks ; coûts, attente des portes, plancher entre obstacles répétés et ordre des routes inchangés. Oracle indépendant et comparaison des champs complets avant/après : mêmes coûts et parents sur nouveau départ, camp historique et checkpoint J12, aux échelles humaine et animale.

Banc CPU alterné, cinq chauffes et trente observations par cas : capture de coûts du nouveau site **p95 24,950 → 1,894 ms**, capture + recherche humaine **54,942 → 32,155 ms**, échelle animale **80,730 → 32,779 ms**. Sur le camp historique, la recherche animale varie défavorablement **11,358 → 14,099 ms** : aucun gain universel annoncé. Ce microbanc n'est ni une mesure de FPS ni de débit complet de simulation. [Mesures, sources et protocole](../../artifacts/navigation-costs-v83.json).

La [référence portable du banc](../../tests/fixtures/navigation-costs-v83-before.md) documente la commande, les prérequis et les empreintes de l'archive contenant uniquement les trois anciens modules Lisière. Le script reconstruit une copie temporaire distincte depuis le checkout, puis remplace ces trois modules ; les autres dépendances restent communes à la comparaison. Aucun ancien dossier local ni fichier propriétaire RimWorld n'est nécessaire pour reproduire les deux cas embarqués. Cette préparation du banc ne constitue pas une nouvelle mesure.

Deuxième parcours optimisé : toutes les journées et assertions sont à nouveau exécutées, mais environ 294 s dépassent encore la limite de 240 s, héritée du parcours V82 de huit jours ; [échec conservé](../../artifacts/site-colony-optimized-timeout-v83.txt). Après diagnostic des checkpoints et du coût, le watchdog du parcours de douze jours est porté à 480 s, sans retirer d'assertion ni modifier les budgets de simulation. Le **rejeu complet final réussit en 293,118 s**, 296,61 s pour la commande. [Journal réussi](../../artifacts/site-colony-final-v83.txt), [bilan détaillé](../../artifacts/crashlanded-colony-v83-42.json).

Les états finaux sérialisés des trois parcours ont exactement la même empreinte SHA-256 : `e548e6292dbb5d2da8fdee28c012bc57c139a28db071224122c33c5a49ceadd1`. Les douze relectures quotidiennes comparent également cent ticks de continuation. Cette identité établit la conservation des décisions sur ce parcours ; les durées isolées ne sont pas un benchmark statistique du gain global.

## Génération mesurée

**90 cartes : trente graines par relief, 250²**, chaque graine une fois par choix. Ryzen 5 3600, Windows 10.0.26200, Node 24.11.1. Ordre plat/petites/grandes ; JIT initial inclus. Temps de génération seul, **253,83–522,12 ms** ; ni simulation, ni rendu, ni garantie de fluidité. [Données et protocole](../../artifacts/site-generation-v83.json).

| Relief | Massifs min/max et moyenne | Arbres min–max | Baies min–max | Fragments min–max |
|---|---|---|---|---|
| Plat | 2,17–6,46 %, moyenne 4,08 % | 3 175–3 573 | 128–201 | 1 412–1 936 |
| Petites collines | 6,61–14,05 %, moyenne 9,80 % | 2 710–3 186 | 105–185 | 1 212–1 672 |
| Grandes collines | 12,69–23,44 %, moyenne 17,52 % | 2 304–2 770 | 91–159 | 907–1 315 |

Ces distributions décrivent notre algorithme, pas une parité statistique Core. Le relevé exploratoire initial de quinze cartes avait révélé une variance excessive du bruit 2D ; sa correction vient de la relecture du principe de directions unitaires 3D projetées, sans recopier la table propriétaire ni imposer un quota de roches. La campagne de 90 cartes et les contrats ci-dessus portent sur le bruit corrigé.

## Parcours natif et limites de charge

La première campagne native groupée réussit en environ deux minutes : création froide, clavier et écran étroit, grandes collines, inspection réelle de terre riche, cinq commandes communes puis trois lits, sauvegarde/chargement, pause, refus transactionnels, même graine avec relief différent et retour de caméra, véritables V82 et V81 inchangées. [Première preuve](../../artifacts/scenario-ui-before-alert-fix-v83.json). Sa revue visuelle détecte néanmoins deux boutons historiques affichés sur le profil qui refuse déjà leurs commandes. Le contrôle UI est corrigé et enrichi avant rejeu ; cet écart était visuel, aucun calendrier historique ne pouvait être activé par ces clics. La première passe n'est donc pas présentée comme un examen visuel sans défaut.

Banc de portabilité réussi depuis la référence archivée, deux cartes embarquées et dix observations par cas : reconstruction et égalité de tous les coûts/parents vérifiées. [Sortie](../../artifacts/navigation-portability-v83.json). Cette passe confirme la reproductibilité ; elle ne remplace pas la campagne de trente mesures du microbanc.

Audit CPU successif `HUNTING=1 WILDLIFE=1 VALIDATION_VERSION=v83` : terrain du banc historique 250², 3/30/100 personnes et autant de lièvres au départ, un chasseur par six, autres ateliers/recherche/minage actifs. 650 ticks, encodage tous les cinq ticks, conservation finale valide. [Mesures CPU](../../artifacts/hunting-cpu-v83.json).

| Personnes / animaux initiaux | Tick CPU p95 | Maximum | Dépouilles obtenues |
|---|---|---|---|
| 3 / 3 | 9,80 ms | 43,46 ms | 1 |
| 30 / 30 | 37,12 ms | 75,46 ms | 2 |
| 100 / 100 | 84,48 ms | 162,05 ms | 10 |

La dernière mesure comparable de charge V79 indiquait 62,29 ms au p95 à cent personnes ; V83 ne démontre donc aucun gain global sous cette charge. Les états et conditions sont ceux des rapports datés, sans comparaison statistique contrôlée entre versions. La recherche animale et les tirs restent à profiler. RimWorldWin64 était également ouvert sur le PC lors de ces essais, sans intervention de notre part. Les mesures restent conditionnées par cet environnement ; aucun débit 6× garanti.

La campagne UI complète après correction repasse en **1,8 minute** (1,9 pour la commande), sans erreur navigateur. [Preuve finale](../../artifacts/scenario-ui-v83.json). Elle contrôle aussi les activations cachées sur V83/V82 profilées et toujours visibles quand pertinentes sur V81. Les captures de [configuration](../../artifacts/scenario-site-v83.png), [terre riche](../../artifacts/scenario-rich-soil-v83.png), [premiers lits](../../artifacts/scenario-start-v83.png) et [charge à cent personnes](../../artifacts/hunting-load-v83-100.png) ont été examinées. La [capture du défaut initial](../../artifacts/scenario-alert-defect-v83.png) est conservée. Sur la nouvelle carte à trois personnes, deux fenêtres de dix secondes donnent image p95 **12,6 / 16,7 ms** à 1×/6×, maxima **20,9 / 25,2 ms**, débits **5,96 / 36,02 ticks/s**. Ces fenêtres courtes ne prouvent pas une fluidité parfaite ni les douze jours en navigateur : le parcours de douze jours est CPU, celui du navigateur couvre création, premières décisions et continuations.

Mesure native mixte successive sur AMD RDNA-1 (nom détaillé non exposé par l’adaptateur), Ryzen 5 3600, Chromium natif WebGPU, fenêtre 1440×1000. Même protocole de charge que le CPU, 90 images de chauffe puis environ 650 ticks à 6×. [Rapport natif](../../artifacts/hunting-render-v83.json).

| Personnes / animaux initiaux | Image p95 | Pic d’image | Worker p95 par moyenne de lot | Débit réel, cible 36 ticks/s |
|---|---|---|---|---|
| 3 / 3 | 8,5 ms | 29,1 ms | 10,20 ms | 35,36 |
| 30 / 30 | 16,7 ms | 37,5 ms | 32,30 ms | 34,76 |
| 100 / 100 | 29,2 ms | 62,5 ms | 68,24 ms | 22,08 |

Aucune erreur, état invalide, nouvelle compilation de pipeline pendant les fenêtres ni remplacement du lot de personnes. Les captures CPU, moyennes de lots worker et intervalles d’image sont des mesures différentes. À cent personnes, le 6× n’est pas tenu. Le test natif de forte charge utilise le terrain historique de sa fixture ; la nouvelle végétation de site est exercée dans le parcours à trois personnes, pas certifiée à cent.

## Clôture

`npm run build` (typage inclus), vérification documentaire et `git diff --check` réussissent. L’avertissement de bundle Vite supérieur à 500 kB est conservé ; il n’est pas un échec de build. Les trois originaux du corpus restent identiques. Validation centrale suivie de 12 h 06 à environ 12 h 49 : recherches, intégration, revue et diagnostic se sont chevauchés avec les sous-agents ; aucune décomposition chronométrée fiable ne permet de promettre un gain de cadence. Les trois parcours complets représentent environ seize minutes CPU ; le timeout hérité et les deux boutons détectés visuellement expliquent les reprises conservées. Les règles n’ont pas été raccourcies pour réduire ces durées.

G0 en consolidation ; G1/G2/G3 partiels, G4 partiel, G5 absent. ROADMAP seule programme les ensembles de gameplay élémentaire suivants.
