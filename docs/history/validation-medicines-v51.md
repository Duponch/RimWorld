# Validation courante — V51

17 septembre 2026. [Médicaments et plafonds](../development/medicines.md), [recherche](../research/medicines-reference.md), [V50 archivée](../history/validation-urgent-care-v50.md). Les preuves ne garantissent ni tous les cas possibles ni une fluidité parfaite.

## Simulation et régressions

Le [premier lot médical](../../artifacts/medicine-initial-v51.json) révèle des fixtures anciennes contenant le nouveau plafond, une attente XP flottante et un cooldown de fixture non réinitialisé. Après correction, [26/26 passent](../../artifacts/medicine-targeted-v51.json). L'[extension](../../artifacts/medicine-extended-v51.json) aux recharges/dix médecins/reliquat urgent révèle aussi un saignement de fixture insuffisant pour représenter une urgence : la coupure au cou du scénario urgent existant remplace cette blessure, sans modifier le seuil de jeu.

La [première suite générale](../../artifacts/core-medicine-initial-v51.json) passe **189/195**. Les fixtures historiques retirent désormais explicitement les doses/plafonds futurs ; le validateur n'est pas assoupli. Le petit scénario tutoriel plaçait sa réserve de bois sur le nouveau stock médical : il choisit désormais une case vide et conserve son bilan exact. Le [contrôle intermédiaire des migrations](../../artifacts/medicine-regression-v51.json) révèle encore une attente comparant piles anciennes et départ moderne ; elle compare maintenant aux piles historiques envoyées au chargeur.

Le pilote dépasse son budget de 180 s. Une reprise silencieuse est arrêtée pour diagnostic. Le [profil indépendant](../../artifacts/medicine-pilot-profile-v51.json) termine 108 000 ticks, trois graines 250², sans assertions/continuations profondes, en **98,65 s**, avec trente doses rangées. Coûts dominants : topologie, lumière, navigation et contextes de toiture. Aucun blocage médical constaté ; ni comparaison avant/après contrôlée ni preuve de toutes les assertions métier. Le délai du test de cohérence passe à 300 s, ses exigences métier restent intactes ; le banc CPU séparé mesure toujours la simulation. Les contextes des toits déjà terminés et scans topologiques restent des pistes de profilage, pas des optimisations annoncées livrées.

La [suite générale corrigée](../../artifacts/core-medicine-v51.json) passe **196/196 scénarios, 55 fichiers / 58 suites, 459,16 s**, avec un worker. Le pilote de trois graines, cinq à huit jours et continuation exacte passe en **249,72 s**, doses conservées et stockées. La clinique de cinq jours reste vérifiée. Cette durée supérieure à V50 n'est pas présentée comme une amélioration du workflow.

La relecture identifie ensuite un vrai défaut : la libération normale d'un traitement annulait les autres travaux acceptés en file. Un [oracle ajouté reproduit le problème](../../artifacts/medicine-queue-initial-v51.json). La libération conserve maintenant cette file ; seule l'impossibilité de déposer impose l'interruption d'urgence. Les [33 scénarios des contrats touchés](../../artifacts/medicine-final-targeted-v51.json) passent ensuite : médicaments, soins, auto-soins, urgences, ordres et cargaisons. Le long pilote sain n'est pas répété pour cette correction locale.

## Interface et présentation

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le [premier parcours médical](../../artifacts/medicine-ui-initial-run-v51.json) passe en **43,47 s** : plafond Santé, métier Travail, clic droit, sauvegarde/rechargement pendant collecte, portage et travail, annulation sans perte. Sa sonde lit les attributs GPU après rendu, sans déduire la chronologie du seul état final. Dose portée avant travail, aucun soin/XP anticipés, deux plaies et une dose au résultat. Capture inspectée, compteur FPS visible. Le [bilan médical](../../artifacts/medicine-ui-v51.json) conserve premiers états et nombres d'observations. Les parcours finaux sont consignés après exécution ci-dessous.

Après la correction de file, les parcours courts [médicament et ancien soin à sec](../../artifacts/medicine-ui-final-run-v51.json) passent en **21,72 s et 23,14 s**. La sonde médicale compte **2 156 images**, dont 211 avec dose portée et 340 de travail, deux plaies traitées, quatre doses devenant trois et 122 500 milli-XP. Le parcours long de ce lot échoue toutefois sur son premier clic de réserve ; une [reprise avec diagnostic](../../artifacts/medicine-colony-diagnostic-v51.json) échoue ensuite sur le clic de minage à 150,160. Ces échecs restent conservés.

Le helper cliquait après un délai fixe alors que l'amortissement de caméra se poursuivait. La [reprise avec observation de stabilité](../../artifacts/medicine-colony-v51.json) mesure **22,76 pixels / 636 ms** de mouvement résiduel vers la réserve et **44,31 pixels / 1 016 ms** vers cette cellule minière : la visibilité seule n'était pas une preuve de position stable. Le helper attend maintenant la projection stable, puis utilise toujours la vraie souris. Le parcours passe en **433,88 s**, sans nouvelle tentative automatique ni assouplissement des bilans. Dix-neuf checkpoints conservent leur hash ; les états volumineux restent dans `tmp`.

Le [bilan de trois jours](../../artifacts/medicine-colony-gameplay-v51.json) confirme 18 repas observés, 19 cuissons, trois dormeurs, 30 doses rangées, 14 cellules minées, 35 blocs rangés, 50 acier restant et 150 incorporé, trois lits, table/tabourets, atelier, porte, générateur/lampe et 28 cases couvertes. Bois conservé, nourriture réconciliée, aucune erreur navigateur. Capture finale inspectée. Ce test civil ne provoque pas de blessure ; le traitement réel est vérifié par la clinique distincte.

La [garde de présentation initiale](../../artifacts/medicine-presentation-initial-v51.json) valide minage mais refuse abattage : **une image de 8,3 ms sans avance**, à 6×, réserve confirmée épuisée au tick 3050. Aucun saut, pénétration, retrait anticipé ni erreur navigateur ; les 44 changements de vitesse restent entre 11,7 et 52,6 ms. L'intitulé générique « Delayed speed controls » recouvre aussi cet oracle d'attente ; il ne prouve pas ici un retour du délai de changement de vitesse. La frame maximale d'abattage atteint 137,5 ms. Le banc ajoute un mode diagnostic `HARVEST_TRACE=1` qui conserve tâches longues et réceptions/images autour de toute attente ; aucun seuil n'est relevé.

La [reprise diagnostique de l'abattage](../../artifacts/harvest-sync-medicine-chop-diagnostic-v51.json), mêmes 45 s et assertions, passe : **4 526 intervalles**, aucun saut/pénétration/attente, p95 **20,9 ms**, p99 **37,5 ms**, maximum **79,2 ms**. Ce succès ne clôt pas la cause de l'attente intermittente précédente : elle reste un risque de cadence à reproduire, distinct de la chaîne médicale validée. Pas de nouvelle modification du tampon ni d'extrapolation pour faire disparaître l'oracle. Les [deux scénarios de métriques](../../artifacts/medicine-presentation-oracle-v51.json) gardent aussi le refus du témoin historique et des observations invalides.

## Charge CPU isolée

Node 24.11.1, Ryzen 5 3600, Windows 11 10.0.26200. `scripts/rescue-bench.ts --medicine`, carte dégagée 250², 800 ticks, 1/15/50 couples médecin/patient. Collecte puis traitement de deux plaies par dose industrielle. Bilans, validité et continuation contrôlés hors chronométrage ; aucun autre banc simultané. [Rapport CPU](../../artifacts/medicine-cpu-v51.json).

| Acteurs | Tick p50 / p95 / p99 / max | Clone complet p95 |
|---|---|---|
| 2 | 0,051 / 0,331 / 2,501 / 16,939 ms | 69,016 ms |
| 30 | 0,464 / 1,300 / 7,140 / 23,394 ms | 48,414 ms |
| 100 | 1,857 / 7,096 / 26,447 / 34,663 ms | 58,100 ms |

Un passage par combinaison, premières itérations et régime échauffé inclus. Le clone intégral est distinct des deltas du worker. Le maximum de tick dépasse 20 ms à forte charge ; il ne donne pas la durée d'une image. Collecte et groupes diffèrent de V50, donc aucune comparaison causale avec l'auto-soin précédent. Clés historiques `rescued`/`carryTicks` = patients traités/ticks au chevet ; reste exact de 3/45/150 doses.

## Charge native isolée

`MEDICINE_LOAD=1 npx playwright test tests/integration/rescue-load.spec.ts`, même matériel, vrai worker 6×, carte dégagée 250², 90 images d'échauffement. [Exécution](../../artifacts/medicine-load-run-v51.json) réussie en **57,08 s**, [mesures](../../artifacts/medicine-native-v51.json).

| Acteurs | Intervalle image p50 / p95 / p99 / max | CPU image p95 | Scène p95 / max | Réception p95 / max |
|---|---|---|---|---|
| 2 | 8,4 / 16,6 / 33,4 / 41,7 ms | 10,6 ms | 5,8 / 5,8 ms | 1 / 6,5 ms |
| 30 | 8,4 / 25,1 / 33,3 / 49,9 ms | 12 ms | 5,6 / 6,2 ms | 3,9 / 9,6 ms |
| 100 | 12,5 / 37,4 / 66,7 / 74,9 ms | 14 ms | 2,4 / 6,5 ms | 13,8 / 15,7 ms |

Géométrie stable, zéro nouveau pipeline, aucune pose/cargaison invalide, 121/127/134 draw calls maximum. À cent acteurs, **4 060 observations de soin**, cinquante patients traités et bilan matière exact. Le CPU scène est inclus dans celui de l'image ; réception mesure le callback/programmation HUD, pas tout le décodage IPC. Les pointes jusqu'à **74,9 ms** restent à diagnostiquer ; aucun lissage de mesure ni fluidité universelle revendiquée. Ce scénario change quantité d'objets et déplacements par rapport à V50 et ne suffit pas à attribuer causalement la différence. Il ne représente pas cent activités mixtes en forêt. Le profilage réception/HUD et rendu doit accompagner la prochaine charge de personnages avant tout accroissement de complexité graphique.

Un [profil CDP distinct](../../artifacts/medicine-main-before-v51.json), limité au cas cent acteurs, attribue **204,10 ms sur 4 283,26 ms** à `querySelector` appelé par `moveCamera`. La recherche de dialogue ouvert parcourait le document à chaque image, même sans touche de déplacement, avec les grands tableaux de cent personnes présents dans le DOM. Ce coût est indépendant des doses. Les autres consommateurs comprennent parcours/matrices de scène, réception worker et HUD ; le profil ne démontre pas que cette seule recherche explique toutes les pointes.

La garde sur les touches évite ce parcours sans mouvement clavier, en conservant le contrôle des modales lorsqu'une touche est active. Le [second passage sans profileur](../../artifacts/medicine-native-optimized-v51.json) conserve les invariants et bilans, mais **ne démontre pas un gain global de fluidité** : pour 2/30/100 acteurs, intervalles p95 **33,3 / 29,3 / 41,5 ms**, p99 **50 / 50,1 / 79,5 ms**, maximum **71,1 / 54,1 / 87,1 ms**. CPU image p95 **10,9 / 11,5 / 18,6 ms** ; réception p95 **0,8 / 1,8 / 13 ms**. Les variations et pointes demeurent ; aucune moyenne avantageuse ni résultat précédent remplacé. Il reste nécessaire de travailler réception/matrices/DOM sur une charge plus longue et mixte au prochain lot de personnages.

Le [profil après correction](../../artifacts/medicine-main-after-v51.json), **4 387,50 ms**, ne contient plus d'échantillon `querySelector` sous `moveCamera` ; les recherches DOM restantes totalisent 44,32 ms sous HUD/compétences. Cela confirme la suppression du travail inutile ciblé, sans transformer les deux courts profils en benchmark statistique des FPS. Les mesures sans profileur ci-dessus restent la preuve des limites observées.

## Portée

Compilation TypeScript et bundle Vite réussis ; avertissement de taille du bundle Three conservé. Contrôle des liens documentaires et `git diff --check` réussis, trois sources originales inchangées. La limite de cadence ci-dessus n'est pas présentée comme corrigée par les médicaments ou par la garde DOM.

Les produits industriel, végétal et avancé sont définis/testés ; seuls les trente industriels sont obtenables dans une nouvelle partie normale. Acquisition complète, inventaires personnels, chirurgie/maladies, équipement/combat, social et monde restent ouverts. Prochain lot humain : équipement puis premier combat. G0 en consolidation, G1/G2 partiels, fondations de G3 ; aucun jalon clos.
