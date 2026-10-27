# Continuation des Éclaircies — V484

**Formation réellement acceptée le27octobre2026, encore en pause avant chargement et sortie.** Cette reprise fait avancer les six ensembles après les corrections UI et [V488 publiée](../development/publication-v488.md). Schéma296 inchangé ; tous ensembles/SYS069/campagne/victoire/confort global ouverts. Les sections de préparation ci-dessous sont historiques ; le checkpoint courant est celui de la formation.

## Formation réelle en pause — 27octobre

La reprise échoue d'abord après un vrai clic de formation : le modèle du Monde conserve busy pendant un export terminé. L'[échec et son état actuel](../../tmp/campaign-continuation-v484/native-form-paused-current-2026-10-27T03-03-57.719Z-27920/report.json) sont conservés, avec export/recharge entier D234 exact, sans groupe ni tick. Le [correctif V489](../development/native-world-live-state-v489.md) lit l'état courant au clic sans retirer les gardes.

Le [nouveau parcours](../../tmp/campaign-continuation-v484/native-form-paused-candidate-v489-2026-10-27T03-29-01.294Z-12080/report.json) passe74,226s depuis ce dernier export actuel. Il choisit Eden8 et Robin9, laisse Gaël7 au foyer, reprend6rations de37557 et6de37876 vers39971. La confirmation entière, capacité et seul avertissement short-food correspondent au devis déjà lu. Après l'export qui reproduisait le défaut, un vrai clic3D aboutit au **groupe1, phasegathering**, origine0/localMap0, membres8/9, manifeste6+6/porteurs8/9, sanscarriedPileId. Tick2010, RNG3536162670 et nextId37959 sont constatés. Aucun chargement, sortie ou voyage n'est encore joué.

**Continuer exclusivement depuis [after-formation-attempt-ACTUAL.json.gz](../../tmp/campaign-continuation-v484/native-form-paused-candidate-v489-2026-10-27T03-29-01.294Z-12080/after-formation-attempt-ACTUAL.json.gz)** : RAW14 548 757octets, SHA`683e620a2ffa637fdec3306ca17a2af8a881fe3aa2f4b7068fa2734be5678086` ; gzip2 878 381octets, SHA`c4aef72c286070303fb5be2cda831b7a4ef56becbe23611340addef7cb275f44`. Aller-retour lossless et vraie recharge/réexport entier exact acquis. L'ancien D234 est désormais une préhistoire, pas un point de reprise ; ne pas reformer le groupe ni effacer cette acceptation.

Prochain segment : vrai×1 jusqu'à une première prise physique confirmée par carriedPileId et propriétaire d'inventaire, ou une borne courte, puis pause et nouvel entier réel. Le groupe accepté ne prouve pas une prise. Conserver faim, activité et repas réels de Gaël, les quantités finies, acteurs et conséquences. Le [Wiki RimWorld](https://rimworldwiki.com/wiki/Caravan) distingue sélection, rassemblement/chargement et sortie : ces frontières seront acquises séparément, sans destination ou camp offert. Les observations de cadence en pause et la pointe de préservation post-adoption sont détaillées dans V489, sans nouveau gain FPS/TPS.

## Chaîne conservée

L’entrée est la vraie sauvegarde entière des Éclaircies V480, au tick1782, avec les personnes originales7/8/9 et une géographie3. Elle provient d’une colonie initialement préparée, déclarée comme telle ; les bâtiments et stocks initiaux ne deviennent pas une production jouée par cette reprise. Aucun acteur, terrain, soin, inventaire ou trajet n’est injecté.

Après le commit UI `5de0c82b`, le [précontrôle frais](../../tmp/campaign-continuation-v484/preflight-2026-10-26T18-12-46.013Z-6212/report.json) passe en **12,826 s** : admission normale de la campagne, migration de numéro seule293→296, originaux authentifiés. Le [parcours natif de préparation](../../tmp/campaign-continuation-v484/native-prepare-2026-10-26T18-14-45.549Z-2112/report.json) passe en **97,061 s**, avec 2 056 entrées de sources/pilote inchangées.

La permission de la seule pile37557 de dix rations est donnée par sa vraie interface. Le temps est lancé à vitesse1 par le bouton natif, puis arrêté lorsque Eden8 et Robin9 sont réellement admissibles et que Robin a terminé son transport et son besoin physique. **228 ticks sont joués, de1782 à2010**, sous la limite de600. Robin mange une ration ; le total fini passe67→66, avec20rations autorisées et46interdites. Les besoins, tâches, positions, XP et RNG évoluent normalement ; aucune comparaison ne les présente comme immobiles.

Les originaux7/8/9 restent vivants sur le foyer, sans groupe formé. Robin est au repos d’activité et rassasié ; les choix préparatoires8+9 sont disponibles dans le lecteur réellement utilisé par le panneau. Cela ne constitue pas une autorisation de départ ni une preuve de coût/autonomie du futur trajet.

## Checkpoint historique de préparation

Continuer désormais depuis [actual-preparation-paused.json.gz](../../tmp/campaign-continuation-v484/native-prepare-2026-10-26T18-14-45.549Z-2112/actual-preparation-paused.json.gz), **tick2010** :

- Entier décompressé :14 547 059octets, SHA256 `d2340630be2cdd5c560ed300014e45310b424fd51e0fe32fa211578d706aa332`.
- Gzip stocké :2 877 576octets, SHA256 `8347d0204b532475ad06396b8fd8d724e6e5b9153dc8090036df7bf6f4758c25`.
- Aller-retour stocké puis vraie recharge GameSession et réexport entier exact acquis ; RNG final3536162670. Originaux antérieurs préservés.

**Ne pas rejouer la préparation depuis1782 pour obtenir un état favorable.** Le nouveau pilote de devis doit authentifier ce checkpoint2010, laisser sa permission déjà acquise intacte et conserver exactement l’export entier pendant le brouillon.

Prochaine étape : choisir par l’interface Eden8+Robin9, laisser Gaël7 au foyer, vérifier les disponibilités actuelles pour douze rations et demander le devis vers39971. Lire réellement capacité, autonomie, route et avertissements **avant** `group-start`. Aucun départ, camp, retour, perte ou victoire n’est acquis ici. Aucun gain FPS ni cadence de jeu n’est déduit de ce parcours instrumenté.

## Devis réellement acquis après correction du survol

La première lecture native échoue61,212s sur un véritable défaut de plan d'infobulle sous le carton ; l'entier2010 reste exact et l'échec est conservé. Le [correctif ciblé de détection](../development/native-ui-reliability-v485.md#reprise-du-survol-des-textes-pendant-v484) ne change aucun mécanisme de campagne. Le [nouveau devis natif](../../tmp/campaign-continuation-v484/native-preview-prepared-2026-10-26T18-40-21.384Z-17732/report.json) passe55,412s, avec deux exports entiers exactement égaux au checkpoint2010, sans nouvelle permission ni temps joué.

ROOT lit la confirmation réelle : Eden8 et Robin9, Gaël7 restant au foyer ; route0→39971, deux tuiles forêt tempérée/terrain plat ;12rations,6de37557 attribuées à8 et6de37876 à9. Charge3,74kg/70kg,1,87kg/35kg par porteur ; autonomie alimentaire3,45jours, cueillette0,45nutrition/jour et conservation600jours. Le seul avertissement affiché est **moins de cinq jours de nourriture estimés**. Ce devis et cet avertissement sont conservés tels quels ; ils ne constituent pas encore un départ ni une garantie de durée du chargement ou du camp.

Avant tout engagement, rapprocher le coût réel de l'arête, la réserve alimentaire de Gaël et la marge du court aller/camp/retour. Si l'engagement est retenu, sauver après sa réponse puis jouer réellement les contacts et départs ; conserver le dernier état effectivement joué à chaque frontière. L'automatisation de poursuite de ce même chat est active selon la demande humaine de continuer sans relance ; le checkpoint privé courant reste la source de reprise.
