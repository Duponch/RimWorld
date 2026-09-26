# Validation V108 — délai avant déplacement

26 septembre 2026. Demande prioritaire du joueur : réduire le délai entre clic droit et départ visible, vérifier les déplacements autonomes et préserver les performances. [Diagnostic sourcé](../research/movement-latency-v108.md), [contrat](../development/presentation-timing.md).

## Modification et périmètre

Une seule modification de production : `MOTION_BUFFER_TICKS` passe de quatre à deux. Les quatre ticks valaient **667 ms à ×1**, avant même le prochain tick de départ ; les valeurs historiques 400/67 ms du contrat courant étaient périmées depuis V82 et sont corrigées. Le worker traite directement l'ordre au sol ; le colon disponible démarre au prochain tick. Aucun tick supplémentaire n'est exécuté au clic.

Corps, cargaison, anneaux, animaux, travail, impacts et scène gardent leur horloge confirmée commune. Le retard de rendu ne modifie ni les décisions, ni les réservations, ni les horloges métier : il ne s'accumule pas dans ces boucles. Cela ne constitue pas un audit exhaustif de tous les planificateurs. Leurs attentes explicites, les portes et récupérations restent conservées.

Schéma **106**, sauvegardes historiques, PRNG, durées de déplacement, navigation et catalogue inchangés. G0–G5 restent dans leur état global antérieur ; aucun jalon ni estimation fonctionnelle augmenté. La préparation industrielle reste distincte de cette livraison.

## Délai mesuré par vrais clics

[Banc reproductible](../../scripts/movement-latency-v108.mjs), [témoin quatre ticks](../../artifacts/movement-latency-baseline-v108.json), [candidats deux/un](../../artifacts/movement-latency-v108.json). Chromium visible, WebGPU natif, 1440×1000, colon sain seul sur terrain libre, six trajets par vitesse et candidat. Sources figées ; la constante témoin est remplacée seulement dans la réponse HTTP du pilote. Sondes sur le vrai clic, la commande, son accusé, le premier segment autoritaire et les attributs/uniformes de pose réellement fournis au GPU. Ce ne sont pas des lectures de sommets GPU après dessin.

| Réserve | Vitesse | Clic → accusé, médiane | Clic → mouvement autoritaire, médiane | Clic → premier mouvement dessiné, médiane / maximum |
|---|---:|---:|---:|---:|
| 4, témoin | ×1 | 2,2 ms | 93,6 ms | 759,7 / 788,5 ms |
| 2, retenue | ×1 | 2,7 ms | 70,1 ms | 419,2 / 440,1 ms |
| 1, rejetée | ×1 | 2,9 ms | 67,5 ms | 259,6 / 283,5 ms |
| 4, témoin | ×6 | 2,1 ms | 22,9 ms | 134,7 / 142,2 ms |
| 2, retenue | ×6 | 3,1 ms | 13,6 ms | 71,2 / 87,6 ms |
| 1, rejetée | ×6 | 2,8 ms | 26,0 ms | 65,7 / 77,2 ms |

Sur ces petites séries : environ **45 % de délai visible en moins à ×1**, **47 % à ×6**. Le moment du clic dans le pas de simulation explique une partie de la variation de délai autoritaire ; aucun gain de logique n'est attribué au tampon. Six observations ne fournissent pas des percentiles de population robustes. Deux ticks : zéro image affamée sur les douze trajets ; un tick : cinq images dont la progression est bridée faute de temps confirmé. Les images p95 restent à 4,3 ms pour les trois candidats sur ce petit monde. Aucune promesse de départ instantané ni de même délai sur toute machine.

Le premier pilote comparait `motion.start` au tick encore connu du client, qui pouvait être déjà ancien d'un tick à l'acceptation. La sonde utilise maintenant le tick du snapshot qui confirme réellement le nouvel ordre ; l'assertion départ au tick suivant est conservée. Le témoin mesuré avant cette correction est gardé et n'avait pas rencontré ce décalage. Premier lancement interrompu avant mesure : chemin Chromium à préciser avant import Playwright ; le banc charge maintenant le module après configuration.

## Contrats et UI

[29 contrôles, 7 fichiers](../../artifacts/movement-checks-v108.json), environ 7,85 s : horloge réelle, réception/RAF, trajets/virages, ralentissements, mouvement tactique et civil, conservation, phases minage/coupe/transport, archives et continuation exacte. Les deux nouveaux tests de présentation comprennent **40 replays à 240 Hz**, phases worker de 0 à 19 ms, livraison alternée 0/20 ms, changements ×1/×3/×6, pause vidée et snapshots répétés : aucun arrêt après amorçage, retour en arrière, extrapolation ou accélération de rattrapage.

[Quatre parcours natifs](../../artifacts/movement-native-v108.json), **138,5 s**, sans erreur JS/GPU : R et bouton de groupe, clic droit et file de déplacements, arrêt/démobilisation, sauvegarde/reprise en route, croisement civil avec lits réservés, travail après virages et cargaisons au-dessus des meubles. [Mobilisation](../../artifacts/drafting-ui-v108.json) : 6 023 échantillons, erreur de vitesse maximale 3,1×10⁻¹². [Transport sur meubles](../../artifacts/furniture-crossing-v108.json) : 5 964 échantillons, deux reprises, buffers partagés, 300 images de portage en hauteur et 876 de montée. Le déplacement autonome a la même présentation ; les tests moteur confirment attribution et départ dans le tick de planification et réveil lors d'une désignation.

Réparations de contrôles, sans assouplir le moteur : le constructeur de fixture V13 gardait les observations/souvenirs de pièce V103, rejetés avant l'oracle de collision ; le helper les retire désormais et l'intégration utilise ce helper. Les assertions d'overlap et l'oracle indépendant de migration restent intacts. La fin d'interpolation utilise une tolérance de 10⁻¹² pour un résidu flottant de 3,2×10⁻¹⁵. Le test de changements de vitesse publiait toutes les 50 ms : cadence ajustée aux **20 ms réelles**, oracle de vitesse conservé ; les tests séparés de publications clairsemées restent actifs. [Échec intermédiaire conservé](../../artifacts/movement-checks-first-v108.json). Cette correction d'oracle ne prouve pas une absence de famine sous une cadence plus dégradée que celle testée.

## Charge à cent colons

[Banc](../../scripts/presentation-load-v108.mjs), [résultats complets](../../artifacts/presentation-load-v108.json). Sauvegarde mixte V98 immuable : 100 colons, deux visiteurs, deux morts et cent animaux. Vue entière de 375,55 cases, Chromium WebGPU visible, 1440×1000. Ordre **4 / 2 / 2 / 4 ticks**, exécutions successives ; chaque mesure dure six secondes après une seconde de stabilisation, pause puis ×6. Aucun autre test lourd en parallèle.

| Réserve | Image p95, ×6 | Pic image, ×6 | CPU de frame p95, ×6 | Débit autoritaire mesuré |
|---|---:|---:|---:|---:|
| 4, passage 1 | 20,8 ms | 83,4 ms | 18,3 ms | 2,82× |
| 2, passage 1 | 20,9 ms | 99,9 ms | 20,1 ms | 2,46× |
| 2, passage 2 | 20,7 ms | 75,1 ms | 19,8 ms | 2,55× |
| 4, passage 2 | 20,8 ms | 95,8 ms | 19,9 ms | 2,41× |

Pause : p95 4,3 ms dans les quatre cas. Pas de régression nette de cadence d'image sur cette comparaison ; les pics et variations CPU restent présents. Le code de simulation et la fréquence de publication n'ont pas changé. Ces fenêtres ne prouvent ni performance universelle identique ni gain général de CPU. Les deux réserves finissent fréquemment épuisées sous cette charge : médiane du retard de lecture à zéro, présentation limitée par la simulation. La cible ×6 et 240 FPS actifs à cent colons reste non atteinte ; elle est distincte du délai artificiel supprimé ici.

Typage et build réussis, avertissement Vite existant sur la taille des bundles conservé. Aucune campagne de plusieurs jours : aucune règle temporelle métier changée.

Relecture finale : commentaire du tampon borné au jitter testé, métrique native explicitement décrite comme progression bridée et non toujours arrêt total. Le producteur du test temporel ne publie plus à tick/vitesse inchangés ; ses [cinq contrôles rejoués](../../artifacts/movement-final-temporal-v108.json) passent, sans nouvelle modification de production. Les scénarios de charge saturés ne sont pas présentés comme une simulation ×6 soutenue.

## Publication

Production Netlify **`6ab796356ca4a20087eb0767`**, 36 fichiers, état ready. [Déploiement](../../artifacts/netlify-v108.json), [contrôle public](../../artifacts/netlify-smoke-v108.json). Le build ne contient aucun de ces pilotes ou sondes ; les mesures de latence et de charge sont locales, le contrôle public vérifie le parcours de création, les commandes d'interface et la sauvegarde/reprise.
