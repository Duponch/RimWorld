# V292 — coût des messages territoriaux

Diagnostic terminé, **produit V291 et schéma 218 conservés**. Aucun nouveau FPS livré. L'ablation expérimentale de cinq groupes territoriaux réduit les deux portions mesurées du transport de 2,641 à 1,871 ms par paquet (−29,18 %). Elle supprime des données nécessaires au jeu : ce résultat ne constitue ni un protocole correct, ni un gain de framerate. La priorité suivante reste une réduction des validations MAIN ; un protocole territorial exact reste une piste conditionnelle.

## Question et périmètre

V291 mesure près de 2 ms pour le premier accès au message dans le jeu. L'encodeur transporte déjà différentiellement terrain, ressources, piles et constructions : Les Aulnes possèdent 2452 constructions, au-dessus du seuil 1000. Baisser ce seuil ne vise donc pas cette référence.

Le diagnostic compare les vrais paquets V291 intacts à une copie dont `world` omet `home`, `roofing`, `growingZones`, `stockpiles` et `thermal`. Les températures et réglages de stockage appartiennent aussi à ces groupes : ils ne pourraient pas simplement disparaître d'un produit livré. Les dimensions JSON ne sont pas des octets de structured clone et ne servent pas d'attribution CPU.

Le [getter MessageEvent de Chromium, révision 5dce1815](https://chromium.googlesource.com/chromium/src/+/5dce1815e20eeda684ff15dac7767c2e67d39cc2/third_party/blink/renderer/core/events/message_event.cc) appelle la désérialisation dans sa branche serialized. Cette source explique le choix du premier getter ; elle n'identifie pas la révision du Chrome installé et ne prouve pas le coût en amont de la livraison.

## Méthode

Chrome local, 2560×1440/DPR1, Vite dev, port privé 5326. Un Worker contrôlé charge le fichier public exact au tick 8434, exécute **64 vrais ticks** avec moteur, observateurs et encodeur canoniques, puis une reprise au tick suivant. Le checkpoint froid est séparé. Huit ticks chauffent le banc, 56 sont mesurés.

Pour chaque état, l'encodeur est appelé une fois puis le même paquet est envoyé quatre fois, **A intact / B tronqué / B tronqué / A intact**, avec un seul envoi en vol et un ACK scalaire. Le Worker mesure l'appel postMessage ; le destinataire mesure une unique lecture event.data avant toute inspection. Un rendez-vous distinct, après les quatre retours postMessage, autorise ensuite une adoption RAW de A. Les paquets B ne sont jamais adoptés. Les temps de cette adoption, les validations, hashes et oracles sont hors des quatre fenêtres de transport.

Un World Source, un paquet courant et au plus deux copies finales A/B sont conservés ; aucun corpus de Worlds. Mêmes ticks/révisions, source et champs hors ablation contrôlés par oracles ; aucune référence World/client/rendu n'est exposée à CDP. Les sommes post/getter décrivent du travail sur deux threads, **pas une latence critique, un débit naturel ×6 ou un budget CPU total**. Les temps du protocole de mesure et des oracles ne sont pas soustraits d'une prétendue durée GAME.

## Résultat qualifié

Gel `AB490C3E`, `tmp/performance-v292/message-cost-reprise/freeze-fJzLGC/manifest.json` (1167 entrées). Rapport `message-cost-reprise/run-vwxBFG/report.json`, SHA `43034074`, **PASS 43,803 s**. Pour chacun des deux côtés : 112 appels postMessage et 112 lectures de message.

| Portion | A intact | B sans cinq groupes | p95 A / B |
|---|---:|---:|---:|
| Appel postMessage | 0,992 ms | 0,696 ms | 1,3 / 1,2 ms |
| Premier getter data | 1,649 ms | 1,174 ms | 2,1 / 1,7 ms |
| Somme descriptive | 2,641 ms | 1,871 ms | Non additionné |

Économie moyenne : **0,771 ms**, dont 0,475 ms au getter. Les deux comparaisons par position sont favorables : A1−B1 = 0,839 ms ; A2−B2 = 0,702 ms. Parmi les 56 différences moyennes par tick : 53 positives, une nulle, deux négatives. Le pic postMessage B de **4 ms**, contre 1,6 ms pour A, reste défavorable ; les queues ne disparaissent pas.

La préparation Source réellement payée est de **24,195 ms** en moyenne, p95 49 ms, pic 69 ms. Ses sous-portions incluent moteur 18,739 ms, observateurs 1,352 ms, encodage 4,087 ms et enveloppe 0,011 ms. La durée globale englobe ces portions : ne pas les additionner deux fois. La projection B de 0,006 ms est une simple copie d'enveloppe avec suppressions ; elle ne paie aucune comparaison de témoins ni reconstruction exacte future. L'adoption RAW séparée coûte 10,854 ms ici : elle n'est pas le client privé MAIN optimisé et ne remplace pas ses mesures V291.

Le dernier delta contient, à titre descriptif, 72595 octets JSON de réserves, 28801 de home, 17778 de thermique, 16389 de toiture et 7369 de zones agricoles. Ces tailles n'autorisent pas à répartir les millisecondes entre champs. Le résultat des cinq groupes n'est donc pas le gain des trois seules géométries proposées dans l'étude privée.

## Validation

Typage initial PASS 2,675 s. Premier gel `D4539819`, rapport `message-cost/run-z2txt6/report.json` SHA `E66C4999` : **FAIL 44,221 s**, après les 64 états et oracles, pour une erreur console HTTP 404 sans URL attribuée. Rouge et gel conservés. Cette première mesure n'est pas utilisée comme deuxième cohorte qualifiée.

ROOT a créé une copie distincte des six feuilles : seuls chemins privés, favicon explicite data, localisation des erreurs console et notice de reprise changent. Worker et receiver restent littéraux ; aucun produit modifié. Typage de reprise PASS 2,810 s, puis exécution qualifiée ci-dessus avec erreurs vides, sources/publics exacts et fermeture du Worker, de Chrome et de Vite. La réussite de reprise n'attribue pas rétrospectivement l'URL du premier 404.

Source et Decoder RAW passent **8434→8498**, puis sauvegarde/recharge et vrai tick **8499**, états sérialisés et RNG exacts. Les 63 références/66 fichiers du catalogue restent inchangés ; aucun nouveau parcours public exhaustif, build ou test de présentation n'est nécessaire pour ce diagnostic sans modification produit. Revues indépendantes, gels et rapports privés sont sous `tmp/performance-v292`. Aucune qualification GPU, écran 240 Hz, campagne naturelle ou framerate n'est acquise par ce banc.

## Décision et suite

Le seuil préalable de 0,5 ms d'économie des deux portions est franchi. Il autorise à étudier un protocole exact, sans imposer sa réalisation : retirer des valeurs entières est plus favorable qu'un transport qui les conserve, et les nouvelles comparaisons Source devront être payées. La préparation Source mesurée ne démontre aucune marge gratuite pour déplacer d'autres validations vers ce thread. Un contrat éventuel devra distinguer rétention/remplacement/absence, garder l'omission DELETE historique, les mutations au même tick, les températures exactes, les anciennes vues et les refus/reprises.

La priorité retenue est d'abord d'attribuer le coût du registre global d'identités MAIN. V291 capture déjà les IDs des ressources ; le registre strict reconstruit encore sa collection de propriétaires et les réinsère. Une étude privée `namespace-next.md` décrit une réutilisation dans la même adoption, en conservant le préfixe, la frontière Resource, les premiers motifs et le mode non strict historique. L'ancien obstacle V246 concernait des graphes exposés ; la fermeture native V290 est une condition différente, pas une autorité pour les APIs RAW. **Aucun code ni gain de cette suite n'est acquis.** Ne pas relancer un ancien prototype inchangé ; mesurer les contrôles supplémentaires, l'union en aval et le coût complet avant adoption. Aucun noyau numérique dominant n'établit encore l'intérêt de WASM.
