# Bilan du travail du 26 au 27 octobre 2026

Le travail de la soirée et de la nuit a livré la fiabilisation de l'interface carton, plusieurs corrections de réactivité, un aller/camp/retour réel de campagne et une optimisation du calcul de peinture. La dernière version V491 est publiée sur [Elsewhere](https://elsewhere-cq7.pages.dev/), source435f04a2/Production7c8f5074. Les six ensembles restent ouverts : cette nuit ne constitue pas leur achèvement ni une victoire jouable.

Période : depuis le 26 octobre à 18 h jusqu'au 27 octobre en fin de matinée, **heure de Paris, CET/UTC+1**. Les heures de code ci-dessous sont celles des commits ; les heures de publication viennent des contrôles HTTPS. Les états de campagne ont leurs propres heures d'acquisition.

## Changements livrés et campagne réellement jouée

| Heure de Paris | Travail | Commit et preuve |
| --- | --- | --- |
| 26/10 19:11 | Interface carton fiabilisée : clics/survols pendant l'animation, coupures et masquages ; disposition des ressources, météo, notifications et commandes ; jauges contrastées, dossier de colon stable, Architecte/Recherche, préjeu et chargement direct par carte ; curseurs beige et pictogrammes d'ordres ; échelle globale persistante 75–200 % ; caméra utilisable avec les fenêtres ouvertes. | 5de0c82b, [UI V485](native-ui-reliability-v485.md). 54 contrats ciblés et parcours sur 18 vues/six configurations d'échelle ; pas d'équivalence globale DOM/3D ou gratuité GPU prétendue. |
| 19:28 | Reprise effective des Éclaircies, préparation jouée T1782→T2010, transport et repas réellement accomplis, sauvegarde/recharge entière exacte. | 2d0f7457, [campagne V484](../gameplay/campaign-continuation-v484.md). |
| 19:44 | Infobulles auparavant interceptées par les fonds épais/inclinés ; ordre de prise en compte du fond corrigé, sans enlever sa fonction de barrière. Devis de voyage obtenu sans avancer de temps supplémentaire. | c46a7559, [survol](native-ui-reliability-v485.md#reprise-du-survol-des-textes-pendant-v484). |
| 20:07 | Fermer Options libère aussi le menu logique ; les boutons de temps ne restent plus bloqués après sa fermeture. Retour, Échap et clic extérieur, dont restauration de ×3, vérifiés. | 1c6900c2, [Options](native-ui-reliability-v485.md#fermer-les-options-libère-aussi-le-menu-logique). 20/20 vrais clics de vitesse acquis. |
| 22:03 | Premier allègement du travail avant confirmation et conversion des coûts de navigation en un passage. Microcalcul navigation environ 13,3→8,3→12,8 ms en contrôle/candidat/contrôle ; délai complet encore trop élevé. | 7436ce07, [V486](action-latency-v486.md#conversions-des-coûts-de-terrain). |
| 22:35 | Un clic de vitesse conserve le colon mobilisé sélectionné ; on peut lui donner un ordre au sol sans le resélectionner. Fermeture et désélection ordinaires préservées. | 7bcae28b, [sélection tactique](action-latency-v486.md#le-clic-vitesse-conserve-le-colon-mobilisé). |
| 23:30 | Réemploi contrôlé de la présentation naturelle entre publications du même tick lorsque ses entrées confirmées sont inchangées ; sorties et sauvegardes exactes vérifiées, voie stricte conservée. | 5ff8f300, [présentation naturelle](action-latency-v486.md#aspect-naturel-inchangé-entre-deux-publications-du-même-tick). |
| 27/10 01:20 | Borne temporelle de l'intention de pause, conservant les ticks déjà joués et les fractions pertinentes ; première qualification fonctionnelle, sans délai global résolu. | 6a1ae2e3, [intention de pause](action-latency-v486.md#borne-temporelle-de-la-demande-pause). |
| 03:42 ; publié 03:53 | Les commandes de vitesse s'appliquent entre pas complets sans rattraper préalablement l'ancienne vitesse. Dette entière non jouée abandonnée, fraction conservée ; au maximum un pas régulier par tâche du Worker existant. | 1b6a44a0, [contrat V488](action-latency-v486.md#commandes-au-point-sûr--v488), [publication V488](publication-v488.md), Production1fa8b7c5. 69 contrats ciblés ; gains bornés, pas0 ms général. |
| 04:39 ; publié 04:52 | L'écran Monde lit son état courant au clic après un export, au lieu de rester sur une ancienne valeur « occupé ». Formation réelle d'Eden et Robin, Gaël restant au foyer. | 15cc2671, [Monde V489](native-world-live-state-v489.md), [publication V489](publication-v489.md), Production956c48af. 21 contrats ciblés et sauvegarde/recharge du vrai résultat. |
| Jusqu'à environ 06:45 | Prise physique des rations, sortie, arrivée, camp, reformation, retour au foyer et dépôt effectif. Les trois originaux sont vivants ; douze rations revenues au sol et tuques toujours équipées. Dernier état exclusif94de/T3328. | [Retour acquis](../gameplay/campaign-continuation-v484.md#retour-et-dépôts-réels-acquis--t3328). Les QA des tests ne remplacent jamais cette campagne. |
| 08:29 ; publié 08:32 | Une seule source de peinture du terrain optimisée : calculs RGB et masque d'eau, sans réduction de résolution/qualité. Treize images originales exactes ; moyenne CPU du calcul local réduite d'environ 27 %, mais maxima défavorables et variations natives conservés. | 44937af7, [terrain V490](terrain-paint-cost-v490.md), [publication V490](publication-v490.md), Production9ea67eb8. |
| 11:49 ; publié 11:52 | Nouveau chemin confirmé affiché sans attendre que l'acteur rendu rejoigne son origine ; pause autoritaire reçue présentée au dernier état confirmé. Trois sources de rendu seulement, aucune règle de déplacement changée. | 435f04a2, [qualification V491](action-latency-v486.md#réactivité-visuelle-des-ordres-et-de-la-pause--v491), [publication V491](publication-v491.md), Production7c8f5074. |

Les UI V485 et corrections V486–488 ont été livrées ensemble par la publication V488. V489, V490 puis V491 les incluent. Les publications ont chacune leur contrôle d'octets et de disponibilité ; elles n'ajoutent pas une preuve de gain FPS/GPU. L'heure finale V489 retenue ici est celle de la preuve canonique, 03:52UTC/04:52Paris ; une mention historique différente ne prime pas sur ce reçu. Le premier déploiement V490 a échoué avant envoi sur un mauvais nom de projet, puis a réussi sur le projet réel elsewhere.

## Mesures les plus récentes et limites encore ouvertes

La V491 acquiert116 cas ciblés distincts par reprises ; trois anciens rouges sont reproduits avec les corps d'origine et conservés, sans prétendre une suite globale entièrement verte. Dans les quatre gestes isolés à ×1, clic→dessin CPU du bleu vaut47–75 ms, dont2,6–4,6 ms après adoption. Les trois reclics de l'ancien rendu gardaient280–367 ms au total, dont210–277 ms après adoption. Pauses isolées71/84 ms ; quatre ordres rapides puis Pause sont correctement admis et restent stables, mais cette Pause prend encore299,5 ms. L'attente avant entrée Worker observée jusqu'à 143,3 ms n'est pas corrigée par ce rendu. La reprise conserve deux ticks de réserve, environ 333 ms à×1 nominal.

Six fenêtres de cadence ×1/×3 ne montrent aucun intervalle supérieur à 50 ms et tiennent environ 6/18 TPS, avec petits écarts adverses explicités et signe variable à×3. Elles n'établissent ni coût nul, performance à×6, équivalence générale, temps GPU ni absence de cas rare. Les transitions camp/reformation de1,87/3,24 s et les pointes de changement de carte restent des défauts ouverts.

Le [rapport sur le déplacement](../gameplay/deplacement-et-redirection-20261027.md) confirme un autre phénomène, distinct des performances : finir le segment engagé avant de suivre une nouvelle route. La primaire RimWorld1.6 retrouve ce principe courant, mais une vitesse de base et un lissage différents. Aucun changement de gameplay n'a été effectué à partir de cette recherche.

## Essais écartés et préparation non livrée

- UnionMap naturel V486 : gain non établi, prototype privé écarté.
- Agenda de végétation V487 : malgré de vrais réemplois, coût combiné augmenté d'environ 33–54 % ; rejet sans installation. [Preuve](action-latency-v486.md#agenda-de-végétation-v487--prototype-écarté).
- Comparaison ResourceBase V487 : variation entre répétitions, gain non établi ; rejet sans installation. [Preuve](action-latency-v486.md#comparaisons-de-ressources-v487--gain-non-établi).
- Petit lecteur de croissance V491 : proposition privée après diagnostic, qualification suspendue, aucun gain acquis ni installation produit.
- Voie de victoire : références primaires, acquisitions physiques du cœur IA, recherches, ordinateur/capteurs, géométrie/placement, sauvegardes et autorité terminale préparés dans des propositions privées. [Point de reprise](../../tmp/victory-path-v491/progress.md). Aucune migration297, victoire jouable ou fonction terminale publiée ; trois feuilles statiques non référencées exclues du commit V491. Le commerce vivant demeure une autre piste conservée.

## Espace disque et conservation

Deux nettoyages pendant la nuit/matinée retirent uniquement des caches SSR anciens, fermés et recréables :

- 27/10 à 00:25:58Paris :28 caches,727540754 octets logiques. [Reçu](../../tmp/input-latency-v486/old-ssr-removal-20261026T232530Z/after.json).
- 27/10 à 08:47:03Paris :29autres caches,874021416 octets logiques et37842 fichiers. [Reçu](../../tmp/disk-cleanup-20261027/removal-receipt.json).

Cela représente **1601562170 octets logiques supplémentaires, environ 1,60 Go**. Ce volume supprimé ne remplace pas une mesure du gain physique exact sur le disque. Les **2821099734 octets, environ 2,82 Go**, retirés le26 avant la reprise de campagne, sont une opération antérieure distincte :19 caches, trois ZIP Git reproductibles et deux ZST redondants. Le cache récent87070746 octets retiré sur autorisation explicite est également compté séparément. [Entretien et preuves](storage-maintenance-20261026.md).

Sauvegardes, RAW, références, données récentes uniques et serveurs humains sont conservés. Les six ensembles, SYS069, durabilité, victoire et confort global restent ouverts. Après livraison du présent bilan et du rapport demandé, la poursuite autonome reprend depuis les points de reprise actuels, sans réinitialiser la vraie campagne.

## Complément du 28 octobre au soir — déplacements V492 toujours non livrés

Le travail demandé ensuite pour rapprocher les déplacements de RimWorld 1.6 reste privé. Le candidat Source12 a acquis ses huit ordres réels et la correction des pointes de rendu, mais sa dernière comparaison confirme encore 9,98 à 11,28 % de débit en moins à ×6. La dernière piste de navigation isolée ne démontre pas de gain fiable et a été écartée. Aucun code V492 n'est intégré ni publié ; le produit reste V491.

Le [bilan V492 vérifié](movement-parity-v492-status.md) donne les mesures, essais rejetés et limites, notamment les délais complets de clic et la visibilité non acquise. Les résultats passés restent conservés. À la suite de la demande humaine de délai, le contrôle courant est clos sans nouvelle série automatique ; la correction complète n'est pas déclarée terminée. L'objectif général, le heartbeat et les six ensembles restent en pause : la phrase de reprise autonome du bilan historique ci-dessus ne les réactive pas.
