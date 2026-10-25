# Optimisation de l’interface native V478

## Portée

Demande humaine : réduire le coût de l’interface **pendant la partie**, en conservant le rendu carton, sa résolution et ses interactions. League fermé, vidéo Brave conservée. Ce lot reste local ; aucune publication Cloudflare, reprise Core ou modification de simulation.

Le témoin est l’interface native V477, produit `a18d5382`, enregistré dans `ba9290f3`. Sa copie exacte est conservée sous `tmp/ui3d-optimization-v478/baseline/`, avec manifeste antérieur aux modifications. Les deux versions utilisent Three 0.186.0 et la même sauvegarde Éclaircies SHA `49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f`.

## Changements

- L’image HDR complète de l’UI est conservée. Une animation locale recalcule une petite région, avec tous les objets qui la recouvrent, puis copie ses pixels dans l’image conservée. Une seule composition UI demeure ; aucun assemblage de dizaines de couches plein écran.
- Les régions conservent le format HDR et l’antialiasing MSAA4 du moteur. Les changements globaux, régions trop grandes, matériaux ou géométries inhabituels reviennent au rendu complet. Le suivi couvre anciennes/nouvelles limites, retraits, transparence, matériaux partagés, textures, clipping, lumière et caméra.
- Une révision propre aux ressources évite de revérifier leurs propriétés pendant un simple mouvement. Seuls les objets possédés par l’UI utilisent cette garantie ; création, réécriture et retrait avancent la révision. La scène arbitraire et le globe visible gardent les contrôles complets. Transformations, visibilité, clipping, lumière et caméra restent vérifiés à chaque changement.
- Le moteur de secours caché conserve son device, ses pipelines et ses éléments de scène, mais réduit réellement ses surfaces de sortie à 1×1. Les surfaces retrouvent leurs dimensions et leur DPR avant affichage. Le RAF d’affichage propre en attente est annulé lors du masquage.
- Les ressources et notifications inchangées conservent leurs objets, géométries, matériaux et textures. Seule l’encre modifiée est repeinte ; actions et tooltips utilisent toujours les données courantes.
- Les métadonnées des tooltips sont séparées de l’encre des dossiers. Leurs changements ne repeignent plus le panneau ; les zones de survol, colonnes et listes déroulantes sont réaffectées aux données actuelles. L’apparition/disparition d’une zone de survol reste structurelle.
- Le fond peint d’un dossier est produit une fois et recopié à sa résolution d’origine. Le flux aléatoire du dessin reprend exactement après le fond, à chaque réécriture de l’encre. Les seules zones de survol n’ont plus de surface peinte ni de texture échantillonnée par le GPU.

Le cache du fond ajoute un canvas CPU pendant l’ouverture du dossier : Bio 1028×978×4 = 4 021 536 octets, soit 3,84 Mio. Il ne crée pas de texture GPU supplémentaire. Le rendu par région ajoute une petite cible HDR/MSAA/depth dont la taille varie avec la région ; ces coûts sont inclus dans les mesures.

## Mémoire graphique observée

Diagnostic séparé, instrumentant les demandes explicites réussies et les destructions ; fixture NativeStage avec véritable moteur WebGPU, avant puis après masquage. Les allocations propres au moteur hôte sont identiques au repos.

| Résolution | Couleur du secours libérée | Petite cible de survol ajoutée | Réduction nette connue dans la fixture après survol |
|---|---:|---:|---:|
| 1440×1000 | 54,93 Mio | 0,508 Mio | 56,44 Mio |
| 2557×1440 | 140,46 Mio | 0,469 Mio | 142,01 Mio |

Les quatre textures de sortie initiales du secours sont explicitement détruites puis remplacées par quatre textures 1×1 : deux couleurs RGBA16F, deux profondeurs. Les trois buffers initiaux restent vivants, aucun device n’est détruit. La réduction nette comprend aussi 2 116 112 octets d’allocations ultérieures évitées dans cette fixture ; ce supplément n’est pas assimilé à une libération générale d’assets du jeu.

La taille physique de `depth24plus`, les surfaces implicites du navigateur, les alignements du pilote, la résidence et la VRAM physique ne sont pas mesurés. Aucun résultat FPS/CPU ne provient de ce diagnostic instrumenté.

Première preuve : `tmp/ui3d-optimization-v478/memory-2026-10-25T21-11-37.997Z/report.json`, SHA `0cbd4cedaeda14d69cfc19502cf33fb1e3dbcc0044c206df24197c17d230e661` ; analyse `memory-latest-pass-analysis.{json,md}`. Reprise sur les sources finales : `memory-2026-10-25T21-41-29.605Z/report.json`, PASS en 7,572 s, mêmes destructions et tailles, SHA `133c7bf4deb90e57402b62ae20d4ee98c10c82592293a92cd211747fa926f28b`.

## Qualification et comparaison

Les acquisitions anciennes sous League ne servent pas de témoins à ce lot. Le streaming Brave laisse une charge externe variable ; une paire encadrée par deux témoins limite cette ambiguïté sans garantir une charge GPU identique. Aucun nouvel essai de l’ancienne UI HTML n’est compris : la comparaison porte sur V477 native avant optimisation et V478.

Une première série complète W1/C1/W2 est acquise en 506,930 s. Elle confirme mémoire et réduction des captures, mais pas de gain CPU au survol : 4,069/4,145/4,326 ms/image. Le coût du suivi des ressources compense alors celui des captures évitées. Cette observation motive la révision propre aux ressources, ensuite qualifiée par neuf cas et une nouvelle acquisition.

La comparaison finale joint W2, C2 final et W3 :

| Bloc | CPU principal ms/image W2 / C2 / W3 | p99 des intervalles ms W2 / C2 / W3 | Intervalle maximal ms W2 / C2 / W3 |
|---|---|---|---|
| HUD immobile, 1440×1000 | 3,134 / 3,120 / 3,355 | 5,1 / 5,4 / 5,4 | 36,2 / 38,3 / 41,6 |
| Survol, 40 déplacements en 8 s | 4,326 / 3,858 / 3,948 | 7,4 / 5,9 / 6,0 | 31,8 / 30,6 / 33,3 |
| HUD immobile, 2557×1440 | 3,187 / 3,336 / 3,738 | 5,1 / 5,8 / 6,2 | 26,0 / 29,0 / 32,9 |
| Simulation ×1 et rotation, 20 s | 5,746 / 6,049 / 5,029 | 29,4 / 32,7 / 24,9 | 57,4 / **105,0** / 56,7 |

Au survol, C2 utilise numériquement **2,3 à 10,8 % moins de CPU principal par image** que les témoins. Les pixels capturés passent de 1,438 million à 71 533 par image : **environ −95 %**. La soumission des captures passe de 1,051–1,176 à 0,588 ms/image ; ce dernier compteur est du temps synchrone de soumission, pas du CPU effectif ni du temps GPU.

La simulation livre dans chaque fenêtre ×1 **119 ticks confirmés et 116 présentés**, soit environ 0,991×. Son CPU principal par seconde simulée est 0,9735 / 0,9747 / 0,9635 s ; celui de tous les processus du navigateur privé est 2,6626 / 2,6376 / 2,6180 s. Ces valeurs n’établissent pas de gain global de simulation. Le candidat conserve **une pointe 105 ms**, contre des maxima témoins autour de 57 ms, avec 183/28/2/1 intervalles au-dessus de 16,7/33,4/50/100 ms. Le tas JS passe de 575 à 305 Mo pendant cette fenêtre ; cela ne constitue pas une attribution causale de la pointe. **La régularité globale n’est pas acquise et aucun gain FPS général n’est annoncé.**

Le gain admis concerne les allocations du secours, le nombre de pixels recalculés et le coût observé des survols. Il ne suffit pas à déclarer un surcoût nul devant l’ancienne UI HTML, toutes les populations ou toutes les fenêtres.

Le contrôle final des pixels utilise le vrai GPU aux DPR 1, 1,25 et 1,8. Douze comparaisons de fonds peints après zéro à trois réécritures ont **zéro différence RGBA** ; chaque canvas n’est lu qu’une fois. Les 39 comparaisons de régions utilisent le rendu complet du **même état de scène** : survol, pression, ombre, suppression, panneau, clipping, texte transparent, redimensionnement. Elles ne sont pas toutes identiques bit à bit, avec un écart HDR maximal de **0,00341796875**, et aucun écart supérieur à 0,01. Aucun changement de qualité ne masque ces arrondis.

- **94 cas ciblés**, dix fichiers, acquis en 28,525 s : régions et états renderer, géométries/caméras, ressources possédées, retraits, maintien HUD, hints/dropdowns et interactions Travail. Pas suite complète ni campagne gameplay.
- Typage final acquis en **19,226 s** ; les défauts de typage de préparation sont conservés dans les sorties, puis réparés.
- Pixels finaux : **9,637 s**, `tmp/ui3d-optimization-v478/pixels-2026-10-25T21-41-39.992Z/`.
- Interactions natives finales : **8,432 s**, `tmp/ui3d-density-v477/fixture-2026-10-25T21-41-52.672Z/` : géométrie, tooltip, dropdown clavier/souris, liste/clipping/scrollbar, planning glissé, édition et escamotage.
- Récupération réelle : **127,609 s**, `tmp/ui3d-v476/native-recovery-2026-10-25T21-38-17-012Z-23644/` : panne signalée puis véritable perte du device GPU, reprise par boutons natifs, sauvegarde entière exactement conservée aux deux reprises.
- Build final acquis en **6,094 s** ; compilation produit, sans publication.

## Provenance des mesures et reprises

La première série est conservée dans `tmp/ui3d-optimization-audit/league-closed-wcw-retry-2026-10-25T21-13-49-576Z-27688/`. C2 et les trois premiers blocs W3 sont acquis dans `owned-resources-cw-2026-10-25T21-28-27-956Z-30124/`.

Ce dernier pilote reste **failed** : une lecture de `StartTime` sur un processus externe terminé échoue **avant le démarrage du bloc W3 ×1**. Il n’existe ni fenêtre ni RAW acquis pour cet essai. La lecture nullable est réparée ; **seul ce bloc manquant** est repris, en 110,767 s, dans `witness-x1-completion-2026-10-25T21-36-12-371Z-21764/`. Les sept blocs déjà acquis ne sont pas rejoués et l’échec original n’est pas requalifié.

`scripts/ui3d-optimization-summary.mjs` produit `tmp/ui3d-optimization-v478/final-comparison.{json,md}`, statut **evidence-joined** : douze RAW et manifestes re-hashés, sources finales courantes exactes, douze réponses de sources critiques vérifiées, sauvegardes entières, caméras, surfaces/DPR et réglages identiques par bloc. Les pilotes originaux sont conservés ; le code à partir du hook de mesure est identique octet pour octet. Seuls ordre, filtre du bloc manquant et métadonnée du processus nullable changent. Aucun PID CPU privé manquant, renouvelé ou remis à zéro dans les fenêtres acquises.

Les premiers essais et leurs erreurs sont conservés : garde conservatrice initialement trop large pour Euler ; oracle de pixels perturbant potentiellement le backend Canvas par lectures répétées ; capture initiale de projection WebGPU comptée à tort parmi les régions locales ; première fixture mémoire fournie hors transformation Vite ; première tentative comparative interrompue sur connexion locale avant acquisition. Ils ne sont pas des résultats de performance acceptés.
