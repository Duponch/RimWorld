# Conserver le débit confirmé pendant le démarrage

31 octobre — correctif intégré et qualifié ; la priorité de fluidité générale reste ouverte. Source [MotionTimeline](../../src/render/MotionTimeline.ts), schéma 297 : préimage `62ad650d`, candidat `42054a08`, cinq spans. Ce lot concerne uniquement la présentation du temps confirmé ; le moteur, les trajectoires, la vitesse physique, les commandes et les ACK ne changent pas.

La Timeline pouvait mesurer un sous-débit réel pendant le remplissage initial, puis effacer cette mesure au moment où sa réserve devenait prête. Elle repartait alors au débit nominal demandé, consommait son avance trop vite et pouvait atteindre la dernière frontière disponible. La trace produit conserve dix positions immobiles après 200 ms à ×6, dans un groupe sans nouvelle frontière disponible dans MAIN ; cela ne prouve ni un problème GPU ni une cause CPU particulière. Voir [le diagnostic de livraison](delivery-frontier297.md) et [la mémoire du débit confirmé](confirmed-supply-memory297.md).

Le correctif ancre l'estimation au **premier vrai progrès** reçu après un reset, un changement de propriétaire ou de vitesse. L'attente avant ce premier Core, sa quantification et les doublons ne constituent donc pas un faux débit lent. Les réceptions suivantes mesurent le débit entre progrès confirmés. Au remplissage, une cadence compatible avec le nominal conserve le reset historique ; un sous-débit effectivement mesuré est gardé. Le démarrage est terminé dans les deux branches, sans ignorer le premier progrès suivant. Aucun seuil, tampon, branche de pause ou algorithme de calcul d'itinéraire n'est modifié ; aucune donnée future n'est prédite.

La première proposition privée conservait trop largement l'attente froide : **39 PASS / 3 FAIL**, notamment sur les cadences régulières ×3/×6 et le début nominal d'une récupération. Source, rapports et attentes de cette V1 adverse sont conservés ; elle n'a pas été installée. La V2 garde le contrat capturé de 538 appels inchangé et ses mêmes voisins : **43 PASS / 0 FAIL**, soit un contrat de trace et 42 finalités voisines. Ce résultat ne représente pas une suite globale verte.

Le replay numérique témoin reproduit exactement les ticks enregistrés et leurs 25 arrêts, dont 10 après 200 ms. Le candidat donne 11 arrêts au total et **aucun après 200 ms** dans cette trace ; les pauses restent exactes. Ce sont des états de Timeline rejoués, pas de nouvelles images ou observations géométriques : les 25 arrêts du Native produit restent dans la preuve historique. La fluidité du candidat doit encore être observée dans le vrai rendu.

Le coût scalaire borne seulement ce petit chemin : 322800 appels par bras W/C/W, sans World ni moteur.

| Mesure | Témoin1 | Candidat | Témoin2 |
|---|---:|---:|---:|
| Temps écoulé total | 21,0053 ms | 18,5597 ms | 11,6524 ms |
| CPU processus, granularité grossière | 77 ms | 0 ms | 16 ms |

La dérive des témoins/JIT est forte ; le candidat se situe entre leurs temps écoulés. Le compteur CPU à zéro ne signifie pas un coût nul. Ces nombres ne prouvent ni gain stable, ni absence de régression globale, ni FPS, latence de commande ou amélioration du débit moteur. Le trou source de 91,6 ms et la dette PERF-V492-X6 ne sont pas clos par cette modification.

Les preuves privées sont `startup-confirmed-supply-author-v2`, `startup-confirmed-supply-v2-qualification-root-v1/report.json` et `startup-supply-scalar-cost-root-v3/run/report.json`, sous le checkpoint courant. Aucun Core réel n'a été joué par ces contrôles numériques. Le parent de la nouvelle observation est `0a9933b3` / Core118680 ; la nouvelle autorité et ses limites sont décrites ci-dessous. Les anciens entiers restent des références historiques, jamais des parents de continuation automatique. Le contrôle intégré confirme 43 PASS / 0 FAIL en 30,375 s, le typage passe en 17,416 s et le build Pages CODE en 4,138 s ; les assets publics sont résolus sans être dupliqués.

## Observation réelle du produit corrigé

Une continuation exclusive depuis 0a993 a observé les mêmes trois humains à ×1, ×3 puis ×6 : Noé marche sur trois vrais ordres, Sacha travaille, Ada dort. Ce contrôle instrumenté qualifie les états géométriques soumis, les pauses de 300 ms et les recharges exactes ; il ne mesure pas la fin GPU, les FPS globaux ni les animaux.

| Vitesse | Images soumises | Positions répétées avec marche, après 200 ms | Plus grand intervalle entre soumissions |
|---|---:|---:|---:|
| ×1 | 587 | 0 | 44.3 ms |
| ×3 | 479 | 0 | 50.7 ms |
| ×6 | 451 | 0 | 68.9 ms |

Les échantillons froids et défavorables restent conservés : ×1 : 0 positions répétées avec marche au total ; ×3 : 12 positions répétées avec marche au total ; ×6 : 16 positions répétées avec marche au total. Ada conserve Y = 0,5 et aucun drapeau de marche dans les trois fenêtres. Les longues périodes entre soumissions restent un problème distinct ; l’absence de positions répétées ne prouve pas une cadence d’image régulière. Aucun gain causal ne se déduit de deux essais successifs sans charge identique contrôlée.

Dernier ACTUAL exclusif : **5ca1ed3167c84d0da1154ec07be7a8461a63021bfe1b0cb386921e5799659a5b**, gzip **4adc9fea907ffdaddfa307c39b9f26dfea5da56ecff416b20fd5a7b0dafaa05f**, Core120270 / RNG3509307909 / nextId30333, propre recharge exacte. Le rapport `input` atteste le parent 0a993 ; le champ auxiliaire `final.parentRawSHA256` hérité du harnais répète l’empreinte finale et ne constitue pas une preuve de filiation. Aucun retour à 0a993 ni rejeu de latch. Campagnes humaines et d474 intactes.

Preuves privées sous le checkpoint courant : `startup-supply-integration-root-v1/qualified-component.json`, `startup-supply-integrated-validation-root-v1/report.json`, `final-startup-c2-native-author-v1/native-final-startup-c2-v1/report.json` (SHA 79a4b561b6ebd8b2c41f5636a3dbd543c2a0eedba86928683a53d0acd0ce9c01) et son `three-speed-submission-analysis.json` (SHA b4777aaa609001ce936922b09ae357983cd096ca9e457f9e85b35ea574a71c2a). La carte produit compte 2080 sources, SHA8007a08c, schéma297. Aucun déploiement Cloudflare ; dernière publication attestée V491. Les six ensembles et la victoire restent suspendus.
