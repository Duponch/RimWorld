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


## Première prise physique — 27octobre, T2239

Après la formation acceptée et le commitV489 `15cc2671`, le parcours natif de première prise passe92,327s depuis le dernier entier réel683e, sans nouvelle formation ni modification des acteurs. Il joue229ticks, deT2010 àT2239. La première prise publiée est observée àT2237 : Eden8 porte désormais la pile37960 de6rations, propriétaire `inventory8`, tandis que la source37557 conserve4rations. Le groupe1 est `loading`, curseur1, origine/localMap0 ; Robin9 poursuit la seconde prise, encore non acquise. Gaël7 reste au foyer, faim31,12. **Aucun départ n’est encore acquis.**

Continuer exclusivement depuis [after-first-pickup-segment-ACTUAL.json.gz](../../tmp/campaign-continuation-v484/native-first-pickup-2026-10-27T03-49-20.088Z-25704/after-first-pickup-segment-ACTUAL.json.gz) : RAW14 539 671octets, SHA256 `404790109279f8c6d9a7352b8480818f115dc2366d003cca2f50c4e5bb69ca2d` ; gzip2 877 433octets, SHA256 `6af6128f3f7c4a43e59653414118c1705db25734412118d7203673aa3a1de2c6`. Roundtrip et propre recharge/réexport entier exacts, T2239/RNG3044753497. Le [rapport](../../tmp/campaign-continuation-v484/native-first-pickup-2026-10-27T03-49-20.088Z-25704/report.json), SHA256 `03d8f83717a4cc9a2802a544677ac8b6cc83218c79eb529461bfa8bb72fcf379`, conserve les conséquences réelles et les sources exactes2064. Ne plus chargerT2010/683e, D234 ou1782 pour poursuivre.

La fenêtre jouée avantPause couvre37,8654s et227ticks livrés MAIN, soit5,9949TPS livrés. Cadence CPU153,412/s, p99 MAIN22,3ms, maximum53,3ms ; six intervalles>33,4ms, un>50ms et aucun>100ms dans cette fenêtre. Ces observations n’établissent ni débit autoritatif Worker, ni FPS physique/GPU, ni gain causal. Les deux ticks de frange et l’activationPause conservée dans trace/actions ne doivent pas être attribués à un délai Worker seul ; le champ résumé de pause est réécrit par `finally/alreadyPaused`.

Suite bornée : depuis cet entier courant, continuer×1 jusqu’au vrai transfert local→groupe mondial, ou60s/360ticks/réserve85s, sans arrêt par pile, nouvelle route, formation ou `group-select` injecté. Pause, export actuel et recharge de ce seul export ; conserver pertes, incidents, besoins et tout temps réellement joué. Une prise ne vaut ni sortie, ni voyage/camp/retour. [PublicationV489](../development/publication-v489.md) acquise séparément, sans ajout de cet état privé au catalogue. Six ensembles et réarbitrage après trajet restent ouverts.


## Sortie physique puis arrivée39971 — 27 octobre

Le premier parcours vers la sortie atteint sa borne de60s àT2601, sans départ : son [rapport conservé](../../tmp/campaign-continuation-v484/native-local-departure-2026-10-27T04-01-53.014Z-19580/report.json) reste « stopped-before-departure-current-preserved », wrapper2 en115,862s. Les deux portions37960/37963 de6rations sont alors portées et les colons marchent vers les bords. La reprise charge ce seul entier90c3, jamais la formation initiale. Le [parcours suivant](../../tmp/campaign-continuation-v484/native-local-departure-2026-10-27T04-07-12.560Z-29544/report.json) passe91,149s : vrai transfert àT2809, état conservéT2811. Eden8 etRobin9 sont désormais dans les members mondiaux avec leurs deux tuques et douze rations ; ils sont absents de la carte0, où Gaël7 poursuit ses besoins et tâches. Baselinefood12 et ledgerfoodLoaded12 sont acquis par le vrai départ.

Le [voyage réel](../../tmp/campaign-continuation-v484/native-world-arrival-2026-10-27T04-15-25.760Z-17516/report.json) passe97,648s. Le segment effectivement adopté coûte2576Core, pas l’ancien devis2666 imposé après coup. L’arrivée est publiée àT3070 : tile=destination39971, segmentnull, phaseat-site, permissionCamp{ok:true}, aucun pending de rencontre ou d’entrée. Les douze rations, les deux tuques et les mêmes personnes subsistent ; Gaël reste sur0. L’entréeCamp n’est pas acquise par cette permission.

**Dernière autorité à cette étape :** [after-world-arrival-segment-ACTUAL.json.gz](../../tmp/campaign-continuation-v484/native-world-arrival-2026-10-27T04-15-25.760Z-17516/after-world-arrival-segment-ACTUAL.json.gz), T3072/RNG2850743949. RAW14 524 429B/SHA2569a9470c05ee8c2e8e11c77a9cf0aa333bf6c33cfc79307d678da14aebe243cbd ; gzip2 877 469B/SHA256b2659c315ebdd9f78b77f20c864b881654cce4ab7806564736d5fdd448700bf3. Roundtrip et propre recharge/réexport exacts. Rapport SHA256f2b5c49fd9aea40cd92e347f35b521e1e04027a3a833f52b00fc1b86a6611be7,2064entrées inchangées, erreurs0. Ne plus charger8f67/90c3/4047/683e/D234/1782 pour poursuivre après cette avance.

Les trois fenêtres jouées avantPause donnent respectivement5,989/5,989/5,975TPS livrés MAIN ; cadence CPU154,7/154,7/156,5 par seconde, maxima MAIN38/46,3/38,1ms et aucun gap>50ms dans ces seules fenêtres. Elles ne mesurent ni TPS autoritatif Worker, ni FPS physique/GPU, ni gain comparatif ou absence de pointes rares. Les qualifications globales V488 et la pointe380ms V489 antérieure restent séparées.

Les stocks globaux àT2811 totalisent64rations contre66 àT2010 : douze sont dans le groupe. Le repas de Gaël àT2518 est journalisé ; l’autre unité concorde avec le compteur animal eatenItems1→2 et la pile37559quantité9→8, restée interdite. Le [recoupement privé](../../tmp/campaign-continuation-v484/rations-animal-reconciliation-v489.md) conserve la limite : identité et instant du consommateur non capturés. Aucune permission, ration ou personne n’est restaurée pour rendre le parcours favorable. Prochaine frontière : vraie entréeCamp200², puis usage/retour ou pertes, avant réarbitrage des six ensembles.
