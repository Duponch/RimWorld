# Coût de l’interface 3D en partie — audit du 25 octobre 2026

## Conclusion

L’interface carton n’est pas gratuite. Le survol animé déclenche presque un nouveau rendu complet de l’UI à chaque image ; c’est le surcoût le plus net de cette série. Le HUD immobile reste proche de l’ancien en cadence. La grande résolution révèle aussi un recul observé. En simulation ×1/×3, aucune baisse générale de cadence n’apparaît dans les relevés, mais le CPU privé rapporté à la progression simulée augmente d’environ 5 % au milieu des témoins.

Ces résultats de fluidité restent **conditionnels** : l’utilisateur joue à League of Legends et regarde un film dans Brave. La charge externe n’est pas contrôlée, et le processus de League change entre le candidat et le second témoin. On ne peut donc pas attribuer exclusivement à l’UI tous les écarts de FPS ni conclure à une amélioration générale. Les compteurs d’invalidation, les passes GPU propres à l’UI et les demandes d’allocation sont des observations distinctes, détaillées ci-dessous.

Aucune source produit n’a été modifiée pendant l’audit. Le produit examiné est `a18d5382`, V477 locale. L’audit ne reprend ni le gameplay ni l’ancien chantier d’optimisation Core.

## Périmètre et protocole

La demande humaine est explicitement limitée à **l’UI d’une partie chargée**, pas aux menus d’avant-jeu. Les chargements et l’accueil sont hors fenêtres chronométrées. L’existence de ressources graphiques encore retenues après l’accueil reste pertinente pour la mémoire de la partie.

- Colonie : octets originaux `public/test-saves/v419/les-eclaircies.json`, carte 250×250, trois colons, tick initial 1730 ; chargement et migrations par le vrai GameSession, export complet initial identique à chaque bloc comparatif.
- SHA du fichier : `49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f`.
- Même code courant pour les deux variantes : ancien DOM de développement `?ui=legacy`, nouvelle UI native. Il ne s’agit pas d’une comparaison de deux paquets de production historiques.
- Chromium matériel visible, WebGPU, Ryzen 5 3600, Radeon RX 5700 XT ; Windows, DPR 1. Le système dispose d’environ 17,13 Go de RAM, dont 2,81 Go libres au début de la série ; aucune conclusion de pagination n’est déduite de cette seule lecture.
- Caméra et orbite déterministes, réglages identiques, ombres 60 Hz/2048, textures/diorama/pièce activés, son et musique coupés, autosave désactivé pour les mesures.
- Ordre ancien / nouveau / ancien. Par variante : HUD en pause 8 s ; Travail en pause 8 s par vrai clic ; HUD 2557×1440 en pause 6 s ; quarante mouvements de survol sur la barre pendant 8 s ; rotation ×1 20 s ; recharge entière exacte ; rotation ×3 20 s. Résolution ordinaire 1440×1000. Préparation en pause de 1,2 s par bloc.
- RAW : vrais débuts de callbacks, RAF, terminaison, ticks reçus/affichés, CDP TaskDuration/ThreadTime, CPU OS des processus du navigateur privé, mémoire JS/DOM hors fenêtres. Les CPU de League/Riot/Brave sont échantillonnés autour des fenêtres, sans fermer aucune application humaine.

Les FPS ci-dessous sont des **callbacks de rendu par seconde**, pas une preuve d’images physiquement affichées. Le CPU privé inclut les processus renderer/Worker et GPU de ce navigateur, et peut dépasser une seconde CPU par seconde murale sur plusieurs cœurs. Le CPU du processus GPU n’est pas une durée d’exécution GPU.

## Observations de fluidité et de CPU

| Cas en partie | Ancien W1 / nouveau C / ancien W2, callbacks/s | p99 mural W1 / C / W2, ms |
| --- | --- | --- |
| HUD immobile | 224,3 / 227,3 / 230,6 | 7,2 / 7,5 / 6,7 |
| Travail ouvert, pause | 208,0 / 228,8 / 224,3 | 8,7 / 7,8 / 7,7 |
| HUD 2557×1440, pause | 209,3 / 183,9 / 223,5 | 9,0 / 11,6 / 6,9 |
| Survol animé de la barre | 215,2 / 177,7 / 216,4 | 8,0 / 10,3 / 8,2 |
| Rotation, ×1 demandé | 105,8 / 129,5 / 109,4 | 45,7 / 39,0 / 43,6 |
| Rotation, ×3 demandé | 101,6 / 111,9 / 102,3 | 48,0 / 44,6 / 46,5 |

Pendant le survol, le CPU du thread principal par callback passe de **4,225–4,269 ms à 5,347 ms**, soit **+25,9 %** par rapport au milieu des deux témoins. Le CPU privé par callback augmente d’environ **13,4 %**. La cadence native est inférieure d’environ **17,7 %** au milieu des témoins. La concordance des témoins et les compteurs de cache renforcent le constat, sans supprimer le facteur League concurrent.

Au repos, le CPU privé par callback passe de 9,21–9,54 à 9,85 ms : léger surcoût observé, tandis que le thread principal est voisin ou plus faible. Dans Travail en pause, aucun surcoût global évident n’est observé. À grande résolution, la cadence native baisse de 12–18 % par rapport aux témoins ; le CPU privé par callback reste proche. Une limite graphique ou d’ordonnancement est plausible, mais ces compteurs ne la démontrent pas.

| Simulation | Débit réel W1 / C / W2 | CPU privé, ms par seconde simulée W1 / C / W2 |
| --- | --- | --- |
| ×1 demandé | 0,983 / 0,991 / 0,981× | 2541 / 2651 / 2510 |
| ×3 demandé | 2,543 / 2,631 / 2,533× | 1065 / 1111 / 1049 |

La meilleure cadence de rendu observée en simulation n’est donc pas une preuve de baisse du coût total. Le ×3 demandé n’est effectivement tenu par aucune variante. Les pointes et intervalles dépassant 16,7 ms restent présents ; le confort général ne se déduit pas de cet audit.

League reste présent dans les fenêtres, mais son processus passe de PID 30904 pour W1/C à PID 30480 pour W2. Sa consommation observée varie d’environ 1,55 à 2,05 secondes CPU par seconde murale. Ces compteurs ne permettent pas d’égaliser sa charge GPU ni d’inférer le contenu de la partie. Le second témoin utilise aussi un nouveau navigateur privé. Les plages W1/W2 sont descriptives, pas des intervalles de confiance statistique.

## Ce que fait effectivement le cache

| Compteur natif, échantillons encadrant la fenêtre | HUD immobile 8 s | Survol 8 s | Simulation ×1 20 s |
| --- | --- | --- | --- |
| Captures complètes UI | 9 | 1420 | 101 |
| Compositions du cache | 1828 | 1433 | 2598 |
| Durée synchrone cumulée dans `cache.draw` | 412 ms | 2592 ms | 786 ms |

Au repos, une capture survient environ une fois par seconde ; le reste compose l’image conservée. Pendant les animations de survol, presque chaque image recapture l’ensemble des cartons. L’UI ne redessine donc pas tous ses objets en permanence, mais elle le fait presque pendant ce scénario animé.

Ces durées sont des **intervalles synchrones JavaScript de soumission**, pas du CPU comptable ni du temps GPU ; elles ne doivent pas être ajoutées au temps total de frame, qui les contient déjà. Les compteurs sont lus juste autour des fenêtres, avec quelques opérations de protocole. Le dernier `captureCPUms` vaut parfois zéro sur une image stable : il ne mesure pas le cumul de toutes les captures.

Les quarante raycasts du survol totalisent 9,4 ms. Ce n’est pas la première cible de ce scénario. `NativeHud.update` totalise environ 399/451 ms sur les fenêtres ×1/×3 ; cette mesure ne couvre pas un dossier Bio actif.

## Mesure GPU séparée

Le diagnostic GPU utilise de vrais timestamp-query WebGPU, ajoutés uniquement à la réponse DEV de ColonyRenderer en mémoire. Aucun fichier produit n’est remplacé. Deux contextes successifs, une seconde de préparation, puis trois fenêtres de deux secondes : pause 1440, pause 2557, ×1 1440. Caméra fixe et mêmes octets de partie ; toutes les phases en pause précèdent la simulation. Les requêtes et readbacks instrumentent le rendu : leurs FPS ne servent pas de benchmark de fluidité.

| Phase native | Composition UI | Transformation de sortie UI | Capture UI, moyenne sur toutes les images | Somme UI, ms/image |
| --- | --- | --- | --- | --- |
| Pause 1440×1000 | 0,02670 | 0,05370 | 0,00014 | **0,08054** |
| Pause 2557×1440 | 0,04857 | 0,11591 | 0,00026 | **0,16474** |
| ×1, 1440×1000 | 0,03179 | 0,06438 | 0,00458 | **0,10076** |

Attribution par UID/pass/frame complète : aucune requête manquante. Les fenêtres natives comprennent respectivement 1/2/8 passes de capture ; les moyennes incluent les images sans capture. Ce diagnostic ne mesure **pas** le survol animé en GPU. Il exclut aussi l’upload des textures, les mipmaps hors passes suivies, les temps CPU, les trous de file GPU, le compositeur DOM et l’affichage physique. Il ne donne donc pas une comparaison de coût GPU total entre les deux interfaces. Les durées du monde varient entre les deux contextes sous League ; aucune amélioration GPU globale n’est revendiquée.

Les deux transformations de sortie, monde puis UI, sont identifiées séparément. La seconde représente une partie importante du petit coût GPU stable de l’UI : piste ultérieure pour une composition avant une conversion finale unique, sous réserve de conserver exactement HDR, alpha et couleurs.

## Mémoire graphique demandée

Les wrappers privés observent les succès de `GPUDevice.createTexture/createBuffer`, les destructions explicites et les descripteurs par device. Aucun événement perdu. Les inventaires reconstitués à chaque fin de phase correspondent exactement aux instantanés. Ces nombres comptent des **octets logiques demandés**, pas la résidence VRAM physique.

| Phase | Ancien, octets de formats connus | Nouveau, octets de formats connus | Surplus WebGPU connu |
| --- | --- | --- | --- |
| Pause 1440×1000 | 252,15 Mio | 382,34 Mio | **130,19 Mio** |
| Pause 2557×1440 | 346,24 Mio | 556,26 Mio | **210,03 Mio** |
| ×1, 1440×1000 | 252,15 Mio | 376,44 Mio | **124,29 Mio** |

Quatre allocations de profondeur `depth24plus` côté ancien et sept côté natif sont exclues de ces nombres, leur stockage physique étant opaque. En ajoutant **l’hypothèse distincte** de quatre octets par texel-échantillon de profondeur, les surplus nominaux deviennent 179,63 / 293,68 / 173,73 Mio. Ce calcul n’est pas une mesure VRAM. Les textures de présentation et surfaces du compositeur DOM ne sont pas accessibles à ce traceur ; les alignements, compressions, staging et allocations internes du pilote ne le sont pas non plus.

Deux causes sont établies :

1. Cache plein écran RGBA16F, couleur résolue + couleur MSAA4 + profondeur MSAA4. Couleur connue `(8 + 8s)A`, profondeur inconnue `sDA`. Le modèle D=4 donne 76,90 Mio pour ce cache seul en 1440×1000, 196,64 Mio en 2557×1440.
2. Le renderer autonome d’accueil/secours reste initialisé pendant la partie, avec un autre GPUDevice et des surfaces retenues. Il est caché et ne dessine pas continuellement : aucun rendu autonome n’est compté dans les fenêtres CPU. Ses deux textures RGBA16F restent réellement en **1440×1000**, soit 54,93 Mio de couleur, même après agrandissement de son canvas caché. Le changement de taille du canvas ne suffit donc pas à libérer/réallouer ces surfaces. Le monde entier n’est pas dupliqué.

L’inventaire suivi revient à zéro après destruction des deux parcours/devices observés. Cela confirme les destructions explicites, pas l’instant où Windows récupère de la VRAM. Les niveaux instantanés de heap/DOM, sans collecte forcée, ne prouvent ni une fuite ni un delta de RAM attribuable à la seule UI. La boucle interne RAF de Three reste également présente après init du renderer autonome ; absence de dessin n’est pas absence de toute comptabilité interne.

## Optimisations proposées, dans l’ordre

1. **Éviter la recapture globale au survol.** Séparer les éléments statiques des cartes en mouvement, ou conserver des régions/couches plus petites. Garder l’animation carton et sa fluidité. Le scénario observé fournit la première cible ; aucun pourcentage de gain futur n’est promis. Vérifier pixels, clipping, raycasts, HDR/alpha prémultiplié et récupération graphique. Plusieurs caches peuvent ajouter des compositions : mesurer ce compromis.
2. **Réduire les surfaces de secours retenues pendant le jeu.** Garder le secours prêt, mais libérer/réduire effectivement ses buffers plein écran lorsqu’il est caché, puis les rétablir avant affichage. Ne pas se contenter de redimensionner le canvas, car l’allocation est différée. C’est d’abord une optimisation mémoire ; les parcours d’incident/perte de device devront rester exacts.
3. **Conserver les étiquettes de ressources.** `native-hud.ts:495–513` détruit/recrée actuellement toutes les pièces lorsque leur signature change. Réutiliser les objets par identité et ne repeindre que les valeurs modifiées. Préserver catégories, pagination, fraîcheur des tooltips et callbacks.
4. **Distinguer l’encre visible des métadonnées des dossiers.** `NativeStage.ts:538` inclut les hints et toutes les lignes dans sa signature ; une information uniquement survolée peut repeindre tout le fond. Réaffecter les callbacks/hints sans repeindre, conserver le fond carton déterministe, puis envisager des zones d’encre indépendantes. Le diagnostic Bio n’a pas acquis de mesure : cette priorité repose sur la lecture du code, pas un coût Bio chiffré.
5. **Ensuite : composition finale unique, zones de hit sans texture et rejets de raycast.** Les plans de survol transparents allouent actuellement des canvases/textures et des ombres géométriques invisibles. Ils peuvent être des cibles CPU de raycast sans rendu. Les raycasts peuvent rejeter les grandes régions hors souris avant d’actualiser toute la scène. Leur coût mesuré ici reste secondaire.

Une baisse générale de résolution, la suppression des animations, HDR→8 bits ou la réduction de l’antialiasing ne sont pas recommandées comme première réponse : elles changent la qualité demandée et nécessiteraient une qualification visuelle distincte.

## Preuves, reprises et limites

- Première série avant/après lancement annoncé de League : arrêtée, RAW préservés et exclue ; `tmp/ui3d-cost-audit/current-ui-wcw-2026-10-25T19-44-17-901Z-28016/exclusion.json`.
- Série sous League : `league-present-wcw-2026-10-25T19-56-08-998Z-28408/`. Six blocs W1 et six C acquis. Le diagnostic facultatif Bio suivant échoue **avant acquisition**, parce que son contrôle compare la cible de caméra actuelle d’un colon déplacé à la cible initiale. Ce n’est pas un résultat de coût Bio ni une défaillance produit démontrée. Échec global du pilote conservé, jamais requalifié en PASS.
- Seul témoin manquant rejoué : `league-witness2-completion-2026-10-25T20-10-17-322Z-6184/`, 285,755 s. Le pilote admet le témoin seul, limite l’égalité caméra aux blocs comparatifs et protège l’agrégation finale. Aucun code chronométré changé : inversion de ces trois patchs reproduit octet pour octet le SHA mesuré original `e595adc8…`, preuve `driver-repair-proof.json` et copie originale conservées.
- Rapport comparatif joint : `tmp/ui3d-cost-audit/qualified-comparative-blocks/report.json`. Statut exact `comparative-blocks-acquired`, pas validation globale d’un parcours interrompu. Les sources produit, navigateur, paramètres, SHA World complet et réponse Main concordent ; chaque RAW conserve son emplacement et son empreinte. Synthèses `cost-summary.json/.md`.
- GPU/allocation : `tmp/ui3d-gpu-audit/league-present-gpu-2026-10-25T20-16-45-648Z-29104/`, 200,529 s ; analyse indépendante `memory-analysis.json`. Instrumentation de réponse en mémoire et observateurs seulement ; fichiers produit inchangés.
- Vérification finale : 2027 fichiers produit inchangés, dix-huit RAW comparatifs re-hashés, sommes GPU recalculées, inventaires observés détruits ; reçu `tmp/ui3d-cost-audit/final-evidence-verification.json`. Syntaxe des quatre pilotes et contrôle documentaire acquis (8,372 s).

Ces observations concernent une colonie et deux résolutions, des fenêtres courtes et un contexte concurrent connu. Elles ne valident pas toutes les fenêtres, les grandes populations, la création, une campagne longue, une fuite de mémoire, les performances dans Brave lui-même ni un objectif de confort universel. Aucun gain d’optimisation ni publication n’est acquis par cet audit.
