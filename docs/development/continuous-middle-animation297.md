# Continuité des mouvements, rigs et effets — schéma 297

Ce lot corrige d'abord l'animation des déplacements et gestes des **colons, animaux et méchanoïdes** : leurs positions pouvaient déjà suivre le temps confirmé alors que bras, jambes et tête restaient retenus à 12 Hz. Les quatre sources de rig réutilisent le graphe GPU analytique original existant pour les moyens dynamiques ; getters, clocks et enfants portés suivent le même chemin. Le moyen réellement statique et le far gardent leur cache. [La preuve du rig](continuous-middle-rigs297.md) distingue ses contrats CPU, ses pixels et son coût GPU.

Les huit sources communes retirent ensuite les retenues temporelles identifiées dans les autres animations : feu sol/attaché, bagarre, fumée/lueur, portes, rotors, capsules, eau, arbres/plantes/herbe, nuages, Action et précipitations. Les classes near/middle/far, seuils et décisions de présence restent conservés ; ce n'est pas une désactivation globale du LOD. Aucune règle physique, vitesse de simulation, commande, RNG, sauvegarde ou schéma 297 n'est modifié par ces sources de présentation.

## Composition et comportements

La composition compte douze sources : `ActorAnimationCache`, `PawnLayer`, `WildlifeLayer`, `MechanoidLayer`, puis `FxAnimationCache`, `RetainedAnimation`, `natural-animation-cache`, `ResourceLayer`, `PlantClusterLayer`, `GpuGroundGrassLayer`, `WeatherCloudLayer` et `ActionVfxLayer`.

Les FX conservent leur membership réel mais ignorent les bakes temporels CPU moyens. Le mode continu reprend le graphe original **dès la construction de `FxAnimationCache.choose`**, sans construire la branche cachée dormante. Ce bypass V3 est épinglé par `9bc9258d8a2c22b0761404bf2a58b170d52026cd45f13937a397472b510f3831`. Action copie aussi ses flux compacts lorsqu'une vraie source change ; Brawl les copiait déjà et reste inchangé.

Portes, rotors et capsules moyens prennent leur transformée analytique, avec les coefficients far tenus. La nature conserve ses palettes et bases spatiales peu coûteuses ; seules les phases partagées et les trois vrais producteurs suivent leur horloge confirmée courante. La pause conserve les phases. Les nuages gardent leur pas de quantification de 0,02 cellule ; le recul des seuls arbres actifs suit le temps courant, avec far/rest/expiration conservés. Aucune trigonométrie near n'est généralisée à toute l'herbe ou à la forêt.

## Preuves et coûts bornés

Les rigs ont acquis **20 finalités CPU par reprises** ; le commun **10 contrats CPU et 7 finalités de maintenance** des anciennes attentes de pose tenue. Les anciens refus restent conservés. Action et le recul d'arbre avaient deux vrais RED de consommation ; le garde Brawl passait sans correctif. Ces contrôles recoupent l'intégration finale et ne s'additionnent pas à son total.

Le GPU rig compte **49 contrôles fonctionnels/pixels/fences**, distincts des compteurs. Les trois anciens refus de compteurs sont conservés ; le reçu V3 distinct acquiert neuf contrôles, trois draws par rendu et 24 UID par bras, moyennes GPU W/C/W **0,076459 / 0,068267 / 0,076459 ms**.

Le premier GPU commun reste **FAILED : 153 contrôles acquis et 5 refus de fumée**. La branche dérivée avec le bypass V3 acquiert **26 contrôles**, zéro erreur GPU et fence 2 080 sources exacte. Ce nouveau reçu ne rétrovalide pas le V1 ; les compteurs recoupés ne deviennent pas 179 contrôles distincts. Rapport : `continuous-fx-gpu-author-v2-smoke/run-v2-smoke/report.json`, SHA `e7f9dcd9d0bc801e50ef32ba8c6b630603c5b07a31cb31223c855f71bec361f7`.

Son coût commun conserve **192 UID par bras**, incluant Action et précipitations. Moyennes W/C/W en ms :

| Mesure locale | W1 | C | W2 |
|---|---:|---:|---:|
| GPU par image logique | 0,117419 | 0,103765 | 0,114688 |
| Mise à jour, temps écoulé | 0,316667 | 0,145833 | 0,208333 |
| Soumission, temps écoulé | 2,025 | 1,316667 | 1,375 |
| Maximum de soumission | 2,9 | 2,1 | 2,4 |

Ces observations bornées ne prouvent pas un gain causal ni des FPS globaux. Le trajet CPU nature/phases a aussi montré un surcoût adverse de **0,009 à 0,017 ms par image**, conservé. Le travail GPU moyen augmente quand le graphe original remplace une pose tenue ; les nuages peuvent uploader plus souvent et le recul CPU dépend des arbres effectivement frappés. Aucun coût nul, absence exhaustive de recul ou clôture de `PERF-V492-X6` n'est annoncé.

## Intégration et conservation

L'intégration ciblée finale acquiert **54 PASS, 0 FAIL, 0 pending dans 11 fichiers, 25,654 s** ; typage **21,217 s** ; PagesCODE **4,440 s**, public résolu sans recopie. Les douze sources changées sont exactes dans la carte de **2 080 sources**, SHA `e40a87806bb56f3260437ac4647a75ae6408e150ae79e1d78e20ac0248ba50bd`. Reçu : `final-continuity-validation-root-v1/report.json`.

- Native final ×1/×3/×6, pause, entrées réellement soumises, dernier entier et propre recharge : Le Native V3 a acquis les trois fenêtres de4s et les vrais rôles en marche/travail/sommeil :725/727/779soumissions à×1/×3/×6, pauses300ms exactes et propres recharges. Rapport `native-final-compact-root-v3/native-final-v3/report.json` SHA `be1869d9e3606883d919a84d7f3eaf25251c162dba77b0baf1d7da301953821c` ; qualification offline distincte `2a0e71dc1f00f522e9e1d3e493225f562e72b629a912536961063d6dfca0304b`. Ce PASS de protocole NE clôt PAS la fluidité : Noé a0pas immobile sur724/286paires en marche à×1/×3, mais83sur599 à×6, dont55 coïncident avec une horloge immobile. Le dormeur garde Y=0,5 et aucun flag de marche aux trois vitesses. La cause exacte des83arrêts reste à distinguer des attentes physiques ; la trace relève80épuisements du dernier front reçu à×6. League était actif, Firefox fermé : aucune comparaison causale de performances globales. Dernière autorité réelle : RAW `eb42e74aafd2ee5f842a8ff13047ce33997af0bb582c85e528d78cc85d3ab3b7`, gzip `0a2cd53417ffd8f8c3e644aa21d128a235beaee6451bc0b5334c870fdd41dae6`, Core112340/RNG1875334416/nextId29494, propre recharge exacte. Aucun retour à2c/af98/CPU8ab..
- Enregistrement Git/push : Les fichiers testés et leurs préimages sont consignés dans le reçu d’intégration ; commit et push sont suivis dans le checkpoint privé. Aucun déploiement déduit..

Le Native de cadrage V1 reste FAILED, zéro fenêtre/zéro Core joué ; sa mobilisation réelle a été conservée. Son entier `2c573dc8…` / gzip `42b990b2…`, Core110480, était le parent. Le V3 l’a réellement poursuivi jusqu’à112340 ; seul son export final eb42 devient désormais autorité. Aucun retour à af98 ou au fork CPU 8ab. Le dernier entier réellement exporté par cette continuation devient l'autorité de reprise, même si son harnais refuse ensuite une qualification. Les campagnes humaines et QA distinctes sont préservées.

Les pixels et timestamps GPU bornés restent distincts des soumissions CPU du Native. Trois rôles et quelques secondes ne valident pas toutes les situations du jeu ; les anomalies et limites restent documentées. Aucun nouveau déploiement Cloudflare n'est attesté ici : dernière production attestée V491. Les six ensembles/victoire restent suspendus pendant cette priorité de fluidité.

Les reçus cités sont sous `Cbase/action-fluency-20261030/whole-animation-audit-20261030`, `Cbase` désignant la racine scratch de ce chat. Cette rédaction réutilise les deux brouillons privés et les résultats clos transmis par ROOT ; aucun nouveau test, profil ou audit n'a été exécuté.

## Limite encore ouverte après le Native

L’horloge présente61/13/81pas de temps immobiles aux trois vitesses (45/5/73après200ms), sans recul temporel ni dépassement du front confirmé. Les intervalles maximaux de soumission sont54,3/56,7/55,9ms. Ce sont des observations de soumission, pas des FPS physiques ou une attribution à League. La réserve et le rythme sous arrivée irrégulière doivent encore être examinés à partir de CETTE trace ; les contrôles de rig, FX, conservation, types et construction acquis ne sont pas rejoués sans fait nouveau. Les six ensembles/victoire restent suspendus.
