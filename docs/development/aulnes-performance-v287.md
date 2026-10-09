# V287 — lectures communes pendant la validation des états

Suite du diagnostic [V286](aulnes-performance-v286.md), sur Les Aulnes intégrées en Chrome, 2560×1440 et développement. Le profil MAIN désignait encore les recherches de ressources de production et les ensembles d'identités hydroponiques/orbitaux. Cette correction conserve le moteur, le rendu, le schéma 218, les cadences, les règles et les 63 sauvegardes publiques.

## Changement

Une validation de production capture paresseusement la présence des ressources par coordonnées x/z et partage le résultat du prédicat historique d'occupation pour une même cellule. Portée, recettes, atelier, composant avancé, quantités, propriétaires, réservations et capacité restent contrôlés séparément. Les commandes en attente gardent leur contexte de réservations. Aucun remplacement approximatif des empreintes.

Une adoption partage également les identités des six collections communes à l'hydroponie et au commerce orbital, avec la collection numérique déjà utilisée par le registre du jeu. La vue orbitale ajoute les zones et les bâtiments emballés des propriétaires réels, y compris étrangers, sans les introduire dans la vue hydroponique. Les contrôles de forme, doublons, limites et propriétaires restent à leur emplacement historique. Le registre global est inchangé.

Ces captures sont locales à une validation synchrone, sans écriture du World entre leurs lectures. Elles ne survivent ni à une adoption ni à son refus. Les appels ordinaires des validateurs de fichiers conservent les parcours historiques, y compris leurs observations de mutations. Les coordonnées atypiques conservent les égalités exactes ; les ressources nulles reviennent au parcours historique. Aucun nouvel état persistant.

## Coût CPU

Comparaison ABBA entre V286 `fffd841d` et les huit feuilles candidates gelées. Deux corpus issus de 32 ticks ordinaires chacun : référence intégrée 8434→8466 et ancienne référence 6934→6966. Quatre deltas de chauffe et 28 mesurés par processus neuf ; coût de construction des index inclus.

| Coût moyen | V286 | V287 | Variation |
|---|---:|---:|---:|
| Adoption, Aulnes intégrées |24,29 ms|18,28 ms|−24,74 %|
| Clone + adoption, Aulnes intégrées |30,52 ms|23,92 ms|−21,63 %|
| Adoption, ancienne référence |12,03 ms|10,61 ms|−11,83 %|
| Clone + adoption, ancienne référence |16,93 ms|15,40 ms|−9,04 %|

Le p95 clone+adoption passe de 39,00 à 30,43 ms sur la référence intégrée. Les deux passages B sont meilleurs que les deux A pour cette adoption. Le clonage n'a pas été modifié : sa variation observée ne constitue pas une optimisation indépendante. Au froid, les coûts sont dispersés (intégrée A 300/177 ms, B 183/170 ms ; ancienne A 141/144 ms, B 144/143 ms) : aucun gain froid général annoncé.

Les 33 anciennes vues de chaque passage restent exactes par sérialisation, les graphes initial/final sont comparés entièrement, puis sauvegarde/recharge et un tick supplémentaire sont exacts aux ticks 8467/6967. Ce banc Node ne mesure pas l'ordonnanceur postMessage, le rendu ou les FPS.

## Mesure dans Chrome

Quatre parcours GAME successifs A/B/B/A, chacun avec navigateur et serveur privés neufs, même checkpoint public 8434, caméra orthographique 129/122/zoom 1, Chrome matériel AMD/WebGPU, 2560×1440/DPR1, Vite dev et réglages initiaux identiques. Chauffe de 3 s puis fenêtre de 10 s ; les feuilles A/B sont chargées avant transformation Vite aux mêmes identifiants de modules.

| Passage | Images RAF/s | Vitesse effective | p95 des intervalles | Reprise exacte au tick |
|---|---:|---:|---:|---:|
| V286 A1 |55,67|5,942×|36,3 ms|8918|
| V287 B1 |82,69|6,009×|26,1 ms|8911|
| V287 B2 |76,10|6,016×|28,5 ms|8909|
| V286 A2 |58,74|6,043×|33,1 ms|8916|

Sur les fenêtres cumulées : **57,20→79,39 RAF/s, soit +22,19/s (+38,80 %)**. Le débit confirmé reste comparable, 5,993→6,012×. La moyenne des deux p95 passe de 34,7 à 27,3 ms ; les pires intervalles B sont encore de 48,9/53,6 ms. **L'objectif 240 FPS et une fluidité constante ne sont pas atteints.** Les possibilités RAF de Chrome headless ne certifient pas la présentation physique d'un écran 240 Hz, toutes les caméras ou toutes les colonies. Le bénéfice CPU sur l'ancienne référence est établi séparément ; aucun nouveau chiffre FPS V224 n'est extrapolé.

Un profil MAIN distinct, après la fenêtre B2 et sa reprise, conserve environ 40 % de poids inclusif dans le Decoder, 9,5 % dans la validation de production, 5 % dans l'hydroponie, 4,1 % dans le cache des parents électriques et 19,8 % dans l'application de scène. Ces familles se recouvrent et ne s'additionnent pas. Le profil échantillonné guide la suite ; il ne mesure ni un temps par tick ni le GPU.

## Validation

Les contrôles regroupés passent : 73 cas dans neuf fichiers, dont 14 nouveaux, en 14,764 s, puis les trois cas du contrat numérique réutilisé en 0,757 s, soit 76 cas dans dix fichiers. Typage en 5,418 s après correction du type d'une fixture d'identités partielle, puis build Vite en 1,961 s. Le premier journal de typage rouge est conservé ; aucune correction produit n'en découle.

Les 63 sauvegardes publiques passent en 46,140 s : hash, lecture stricte/migration, sauvegarde/recharge, checkpoint/delta, ancien World retenu et continuation d'un tick identiques. Rapport `tmp/performance-v286/public-check-AGSTLQ/report.json` (réemploi du script, nouvelle sortie distincte). Aucun payload ni catalogue changé.

Le contrôle commun de présentation passe en 118,963 s : minage et abattage à plusieurs vitesses, sans saut ou traversée de décor ; aucune modification d'oracle. Sortie distincte `tmp/test-runs/performance-v287-presentation-2026-10-09T23-10/artifacts/harvest-sync-verification.json`. Ces scènes contrôlent la continuité visuelle, pas les FPS des Aulnes.

Preuves privées : `tmp/performance-v287/decoder/freeze-9JGDL9/manifest.json` (gel D9D73F2F), `decoder/cost-Xzgi0s/report.json` (coût complet et reprises, 96,005 s), et journaux `performance-v287-*` sous `tmp/validation-runs`. Les feuilles A viennent du commit exact, les feuilles B sont capturées aux mêmes URL de modules ; sources et fichiers publics sont contrôlés avant/après.

Le GAME passe en 211,594 s : `tmp/performance-v287/native/abba-pPXm6w/report.json`, avec ses quatre rapports liés, captures, scripts réellement servis et sauvegardes. Sources/publics exacts, erreurs de console/GPU vides et chaque navigateur/serveur privé 5320 fermé. Le profil et ses sources compilées sont dans `native/3-b-4L7bB9/aulnes-current-6x`.

Le contrôle documentaire initial a signalé le numéro de schéma absent de l'en-tête courant de la roadmap ; en-tête corrigé, reprise réussie en 0,806 s (894 documents, 8508 liens), journal rouge conservé.

WASM reste conditionnel à un noyau coûteux démontré. Ce lot retire des recherches répétées dans les graphes d'objets ; il ne démontre pas un avantage à les convertir vers une autre représentation. Aucun gain GPU mesuré ou objectif de 240 FPS déclaré atteint.
