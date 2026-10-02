# Preuve bornée — première quête locale V183

2 octobre 2026, schéma **172**, depuis `0e61ada` (V182). [Contrat](../development/quest-local-v183.md), [recherche Core](../research/quest-local-core-v183.md). Une première famille locale d'asile, pas un générateur de quêtes Core exhaustif. L'édition utilisateur préexistante de `src/render/GpuGroundGrassLayer.ts` est conservée et exclue du commit ; aucun push ni déplacement de session sur C:.

## Scène et sources

« Asile et poursuite · 3 colons » : seed 13313, broussailles arides 250², date civile préparée au tick 48 000. L'offre vient de `advanceQuests` ; aucun colon ni raid de quête n'est précréé. Les autres calendriers sont prospectivement réadoptés et l'introduction Cassandra manquée est consommée sans spawn rétroactif. La préparation ne constitue ni partie naturelle de huit jours ni mesure de fréquence Core.

Fixture `public/test-saves/v183/asile-et-poursuite.json`, SHA‑256 `4e7ebd747679916b4113ec2a0838006759d9b2e844569f9c997d0e035ec94d37`. Le catalogue compte 35 entrées ; les anciennes fixtures restent inchangées.

## Intégration et reprises

La première passe ciblée comptait 36 contrôles : 30 réussis et six échecs. Cinq échecs provenaient des helpers de tests qui avaient ajouté le profil Cassandra sans son calendrier de grippe obligatoire ; le sixième était l'oracle de migration V182 encore fixé à 171. Les assertions métier sont conservées ; les préparations et l'attente du schéma courant sont corrigées séparément du produit. Des casts de fixture malformée 171 ont aussi été corrigés pour le typage 172.

Une passe groupée de neuf fichiers a passé **40/40** après ajout du contrôle de bordure : si la bordure initiale est fermée et les autres ouvertes, le poursuivant attend ; libérer une entrée de cette même bordure rend son apparition possible. La revue a ensuite reproduit une exception de coercition sur une date JSON objet et l'acceptation fautive d'une durée texte. Les gardes de type sont corrigés au produit ; dates, durée et phase malformées sont refusées sans exception, et les deltas correspondants ne consomment pas la révision du décodeur.

Le regroupement final passe **49/49 dans treize fichiers, 12,14 s** (`tmp/test-runs/quest-v183-final-targets.log`) : phases et échéances, refus/doublons atomiques, entrée et raid uniques, blocages et PRNG indépendants, décès avant conclusion neutre, migration 171 stricte, liens/possessions, snapshots au même tick, fixtures et anciens catalogues. Le nouveau `quest-scout-v183.test.ts` fait charger les deux rations par contact et sortir réellement l'arrivant, puis vérifie ses mêmes identités et sa chemise hors carte, sauvegarde/reprise exacte, checkpoint antérieur intact et delta corrompu refusé avant adoption du bon delta.

## Parcours de jeu préparé

Chromium **natif WebGPU, 1/1 en 31,4 s de test, 34,5 s au total**, carte 250² graine 13313 (`tmp/test-runs/quest-v183-native-release/`, log voisin). Les menus réels chargent la trente-cinquième colonie ; la lettre ouvre Quêtes, l'acceptation puis une sauvegarde/reprise précèdent l'arrivée. La chronologie confirmée est offre/acceptation **48 000**, arrivée **48 100**, Pawn **6767**, raid **48 225**, groupe **1**, conclusion **48 285**. Un seul arrivant avec sa chemise et un seul ennemi au couteau entrent réellement, à la même bordure. La conclusion neutre laisse le groupe actif ; une nouvelle reprise conserve les liens. Aucune erreur navigateur collectée.

Les quatre captures offre/arrivée/poursuite/conclusion et `quest-v183-ui-proof.json` restent sous `artifacts/` de ce run. L'offre et la conclusion ont été inspectées ; l'offre après l'espacement final des boutons a aussi été revue. Délais en minutes/heures de jeu, profil et menace avant réponse, conclusion sans victoire promise, défense et besoins restant à gérer. Le premier parcours passé affichait encore des ticks ; cette présentation a été corrigée puis rejouée. Les derniers gardes de types sont couverts par les ciblés et cette dernière reprise native sur les sources finales.

## Sous-coût CPU des phases avant échéance

`scripts/quest-bench-v183.ts`, rapport `tmp/test-runs/quest-v183-cpu/advance-quests.json`, Node **24.11.1**, Windows, AMD Ryzen 5 3600 / douze processeurs logiques. Fixture 250² ci-dessus ; `src/sim/quests.ts` SHA-256 `047554de79fa04ddee25b2893bdd21a6ea5caedea74cb8d41ac31777aee35e15`. Vingt mille appels d'échauffement par variante puis quatre blocs alternant les ordres, **200 000 appels par bloc**. Clones/validation hors chronométrage ; World sérialisé complet et tous les PRNG présents restent exacts après chaque bloc, sources et fixture stables.

| Chemin avant toute échéance | Médiane de la moyenne par bloc, µs/appel | « p95 » sur quatre moyennes de blocs, µs/appel |
| --- | ---: | ---: |
| Calendrier absent | 0,0139 | 0,0192 |
| Calendrier vide | 0,0169 | 0,0406 |
| Offre non échue | 0,0391 | 0,0449 |
| Historique préparé de 32 refus | 0,1953 | 0,2086 |

Le « p95 » du script est ici le maximum des quatre moyennes, **pas** un percentile d'appels individuels. L'absence de scan d'entrée sur ces chemins est déduite des branches, pas instrumentée. Ces nombres ne mesurent ni admission/connectivité, génération, tick complet, worker, adoption continue, CPU image, RAF, GPU ni FPS. Les gardes de validation ajoutés ensuite n'ont pas modifié la fonction mesurée. Le rendu réutilise les lots d'acteurs existants ; les nouveaux acteurs ont leurs coûts ordinaires, sans garantie de coût GPU nul.

## Régression et compilation

La première régression hors campagnes longues termine **364 fichiers en 296,47 s : 1 592 réussis, un ignoré, trois échecs** (`tmp/test-runs/quest-v183-regression.log`). Les trois échecs sont les compteurs 34→35 de `healroot-demo-v179`, `test-colony-library` et `weather-test-colonies-v166`. Leurs attentes sont actualisées sans changer les anciennes fixtures ni retirer les assertions de contenu, SHA, propriétaires ou reprise ; leurs contrôles passent dans le regroupement final 49/49. La passe générale finale sur les gardes corrigés et le nouveau contrôle de reconnaissance passe **365/365 fichiers, 1 597 réussis et un ignoré, 326,31 s** (`tmp/test-runs/quest-v183-regression-final.log`).

Build TypeScript/Vite passé, **629 modules**, 7,93 s pour la commande locale (`tmp/test-runs/quest-v183-build.log`). Avertissement préexistant de chunks dépassant 500 kB. La seule retouche de style après la régression ajoute un espacement de huit pixels et le retour à la ligne des boutons d'acceptation/refus ; aucune logique de simulation ne change.

## Diagnostic de l'oracle de présentation

La première commande `npm run test:presentation` échoue à l'abattage (`tmp/test-runs/quest-v183-presentation.log` et son run). Minage : 10 612 images, aucune alerte ; abattage : 10 376 images, **une alerte**, aucune occupation solide ni famine du tampon. P95 4,3 ms sur les deux scènes. La trace conservée signale Pawn 12409 au tick/play 2744/2745,5964 : déplacement **0,41299 case en 29,1 ms**, borne brute 0,3983. Son arête logique 117→116 est présentée de `(117 ; 121,9206)` à `(115,82 ; 122)` pour atteindre le contact de coupe à −0,18 ; ce trajet mesure 1,18267 case, donc environ **14,19 cases/s à 6×**. Les deux poses correspondent au déplacement continu calculé sur cette droite. Les attributs de la frame précédente manquent cependant dans cet ancien rapport : il ne prouve pas formellement qu'ils n'ont pas changé entre les deux images.

La réparation concerne **le banc**, sans modifier PawnLayer, l'horloge, les mouvements ni la borne brute de treize cases/s. Chaque témoin copie maintenant les primitives des attributs GPU et du segment logique, plutôt qu'une référence mutable. Un excès n'est classé continu que si les deux frames gardent exactement la même arête et les mêmes bornes, un trajet cardinal adjacent, des bornes dans l'enveloppe de contact de 0,30 case, des poses sur leur interpolation et des temps/durées concordant avec l'horloge confirmée à au plus 6×. Un changement de segment ou un témoin incomplet garde l'alerte. Rapports : compteur brut et excès continus distincts, deux témoins conservés.

`frame-metrics` et `presentation-latency` passent **6/6 dans deux fichiers, 3,27 s**, puis le typage passe (`tmp/test-runs/quest-v183-presentation-oracle.log`). Le témoin chiffré reconstruit contrôle la continuité hypothétique ; téléportation d'une case, borne remplacée avec pose recalculée, horloge sautée, segment changé et temps non fini échouent. Les assertions de contrôles, starvation, occupation et retraits restent intactes. Cette réparation est postérieure à la régression générale ; seul l'oracle de banc est touché, pas les sources du build produit.

Le replay diagnostic `HARVEST_CONTACT_STALL=1` (`tmp/test-runs/quest-v183-presentation-contact/`) injecte une pause de 30 ms au contact. À l'abattage, son unique alerte brute est bien classée continue avec **les deux témoins natifs** : même arête logique 2744→2747 et mêmes bornes GPU `(117 ; 121,9379)`→`(115,82 ; 122)`, déplacement 0,47218 case en 33,3 ms avec les horloges concordantes. Aucun saut, solide ou tampon affamé. **Ce run reste néanmoins en échec** : un passage 3×→6× répond en **101,4 ms**, au-delà des 100 ms requis, au temps navigateur 20 289,3 ms ; la pause injectée n'arrive qu'à 50 766,8 ms. L'injection ne peut donc expliquer ce dépassement. L'ancien rapport ne conserve pas le détail des frames de ce contrôle : la cause du retard n'est pas établie, et aucune limite de commande n'est desserrée.

Le replay normal final sans pause ni trace supplémentaire passe ensuite (`tmp/test-runs/quest-v183-presentation-final.log` et son rapport). Chromium natif WebGPU AMD/RDNA‑1, Ryzen 5 3600, viewport 1440×1000, seed 42 / 250² / trois colons ; **45 s de minage puis 45 s d'abattage**, alternance 1×/6×/3×. Minage **10 716 images**, abattage **10 703** ; p95 des intervalles RAF **4,3 ms** chacun, maxima **20,9/33,3 ms**. Zéro alerte brute ou saut, zéro occupation solide, zéro famine du tampon et aucune erreur navigateur. **22 commandes de vitesse par scène**, délais maximaux **26,4/26,3 ms**, sous la limite inchangée de 100 ms. Les travaux restants diminuent **186→162** et **262→238**, avec retraits au tick présenté requis. Ce succès ne réécrit pas l'échec du diagnostic ni ne prouve la stabilité de tous les changements de vitesse sur tous les matériels.

Les sources servies sont restées gelées ; microbanc, régression, build, parcours quête et replays de présentation ont été exécutés successivement. Les intervalles RAF ne constituent pas une mesure GPU ni une promesse de 240 FPS. `npm run check:docs` passe : **632 documents, 6 025 liens locaux**, 25 domaines/cinq familles, six en-têtes au schéma 172 et trois originaux inchangés en octets (`tmp/test-runs/quest-v183-docs.log`). Recherche et implémentation ne sont pas chronométrées séparément ; seules les durées d'exécution ci-dessus sont acquises.

Campagnes naturelles longues, cadence du narrateur Core, capture/fuite de l'arrivant, navigateur exhaustif et coût global CPU/GPU restent hors preuve. Le microbanc avant échéance ne remplace pas un profil de colonie complète, et cette famille locale ne clôt pas G5.
