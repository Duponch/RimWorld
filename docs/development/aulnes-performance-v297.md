# V297 — recensement audio des Aulnes

V297 est un diagnostic : **aucun FPS supplémentaire livré**. Le candidat audio réduit son coût local, mais le GAME ne gagne que **0,25 %**, dans la dispersion de la base, avec un p95 légèrement défavorable. Il est écarté, comme le candidat d'agenda. Le produit reste exactement `b6ac00bf` ([V296](aulnes-performance-v296.md)) ; sources, tests, schéma 218 et 63 sauvegardes/66 fichiers publics sont conservés. Aucun gain GPU ni 240 FPS annoncé.

## Cause et périmètre

Profil MAIN neuf du produit V296 : `tmp/performance-v297/profile-current/main-shidxh`, analyse `analysis/report-bJpSTH/report.json`, SHA **95E04A2C**. 9 311 échantillons, 1 356 nœuds et 192 sources compilées vérifiées, sans delta négatif. Recharge9040 exacte, erreurs vides et nettoyage acquis. La partition exclusive attribue 18,01 % à l'adoption, 22,06 % à l'application de scène, 24,58 % à la préparation/soumission Three, 5,70 % à UI/audio, 12,67 % aux autres chemins du jeu, 0,15 % à l'autre JavaScript et 16,83 % au résidu natif/GC/idle. Ce sont des poids échantillonnés sur15,127s, bords conservés, pas des temps GPU ni des gains récupérables garantis.

Le recensement audio représente489,42ms propres et582,78ms inclusifs dans ce profil. Les Aulnes contiennent17 890 ressources, dont1 909 arbres et buissons contribuant à la canopée sonore ;1 160 de ces canopées restent temporelles. Le candidat évite de reclasser toutes les autres ressources à chaque adoption lorsque leur appartenance et leur ordre sont confirmés inchangés.

## Contrat

Une instance réservée aux consommateurs fixes de MAIN retient la liste ordonnée des canopées. Le journal structural confirmé compose les changements depuis le dernier World réellement adopté par l'audio. Compte, ordre, IDs, kind et species doivent préserver cette sélection ; ajout, retrait, permutation, changement de classification, checkpoint, epoch ou journal manquant entraînent une capture complète. Le journal ne donne aucune autorité à un graphe RAW : la non-mutation entre adoptions provient de la fermeture MAIN auditée [V295](aulnes-performance-v295.md).

Chaque ordinal relit la feuille du World courant. Croissance, feuilles absentes, climat, éclairage et quatre additions Float32 restent calculés dans l'ordre historique ; aucun dépôt différentiel, cellule sale ou gain sonore différé. Le cache mature existant et les requêtes caméra gardent leurs formules. Le lecteur public `FoliageAmbience` demeure inchangé. Les deux appels MAIN conservent leur position et leur condition, y compris la réactivation du son après une période silencieuse. L'accès DEV retourne toujours une copie. Le candidat a fait l'objet d'une revue indépendante sous `tmp/performance-v297/audio-review.md`.

## Coût contrôlé et piste écartée

`tmp/performance-v297/foliage-controls-reprise/run-HeoJM5/report.json`, SHA **26B3F970**, **PASS49,194s** :64 vrais ticks8434→8498,8 de chauffe et56 mesurés, quatre instances indépendantes A/B/B/A. Chaque fenêtre audio inclut adopt et quatre requêtes gain. Moteur, encodage, clone et décodeur sont réellement exécutés, mais hors de ces fenêtres. Les oracles comparent tous les mots Float32 et gains, les graphes Source/Decoder, l'ancien World, puis sauvegarde/reprise8498 et vrai tick8499.

Coût audio moyen **1,0314→0,6516ms (−36,83 %)** ; p95 **1,6825→0,9577ms**. Les deux B0,6830/0,6202ms sont inférieurs aux A1,3180/0,7449ms, avec une dispersion importante entre positions A. La liste est réemployée58fois sur65 ; les sept autres adoptions paient leur capture complète. Les deux seules observations froides par côté ne permettent pas de généraliser un gain au chargement. Ce banc Node n'est ni un budget CPU total ni une mesure de FPS ou de WebAudio.

Une seconde piste stockait directement les prévisions dans le tas de l'agenda végétal, supprimant des recherches Map sans changer ses mathématiques. Six oracles passent ; le coût complet de l'agenda contrôlé ne diminue que de3,0457 à2,9949ms (−1,67 %), avec p95 défavorable et froid dispersé. Cette piste est **écartée**, sans GAME ; la feuille produit est restaurée exactement. Le banc inclut reconstruction des sources, suffixe et ordre, pas le ledger complet du rendu. Les prototypes et leurs preuves restent privés, sous `heap-candidate`.

## GAME original

`tmp/performance-v297/game-audio/abba-CJXU9E/report.json`, SHA **E99B2334**, gel **42A5E05C** sous `freeze-0Q2Rb4` : **PASS228,686s**. Chrome matériel AMD/WebGPU,2560×1440/DPR1/dev, source8434, caméra129/122/zoom1,3s de chauffe puis14s, quatre cohortes fraîches A/B/B/A, aucune instrumentation CPU dans les fenêtres. Mapping canonique : MAIN entier à la base Git pour A, helper audio propre à B ; aucune ancienne extraction MAIN réutilisée.

| Cohorte | RAF/s | Débit effectif | p95 intervalle | Maximum | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 |113,92|5,651×|23,9ms|195,1ms|9012|
| B1 |119,42|5,996×|22,9ms|52,0ms|9031|
| B2 |118,49|6,004×|22,3ms|40,5ms|9041|
| A2 |123,38|6,015×|20,8ms|61,0ms|9043|

Agrégation **118,6522→118,9533 RAF/s (+0,254 %)**, débit **5,8327→6,0000×**, moyenne des p95 **22,35→22,60ms**. La base A1 présente un ralentissement de simulation et un pic important, alors qu'A2 atteint le vrai×6 et dépasse les deux B. Aucun gain FPS stable ne peut être attribué au candidat ; on ne transforme pas son meilleur débit moyen en preuve d'amélioration générale. Les quatre recharges sont exactes, erreurs vides, sources/publics inchangés et navigateurs/Vite5337 possédés fermés. Aucun second GAME inchangé lancé pour rechercher un résultat favorable.

Ces observations headless ne certifient ni moniteur240Hz physique, ni toutes les vues/parties. Elles n'isolent pas un temps GPU. Le coût audio local ne prédit manifestement pas ici l'amélioration du framerate ; ce constat motive une prochaine attribution du coût graphique complet en1440p, au lieu d'une nouvelle succession de petits caches.

## Validation

- 55 cas produits acquis dans neuf fichiers, un cas ignoré ; le test historique de lifecycle Aulnes dépasse initialement30s puis passe seul en34,660s avec les mêmes assertions et un timeout90s.
- Cinq nouveaux groupes audio passent en6,175s : mots Float32/gains, croissance/feuilles, classifications et membership, composition C après D, checkpoint/éviction et refus/reprise. Six oracles privés d'agenda passent également. Les tests audio corrigés et les deux feuilles candidates sont archivés sous `tmp/performance-v297/rejected-product` ; aucun test produit ajouté après le rejet.
- Build du candidat audio seul avec typage : **PASS7,917s** ; typage du banc final **PASS1,187s**, gel **PASS0,689s**. Aucun moteur, format de sauvegarde, ordonnanceur ou horloge modifié ; les campagnes générales inchangées ne sont pas rejouées après restauration exacte.
- Les rouges de contrôle restent conservés : types Node absents du premier tsconfig heap, spread tuple du script coût, assertion de mode du premier GAME ; copies distinctes pour les réparations. La fixture audio de refus utilisait amount−1, qui n'est pas une garde de ce Decoder ; elle emploie désormais le refus relationnel historique sans modification produit.
- Documentation : **PASS1,069s**. Après rejet, `git diff` ne contient aucune modification de source, test, package ou fichier public ; pas de campagne lourde répétée sur le produit restauré.

## Publication

Clôture documentaire avec commit et push. Les mises à jour Cloudflare sont regroupées conformément à la demande humaine ; aucun déploiement pour ce diagnostic. Le site reste sur V296 et la relance planifiée reste en pause. L'autorisation humaine de poursuivre les optimisations demeure applicable ; aucun ancien prototype rendu/Workers/freeze n'est réactivé sans nouvelle cause.
