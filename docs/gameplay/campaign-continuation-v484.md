# Continuation des Éclaircies — V484

**Préparation réellement jouée le 26 octobre 2026 ; voyage non engagé.** Cette reprise fait avancer les six ensembles après l’[UI V485 enregistrée](../development/native-ui-reliability-v485.md). Elle ne crée aucune mécanique ni migration supplémentaire : schéma 296, production295 inchangée, tous ensembles/SYS069/campagne/victoire/confort global ouverts.

## Chaîne conservée

L’entrée est la vraie sauvegarde entière des Éclaircies V480, au tick1782, avec les personnes originales7/8/9 et une géographie3. Elle provient d’une colonie initialement préparée, déclarée comme telle ; les bâtiments et stocks initiaux ne deviennent pas une production jouée par cette reprise. Aucun acteur, terrain, soin, inventaire ou trajet n’est injecté.

Après le commit UI `5de0c82b`, le [précontrôle frais](../../tmp/campaign-continuation-v484/preflight-2026-10-26T18-12-46.013Z-6212/report.json) passe en **12,826 s** : admission normale de la campagne, migration de numéro seule293→296, originaux authentifiés. Le [parcours natif de préparation](../../tmp/campaign-continuation-v484/native-prepare-2026-10-26T18-14-45.549Z-2112/report.json) passe en **97,061 s**, avec 2 056 entrées de sources/pilote inchangées.

La permission de la seule pile37557 de dix rations est donnée par sa vraie interface. Le temps est lancé à vitesse1 par le bouton natif, puis arrêté lorsque Eden8 et Robin9 sont réellement admissibles et que Robin a terminé son transport et son besoin physique. **228 ticks sont joués, de1782 à2010**, sous la limite de600. Robin mange une ration ; le total fini passe67→66, avec20rations autorisées et46interdites. Les besoins, tâches, positions, XP et RNG évoluent normalement ; aucune comparaison ne les présente comme immobiles.

Les originaux7/8/9 restent vivants sur le foyer, sans groupe formé. Robin est au repos d’activité et rassasié ; les choix préparatoires8+9 sont disponibles dans le lecteur réellement utilisé par le panneau. Cela ne constitue pas une autorisation de départ ni une preuve de coût/autonomie du futur trajet.

## Nouveau checkpoint autoritatif

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
