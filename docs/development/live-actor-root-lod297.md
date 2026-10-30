# Position vivante des acteurs avec animation détaillée retenue

30 octobre 2026 — correctif de présentation 297 qualifié localement. Enregistrement Git suivi dans le checkpoint de reprise.

Le niveau de détail mettait en cache la position XYZ avec les coefficients du corps. À moyenne distance, le corps pouvait rester immobile entre publications du cache ; à grande distance, cette position pouvait rester figée bien que les données de déplacement continuaient d’avancer. Le même défaut atteignait la sélection et plusieurs lecteurs de position. Quand le tick restait momentanément identique pendant que le lissage convergeait, le cache intermédiaire pouvait aussi conserver sa position au-delà de sa simple échéance de 12 Hz.

Ce défaut est distinct du [rythme des jambes corrigé par c1eda176](visible-gait297.md), de la vitesse nominale de 4,6 cases/s adoptée en V492 et de la dette de débit à ×6. Il fournit une cause de saccades reproductible ; il ne prouve pas que chaque ralentissement constaté dans la session humaine provenait de lui.

## Correction

Le cache conserve les coefficients détaillés, les horloges et l’orientation retenue. Les positions affichées suivent les streams et le temps de présentation courants. Le corps humain utilisait son propre chemin de cache et a été corrigé en plus du helper commun utilisé notamment par la sélection, la faune et les mécanoïdes.

Les lecteurs CPU de position suivent le même principe. Les flammes attachées et les nuages de bagarre conservent leur animation locale, avec une ancre mobile. L’origine d’un transfert de cargaison est toujours prélevée une seule fois à la dernière position affichée : elle ne poursuit pas ensuite le porteur.

Sept sources de rendu sont concernées. Aucun Core, chemin, coût de déplacement, vitesse, commande, format de sauvegarde ou ordonnanceur de simulation ne change. Cette animation artistique et son LOD sont une adaptation du rendu Elsewhere, sans revendication d’identité graphique avec RimWorld.

## Preuves acquises

Deux vrais contrats Engine 297 préparent 19 Core de déplacement ordinaire puis 60 images à Core tenu. Les deux refus ont été reproduits avant correction, puis les deux contrats passent après correction. Sur 166 observations, les racines capturées, publications, horloges, coefficients et nombres d’évaluations du rig sont identiques entre versions. Les positions publiques deviennent vivantes ; World entier, RNG, identifiants et propre recharge restent inchangés. Near/désactivation conservent leurs contrats antérieurs.

Un dessin WebGPU isolé utilise les vrais positionNode du corps et de sa sélection, sans remplacer leur géométrie ni leur formule de position. Seul le fragment est masqué pour mesurer les pixels. Le backend déclare AMD/rdna-1. À 16 px/case, la racine avance de 2,855 px pendant une publication retenue : l’ancien corps et sa sélection bougent de 0 px, le candidat de 3 px et 2,620 px. À 4 px/case, l’avance attendue est 4,136 px : ancien 0/0, candidat 4/3 px. La tolérance de 1,5 px a été fixée avant exécution. Douze captures par version, mêmes rig/horloges/publications et trois Whole conservés.

Ce dessin est un contrôle fonctionnel de composant, pas une mesure des FPS, du GPU complet, de la latence des commandes ou de la session humaine. Les pixels des flammes/faune/mécanoïdes/bagarres ne sont pas directement qualifiés par cette scène. Les échecs initiaux du harnais restent conservés : chemin CLI, admission ESM, accès au navigateur, puis repli WebGL/404. Ils ne deviennent pas des réussites rétroactives. Le lancement final fonctionnel emploie WebGPU, sans les flags ANGLE logiciels qui avaient accompagné le repli initial ; sa cause précise initiale n’est pas établie.

## Coût et contrôles intégrés

Une comparaison CPU W/C/W unique utilise cinq acteurs déclarés, deux feux attachés et une bagarre mobile. Sur 1 800 images, le temps du chemin mesuré vaut 42,128 / 69,036 / 38,753 ms ; CPU du fil 31/62/47 ms, du processus 63/172/110 ms. Le candidat ajoute donc environ 0,015–0,017 ms par image de ce composant. C’est une augmentation de 64–78 % de ce petit chemin : elle reste explicitement conservée, sans verdict d’absence de régression. Les compteurs CPU sont grossiers et ne permettent pas une attribution par fonction.

Les copies d’ancrages en middle et les lecteurs XYZ actifs font maintenant le travail nécessaire que l’ancienne version omettait. Rig, publications, comptes FX et JSON d’entrée restent exacts. Le bloc far est dans la variation des témoins. Aucun Core n’est joué dans ce contrôle de présentation ; son JSON préparé n’est pas une campagne/Whole admise. Les uploads du buffer interleavé des bagarres et les FPS globaux ne sont pas mesurés. Le correctif est retenu pour sa justesse avec ce faible coût absolu observé ; aucun coût nul, gain FPS ou réparation de la dette ×6 n’est revendiqué.

Deux contrats supplémentaires reproduisent puis corrigent les ancres compactes de feu et de bagarre en middle, avec palettes/horloges retenues. Le cas historique V331 à trois rigs reçoit un adaptateur renderer 296 déclaré et compare les positions vives tout en conservant les oracles du cache. Sa garde near Wildlife était déjà rouge sur les sources antérieures : ce lecteur renvoie sa position vive, à la différence du lecteur humain sans cache. Elle est remplacée par l’égalité au vrai sampler, sans modifier les autres cas ni les tests bas niveau du cache.

Les six fichiers ciblés passent ensemble : **49 cas, aucun refus ni cas ignoré**. Typage complet 16,472 s et compilation Pages du code 3,643 s réussis. Les assets publics sont résolus dans leur répertoire canonique et ne sont pas recopiés ; aucun paquet de publication ni déploiement. Les avertissements de gros chunks/import dynamique restent dans le log. La vérification documentaire précède le commit.

Les reçus privés sont conservés sous Cvisualizations/action-fluency-20261030 : `lod-cpu-qualification-root.json`299cc4ad, `lod-gpu-qualification-root.json`ab49a70a, `lod-cost-decision-root.json`4fa838d9 et `lod-product-install-root/receipt.json`ecb61a8a. Les sources installées sont exactement celles qualifiées ; préimages, échecs et rapports restent disponibles. Les campagnes humaine 94de/T3328 et QA d474, Source 12 privée 298, Cloudflare V491 et la dette PERF-V492-X6 sont inchangées.
