# Qualification du diagnostic par image V243

Base V242 `b92c2fb1`, schéma198. Aucun src/tests/package/public modifié ;62payloads et65fichiers publics restent exacts. La préparation et sa revue indépendante sont privées sous `tmp/performance-orientation-v243`. L'inverse entier restitue le run GAME V242 et ses11 substitutions uniques ; le transform main restitue l'observateur qualifié puis le main historique. Sources, archives et Three0.186, y compris les builds réellement servis, sont fingerprintés avant/après.

GEL ROOT `B2F8A618`,2843fichiers. Helper `E34D6A7E`, tests `BC5D31E5`, transformer `B8CFD70F`, générateur `A648C9D1`, run `2D353FE9`, provenance `C1399009`. Aucun ancien gel ou résultat rouge modifié.

## Contrôles séquentiels

ROOT seul, avec validate:logged et caches E: : typage PASS1,351s ; un fichier/douze cas PASS1,941s ; vrai GAME matériel PASS33,988s. Les cas vérifient receveurs/arguments/retours/exceptions, matrices du vrai Scene Three, réentrance, frontières true/false, propriétés own/inherited, restauration sans écraser un remplacement étranger, absence de getters paresseux supplémentaires, NodeUniformBuffer redirigé et overflow des ranges. Le renderer de fixture ne simule aucun GPU.

Une seule fenêtre GAME : source6934, chauffe3s puis8s, iso129/122/zoom1,1920×1080/DPR1, AMD,6× demandé, qualité/UI/audio/music réels.915frames observées et181applications. Vitesse des snapshots confirmés7010→7255 :5,116×.114,375RAF/s instrumentés, pas une comparaison FPS ordinaire.

| Appel inclusif | Appels | Moyenne | Total |
| --- | ---: | ---: | ---: |
| Core.frame | 915 | 5,343ms | 4888,5ms |
| Core.applyWorld | 181 | 10,807ms | 1956,1ms |
| Strict adopt | 185 | 4,890ms | 904,7ms |
| Main.onSnapshot | 186 | 1,854ms | 344,8ms |
| Renderer._renderScene principal | 915 | 2,695ms | 2465,9ms |
| Renderer._renderScene ombre, imbriqué | 915 | 0,895ms | 818,9ms |
| Renderer._renderScene autre, imbriqué | 915 | 0,139ms | 126,9ms |
| Scene matrices principale | 915 | 0,093ms | 85,4ms |
| Scene matrices ombre | 915 | 0,043ms | 39,3ms |

Ces timers se recouvrent. Le compteur historique gpu.submitRender contient1830appels,915racines et915ombres imbriquées ; sa moyenne globale ne décrit pas une frame principale isolée. p95 Core.frame17,2ms, maximum26,5ms. Les deux reconstructions mobilier observées sont conservées dans la dose.

OBJECT non partagé :386108décisions principales,126693ombre,2745autre, toutes true. RENDER partagé : principale26513true/29280false, ombre915/41926, autre915/0. Aucune FRAME observée. Ces comptes ne donnent pas le temps des comparaisons d'uniformes.

Backend.updateBinding :52423requêtes principales et29094ombres réussies. Les ranges CPU ordinaires déclarent1741136 et395268octets cumulés ;2745 et1830requêtes ont des bytes inconnus. Aucun census de ranges ne dépasse128. Ces valeurs ne sont ni des uploads physiques ni toutes les écritures du GPU.128layouts conservés,473identités supplémentaires refusées au census, aucune faute ou perte de samples/buckets ; ne pas généraliser le sous-échantillon de layouts.

Sauvegarde/rechargement exacts et anciennes vues passent hors fenêtre. Erreurs vides, sources/public exacts, navigateur et origine possédée5244 fermés. Pas de nouvelle campagne annuelle, refus tardif ou reset GPU certifié par V243 ; ces derniers restent ceux du parcours produit V242. Aucun gain FPS livré par ce lot, aucun240FPS ou vrai6× certifié.

Rapport privé `tmp/performance-orientation-v243/frame-uniform-attribution-next/captures/run-2026-10-06T19-56-32.631Z-WSZHwp/report.json`, SHA256 `04FBCAEA9DA6A5D2E56459DE94C1C025F5138A7472DFE4C94AA6693BC1C83731`. Résumé dérivé séparé `frame-summary.json`. Matrices non prioritaires ; prochaine ablation causale sur données d'éclairage communes et refresh réel des bindings, avant toute promotion.
