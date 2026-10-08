# V262 — admission caméra compilée et référence d'ombre

**Admission privée positive et lifecycle natif qualifiés, produit V242 et schéma 198 conservés. Aucun FPS ajouté ni adoption.** [Contrat](../development/core-compiled-camera-v262.md), [recherche](../research/core-compiled-camera-v262.md).

## Caméra et premier contrôle natif

Le fragment caméra `7B5CA55E` ajoute trois éditions réversibles au diagnostic V261 `E5A30659`. La copie typée distincte `2F09C2FD` ajoute seulement `trusted!` dans le DTO de refus : JavaScript émis identique (`1C591820`, TypeScript 5.8.3 épinglé), sans modifier l'admission. Les sept résultats once sont lus dans leurs caches compilés canoniques, sans appel Fn/setup.

L'intégration ROOT conserve la façade, les wrappers et le registre V261, Core `FCA7F2C4` et MAIN `DDE28E37`. Seuls les trois IDs canoniques MAIN/Colony/Core sont servis par le mapper privé ; Source, Decoder, moteur, Three et Layers restent RAW. Colony servi `B67B318C`, manifeste `220E96DC`, GEL `1CB07E5F`.

| Contrôle ROOT via validate:logged | Résultat |
| --- | --- |
| Préparation intégration / contrôle natif | PASS 20,827 / 0,079 s |
| Gel / syntaxe / typage | PASS 0,785 / 1,940 / 6,775 s |
| Acquisition native 5288 | **FAIL 32,799 s** |

Rapport privé `tmp/performance-orientation-v262/core-controls-next/captures/run-native-2026-10-08T17-45-09.622Z-XOk7W2/report.json`, SHA `9EFFF99FDD833F4AA597224667BD42D3269055E37DDCA9E99CD905B0E8E883B4`. Le refus caméra précédent n'est plus le premier : ReferenceNode `map`, OBJECT, builder NodeMaterial/ShadowMaterial, objet `tree-canopy`, matériau source distinct de l'override. Cela situe la frontière suivante ; ce n'est pas une qualification de tous les nœuds caméra ou du graphe complet.

Au premier DTO : tick 6934 en pause, 88 builders audités, 41 membres répartis 16/2/5/4/14/0, zéro FULL/ACK/SHARED résident. Cleanup : aucun propriétaire vivant, membre ou pending, aucune erreur de nettoyage ; navigateur et serveur 5288 fermés, empreintes sources/publics exactes. La timeline complète situe l'unique annulation musicale attendue dans owned-cleanup ; arrays bruts conservés. Le rouge reste rouge et aucun parcours sauvegarde/recovery, pixel, coût ou GAME n'est revendiqué après son arrêt à l'acquisition.

## Reprise de la référence passive

Fragment distinct `ED8BB0FB`, inverse entier de cinq éditions vers `2F09C2FD`. La source primaire `Renderer._getShadowNodes` crée la référence map à partir du matériau réel. La nouvelle voie contrôle uniquement la sûreté passive de cet accès dans l'audit global, y compris sa texture et son callback réels. `configuredMapReference`, `qualify`, résidence, refresh et transactions sont littéraux. Contre-revue indépendante favorable ; cela ne constitue pas une exécution.

Le premier générateur de reprise reste **FAIL 1,931 s**, avant préparation de Colony et avant runtime : l'inverse textuel global du port 5289 rencontrait aussi ces chiffres dans le hash d'un parent. Ses sorties partielles sont conservées. Le générateur distinct `0337C06C` emploie les positions exactes et un nouveau dossier physique, sans changement du kernel ; inverse entier des contrôles vérifié.

| Contrôle ROOT de reprise | Résultat |
| --- | --- |
| Préparation intégration / contrôle natif | PASS 5,650 / 0,078 s |
| Gel / syntaxe / typage | PASS 0,781 / 3,079 / 6,572 s |
| Acquisition native 5289 et lifecycle | **PASS 46,119 s** |

Reprise Colony `D75A192A`, manifeste `31CBB8C8`, GEL `21C04B27` : les trois IDs canoniques sont réellement chargés, Source/Decoder/moteur restent RAW. Rapport privé `tmp/performance-orientation-v262/core-shadow-reprise-controls-next/captures/run-native-2026-10-08T17-53-28.457Z-uILfVH/report.json`, SHA `E36FE1ACA1885CBA6DD6FBF801A172FC6132D5514B58ECB0F412A20F008AABEB`.

L'acquisition à 6934 observe 15 FULL/ACK et 1 605 SHARED, sans refus ni overflow. Le jeu ordinaire atteint 6939 à 1× puis 6988 à 6× ; ces ticks sont des doses observées, pas un débit certifié. La sauvegarde/relecture 6988 reste exacte. Une vraie destruction du périphérique à 7031 provoque le remplacement du propriétaire, génération 1→2, et une nouvelle acquisition positive. La continuation atteint 7084 ; avant cleanup, 325 FULL/ACK et 6 292 SHARED dans ce nouveau propriétaire, toujours sans refus. Ces compteurs ne sont ni des durées ni des dessins GPU.

Le nettoyage ferme les deux propriétaires créés, sans propriétaire vivant, membre ou pending, sans erreur et sans Worker restant. Navigateur et origine 5289 fermés ; sources, 62 payloads et 65 fichiers publics exacts. Les erreurs brutes sont vides ; l'unique annulation musicale est conservée et classée attendue par URL entière, événement unique et phase owned-cleanup prouvée, sans perte de timeline. La révocation `private-core-dispose` du DTO final est le nettoyage attendu.

## Composants passifs réels

Une extraction littérale de trois spans du fragment final, sans évaluer le kernel entier, isole les dispatchs et le helper. Le contrôle CPU emploie de vraies classes Three : deux cas positifs et dix-huit négatifs couvrent identité source, getter map/onUpdate sans invocation, callback inconnu, permissions étrangères, matériau tableau/étranger, dispatchs/prototypes, base indirecte et stockage writable. Les overrides de prototypes sont restaurés en finally et les cas sont séquentiels.

Gel distinct, extraction PASS 1,489 s, typage PASS 1,710 s, un fichier/20 cas PASS 3,319 s. Les empreintes parent/public restent exactes. Ces composants vérifient le verdict passif ; ils ne simulent pas le draw ou l'ordre d'un callback dans le vrai renderer.

## Décision et suite

V262 établit une admission Core positive, sa continuation, la sauvegarde/relecture et une vraie recovery GPU. Il ne mesure aucun gain et ne promeut aucun code produit. L'égalité des champs/dessins/pixels Core A/B, les frontières writers/callbacks/throw/compilation intercalée et le coût complet/froid restent à qualifier dans V263 avant tout GAME de performance ou adoption. Les résultats de la fixture V260 ne remplacent pas ces preuves. Aucun deuxième diagnostic V262 inchangé n'est nécessaire. ROOT seul lance les contrôles lourds, séquentiels, sur sources gelées ; aucun push, relance automatique toujours en pause.

Contrôle documentaire final via `validate:logged` : PASS 14,445 s. Aucun changement de code produit, test produit, package ou fichier public dans ce lot.
