# Corrections visuelles et feuillage sonore — preuve V185

Lot de présentation commencé le **2 octobre 2026**, terminé le **3 octobre 2026**, depuis `721a8af` (V184). Le schéma reste **173**, sans migration ni nouvelle mécanique. Le [contrat](../development/visual-audio-v185.md) et la [recherche technique](../research/visual-audio-web-v185.md) décrivent les choix graphiques locaux ; la [roadmap](../ROADMAP.md) conserve les priorités fonctionnelles. Cette preuve ne clôt ni G0 ni une parité exhaustive avec RimWorld.

## Changements de jeu et invariants

- Les six espèces animales vivantes couchées tournent sur le flanc sans réduire leur volume ; contact au sol, normales et survol suivent la pose. La silhouette historique des cadavres reste distincte.
- Les nuages ont des variations locales de lobes, restent opaques jusqu’à 34° hors du masque, puis s’atténuent entre 34° et 65°. Le cercle central de rayon 18 % du petit côté est entièrement transparent ; son raccord atteint l’opacité extérieure à 26 %. Le rejet alpha empêche aussi ce trou d’écrire de la profondeur.
- Les deux masses existantes des fragments de pierre varient en proportions, rotation et assemblage, avec un hash stable de position et de matière.
- Les flammes partagent une forme irrégulière en papier peint ; la fumée au sol commence près de leur sommet et monte selon leur taille. Son culling inclut la montée, la dérive au vent et les coins des particules.
- Les traits de pluie suivent leur trajectoire réelle au vent ; la phase de chute augmente de 0,75 à 1 par tick confirmé, soit +33 %. Les quantités météo simulées ne changent pas.
- Le bruissement du feuillage suit la canopée près de l’oreille de la caméra et la puissance du vent. Un seul son continu existant reçoit un gain lissé. Le recensement se fait au snapshot son actif, jamais par balayage des arbres à chaque image ; son coupé, il est omis puis rétabli à la réactivation, même en pause.

Les sources de simulation, le schéma et les commandes ne changent pas. Le rendu ne consomme pas de PRNG de simulation et ne modifie pas le World. Géométries, matériaux et attributs d’acteurs restent résidents. Les feux attachés conservent les indices des corps : seul leur préfixe jusqu’au dernier acteur brûlant est soumis, ou zéro sans feu ; le préchauffage garantit temporairement un slot et restaure les counts exacts. Les emplacements non brûlants internes au préfixe restent cachés par le shader. Aucun nouvel asset sonore, éclairage ou ombre par feu n’est ajouté. L’édition d’herbe de l’utilisateur, déjà incluse dans V184, reste inchangée.

## Réparations rencontrées pendant la validation

Les premiers essais Chromium héritaient des arguments SwiftShader de la configuration commune ; ils ne constituent pas une preuve GPU matérielle. Les parcours concernés utilisent maintenant explicitement `args: []` dans leur lancement Chromium natif.

L’ancien contrôle de nuages pouvait réussir sur un centre déjà vide. Son remplacement force un nuage préparé devant la caméra, conserve le culling, compare masque actif / nuage caché / masque désactivé, puis vérifie un témoin dessiné derrière le nuage après son passage. Cette fixture de shader n’est pas un placement naturel de nuages. Une première préparation animale créait les espèces après suppression de leur habitat : elle a été réparée avant suppression des ressources, sans changement de simulation.

Le contrôle matériel a ensuite révélé un vrai refus de compilation Tint : le WGSL généré utilisait des swizzles uniformes imbriqués `.zw.x` et `.zw.y`. Matérialiser `viewportSize.toConst()` dans `Fn` supprime ce chaînage tout en conservant le masque. TypeScript et un oracle CPU ne pouvaient pas révéler ce défaut de pipeline natif.

Le contrôle de rétention attendait encore un dessin de feu attaché pour chaque colon non brûlant. Son attente de count est devenue zéro ; ses assertions de capacité, attributs partagés, matériaux et sélection restent conservées. Il s’agit d’une réparation d’oracle, distincte des corrections produit.

Une dernière revue GPT‑6.1 Sol a trouvé les triangles de flamme orientés vers l’intérieur, alors que le matériau rejette les faces arrière : l’ordre des indices est inversé sans ajout de triangles. L’oracle contrôle l’extérieur des deux bandes basses, le cap vers le haut et les directions opposées des arêtes partagées. Les plis des langues supérieures ne se confondent pas avec une obligation de normale radiale positive. La revue a aussi repéré la perte de bits d’une graine supérieure à 2²⁴ dans l’uniforme float des nuages ; `uniform(0, 'uint')` conserve ses 32 bits. L’oracle est étendu à `0x12345679` et `0xffffffff`, et le parcours matériel exerce la première grande graine. Ces deux réparations sont postérieures à la régression ci-dessous ; leurs contrôles concernés sont rejoués sur les sources finales.

## Contrôles courts et construction

- Régression hors campagnes longues : **371/371 fichiers, 1 620 tests réussis et un ignoré**, 381,35 s (`tmp/test-runs/v185-regression.log`). Cette passe précède les deux dernières retouches de faces/graine ; elle ne représente pas une nouvelle régression entière après celles-ci.
- Contrôles finaux des dix fichiers touchés et voisins : **43/43**, 8,62 s (`tmp/test-runs/v185-targeted-final-r3.log`), après orientation des faces et graine entière. Animaux, humains, marche, nuages, pluie, fumée, canopée, fragments, indices de feu attaché et rétention couverts.
- Build TypeScript/Vite final passé, **633 modules** (`tmp/test-runs/v185-build.log`). L’avertissement de chunk >500 ko est préexistant.

## Parcours graphiques et audio natifs

Passe finale sur les sources corrigées : **4/4 parcours Chromium matériels**, un worker et lancements successifs (`tmp/test-runs/v185-native-final.log`, captures sous `tmp/v185/native-final/`). Configuration locale `tmp/v185/playwright-native.config.ts` : Chromium sans arguments SwiftShader ; rendu WebGPU confirmé dans les parcours graphiques.

1. Réglages sonores hérités V149 : MP3 réellement décodés, essai sonore lancé, coupure/réactivation et préférences conservées, 17,0 s. Ce contrôle d’API et d’interface ne vaut pas une écoute humaine du bruissement ni une mesure de sortie casque.
2. Animaux et feux V185 préparés : six espèces, debout → endormies → à terre → debout, géométries/matériaux identiques ; dix bouffées pour deux feux de tailles 0,1/1,75 et origine maximale >2,8. Changement réel de projection, première ignition attachée après préchauffage sans feu, indices d’espèces `[1,0,0,0,0,1]` puis extinction à zéro ; 17,5 s. Captures inspectées pour le volume couché, la silhouette peinte et la fumée haute. Les états de cette fixture de rendu sont préparés, pas une nouvelle chronologie de simulation animale.
3. Masque de nuages V185 : **90 749 pixels** centraux auraient été couverts sans masque dans chaque projection ; différence maximale centre masqué/scène cachée **zéro**, même avec le témoin de profondeur derrière. Hors cercle, **939 777 pixels** changent en iso et **1 060 014** en perspective. Un draw et **295 triangles** effectifs supplémentaires ; grande graine `0x12345679`, 15,6 s. La forme forcée au centre sert à vérifier le shader, pas la fréquence de couverture naturelle.
4. Météo V166 préparée : pluie, neige forte et orage passent par le chargement réel, restent visibles en pause et en coordonnées monde ; 20,7 s. En iso, 107 pixels de neige changent devant le ciel hors de la silhouette du sol. Soumission du volume 250² au-dessus d’une scène préparée 32² : **+1 draw, +25 626 triangles**, 12 813 particules. Cela mesure le budget soumis, pas un temps GPU de campagne météo naturelle.

Aucune erreur navigateur/GPU dans cette passe, durée totale affichée **1,3 min**. Les captures de flammes et du trou avec témoin ont été inspectées. Les variantes initiales échouées et le contrôle final restent séparés ; aucune réussite matérielle n’est déduite des premiers essais logiciels.

`npm run test:presentation` final passe sur 250² après les deux réparations de revue : minage **10 741 images**, coupe **10 688**, p95 RAF **4,3 ms** dans chaque chemin, zéro saut, excès de déplacement continu ou occupation solide (`tmp/test-runs/v185-presentation.log`). Les phases, changements de vitesse et attributs résidents existants continuent de fonctionner ; cette fenêtre de chronologie visible ne constitue pas une performance générale ni une campagne naturelle.

Le parcours animaux/feu est ensuite enrichi pour vérifier la soumission réelle des deux premiers feux attachés, au-delà du seul count encodé : **+2 draws et +168 triangles**. Son replay natif **1/1**, 21,1 s, passe sans erreur (`tmp/test-runs/v185-native-fire-draw.log`). Ce replay ne remplace pas les trois autres contrôles, dont les sources restent inchangées.

## CPU du feuillage sonore

`scripts/foliage-audio-bench-v185.ts` lit la fixture historique immuable `public/test-saves/v98/mixed-100.json`, la migre au schéma courant puis mesure le seul recensement et la requête locale. Carte **250 × 250**, **10 077 ressources dont 7 095 arbres**, AMD Ryzen 5 3600, Node 24.11.1 ; chauffe de 80 adoptions, vingt lots de trente adoptions et vingt lots de 10 000 requêtes. Rapport : `tmp/v185/foliage-audio-cpu.json`.

| Sous-coût isolé | Médiane | p95 |
| --- | ---: | ---: |
| Adoption de la canopée | 0,832 ms | 1,020 ms |
| Requête de gain caméra | 0,000317 ms | 0,000776 ms |

Sauvegarde et PRNG sont exactement conservés. La grille CPU vaut 33 × 33 floats, soit **4 356 octets** sur 250². Ces mesures ne couvrent pas l’adoption complète d’un snapshot, le worker, le tick, le mix natif ni une écoute humaine. La garde son désactivé omet l’adoption ; les mesures ci-dessus portent sur le helper actif.

## Protocole graphique et première passe CPU

`scripts/prepare-visual-world-v185.ts` prépare et valide strictement la même fixture historique au schéma 173 : orage pluvieux stabilisé et 64 foyers maximaux ajoutés autour du premier colon, en conservant les feux déjà présents. Résultat : **250², tick 2 000, 104 personnes, 100 animaux, 10 077 ressources, 266 tas, 70 feux**. Il s’agit d’une scène préparée en pause, sans nouvelle campagne naturelle. SHA-256 du World sérialisé : `3dd98c448d427ff02117c6e5204e98a7492d782a3dfcafd1b4cca3ae1df672db`.

`scripts/visual-performance-v185.mjs` réutilise le protocole V140 avec poses fixes `iso-near` et `perspective-low`, trois secondes de chauffe et quatre secondes de mesure par phase. Chromium **153**, WebGPU matériel **AMD / RDNA‑1**, Ryzen 5 3600, **1 920 × 1 080**, DPR 1 ; textures, herbe, vent, nuages, précipitations et ombres activés. Le tick reste figé ; les ombres peuvent être réutilisées en pause. Les fichiers JSON conservent poses, paramètres et échantillons. Les modules anciens proviennent de `721a8af` ; `main`, audio et simulation restent courants dans les deux variantes. Ce n’est donc pas un A/B de tout V185.

Une passe CPU native **sans timestamps GPU**, antérieure à l’optimisation des counts attachés, compare six modules de rendu successivement en A/B/B/A. Rapports `tmp/performance-audit-v140-cpu-{a1,b1,b2,a2}.json` :

| p95 CPU image (ms) | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| Iso proche | 2,3 | 2,4 | 2,9 | 3,1 |
| Perspective basse | 3,0 | 2,6 | 2,9 | 3,9 |

La dérive entre les deux références interdit d’en déduire un gain ou une régression CPU stable. Le p95 RAF reste 4,3 ms dans ces fenêtres ; le rythme d’affichage n’est pas une garantie de cadence générale. Les captures CPU, les captures GPU instrumentées et les tests lourds sont exécutés successivement, sources servies gelées dans chaque campagne.

## GPU final après corrections et optimisation

La dernière passe A/B/B/A compare **huit modules de rendu**, dont les budgets de feu humain et leur préchauffage dans le renderer, sur les sources finales avec winding et graine `uint` corrigés. Les rapports `tmp/performance-audit-v140-release-gpu-{a1,b1,b2,a2}.json` confirment tous le même hash chargé, le backend matériel, les timestamps disponibles et aucune erreur. Chaque phase comporte **437 à 473 échantillons GPU**.

| p95 GPU (ms) | A1 — V184 | B1 — V185 | B2 — V185 | A2 — V184 |
| --- | ---: | ---: | ---: | ---: |
| Iso proche | 3,080 | 3,342 | 3,342 | 3,080 |
| Perspective basse | 3,277 | 3,277 | 3,277 | 3,867 |

Dans cette scène préparée, l’iso coûte environ **0,262 ms de plus au p95** ; le coût n’est pas nul. En perspective, les deux variantes nouvelles égalent la première référence et la seconde référence dérive : aucun gain stable n’est établi. Le p95 RAF est **4,3 ms** dans les huit fenêtres, sans garantie de cadence générale. Le CPU de cette passe est instrumenté par les timestamps GPU : il ne remplace pas la campagne CPU indépendante précédente.

Avant les deux dernières réparations, une passe de six modules donnait au p95 iso 3,080 / 3,342 / 3,342 / 3,080 ms et perspective 3,211 / 3,342 / 3,277 / 3,211 ms (`tmp/performance-audit-v140-gpu-{a1,b1,b2,a2}.json`). Une première passe de huit modules donnait iso 3,080 / 3,342 / 3,342 / 3,211 et perspective 3,277 aux quatre passages (`tmp/performance-audit-v140-final-gpu-{a1,b1,b2,a2}.json`). Ces relevés intermédiaires restent datés ; le tableau ci-dessus est le contrôle des sources finales.

L’optimisation des feux attachés retire les queues non brûlantes sans compacter les acteurs ni créer de buffers ; elle économise leurs primitives soumises, mais aucun gain général mesuré ne lui est attribué. Le modèle de feu passe de **10 à 84 triangles** ; les nuages restent **295 triangles par slot**, avec 14 160 octets de pivots statiques et un miroir GPU de matrices **4 KiB**. Pluie et fumée conservent leurs capacités. Ces budgets et les timestamps courts ne mesurent pas un tick complet, un worker actif, une campagne naturelle, une mémoire GPU native exhaustive ou une vitesse ×6.

Le préparateur versionné reproduit exactement la fixture de mesure après validation stricte (`tmp/test-runs/v185-prepare-performance-world.log`). Recherche technique, implémentation, réparations produit, réparation d’oracle et campagnes de vérification restent distinguées. Les campagnes naturelles longues et la suite navigateur exhaustive ne sont pas rejouées : aucune mécanique de simulation n’est modifiée. L’écoute humaine du nouveau bruissement et le coût général de toutes les caméras restent ouverts.

Contrôle documentaire final passé : **638 documents, 6 073 liens locaux**, six en-têtes au schéma 173, 25 domaines/cinq familles et trois originaux aux octets identiques (`tmp/test-runs/v185-docs-final.log`). Les temps mesurés sont ceux des contrôles indiqués, dont environ 6,4 min pour la régression et 1,3 min pour les quatre parcours natifs ; recherche et implémentation ne sont pas chronométrées. Les reprises de préparation, de pipeline et de géométrie sont conservées dans cette preuve, sans annoncer une économie générale de temps ou de tokens.
