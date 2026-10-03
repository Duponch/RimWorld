# Secours d'un naufragé civil — V187

## Décision et limites

Lot livré dans le périmètre de la [preuve ciblée](../history/validation-pod-rescue-v187.md). Une capsule civile neutre donne au joueur le choix d'un secours physique, consommant un couchage, du temps médical et éventuellement nourriture/médicaments. Le naufragé reste extérieur à la colonie. Sa récupération et son départ ne valent pas recrutement, réputation ou succès exhaustif du système de quêtes Core. [Recherche](../research/pod-rescue-core-v187.md), [secours](rescue.md), [traitement](tending.md), [alimentation](feeding.md), [visiteurs](visitors.md).

Le ticket Misc de 1,5 conserve l'enveloppe locale 16,9 : les incidents absents ne deviennent pas des capsules. Le producteur restreint les factions à un civil `outlanders`, adaptation prospective explicitement distincte de Core. Une capsule descend en coordonnées monde durant six ticks locaux, attend quatre ticks puis ouvre ; ces durées et la production du Pawn à l'ouverture sont une adaptation 3D, pas des délais Core vérifiés. L'arrivée et ses tirages privés restent persistés ; aucun occupant ne peut être traité avant ouverture. Un emplacement devenu inadmissible ou une capacité saturée ne crée ni identité, objet ni progression fictive.

## Accueil et service

Une véritable incapacité médicale accompagne la personne, avec sa propre identité et sa chemise. Le secours automatique ne s'étend pas aux étrangers non accueillis. L'ordre forcé par clic droit utilise réservation, approche, prise, même arête porteur/patient et dépôt V46. **Seul le dépôt réel au lit** accorde `admittedAt` ; ni `bedId`, un ordre accepté, un pickup ni un transport interrompu ne constituent l'accueil.

Les soins et l'alimentation assistée n'acceptent ce civil qu'après accueil et installation physique. `isColonist` et le prédicat général des patients coloniaux restent inchangés ; une éligibilité médicale ciblée suffit. Les étrangers actuels sans provenance capsule ne changent pas de rôle. Le naufragé ne reçoit aucun travail colonial, mobilisation, inventaire contrôlable ou auto-soin ; le plafond médical et le régime peuvent être réglés seulement après accueil, sans autorité de travail.

La marche autonome utilise la vitesse humaine locale commune, sans prétendre reproduire exactement l’allure Walk Core. Le repos médical continue après relèvement tant que les conditions existantes l'exigent. Ingestion, dose, tend et guérison restent de vraies transitions communes. Le devenir distingue premier traitement réussi, décès et départ vivant ; une notification de soin n'efface pas la personne. Un patient enfermé attend un accès physique. Au départ, arête, repas, cargaison et récupération sont achevés ; Pawn et possessions restantes quittent ensemble la carte, une seule fois, dans un registre figé au tick de sortie. La borne locale de trente-deux dossiers refuse de nouvelles capsules ensuite et ne détruit aucune archive pour libérer un ID.

## Sauvegarde, rendu et validation

Schéma **175**, validation stricte de **174 avant migration neutre**, sans capsule, invité, soins, ressource, calendrier ou tirage rétrospectif. Intentions de chute/ouverture, provenance et accueil, résultat et possessions archivées sont validés avec leurs horloges et le registre global des identités. Un delta incohérent est refusé sans remplacer le World courant.

Un lot graphique résident borné présente la capsule ; matrices et géométrie ne sont pas reconstruites par image. La chute suit l'horloge confirmée, pause et reprise incluses. Les personnes, portages et effets médicaux réutilisent les lots existants. Préparation des matériaux/ombres obligatoire ; aucun coût GPU nul annoncé.

Contrôles ciblés : admission avant/après dépôt, refus des autres étrangers et des commandes coloniales, approche/portage interrompu, concurrence et accès, nourriture/doses consommées, repos après récupération, sortie fermée puis ouverte, identity/ownership exacts et archivage, migration/corruption/delta, reprise de chaque phase. Une colonie publique préparée et un parcours natif doivent rendre prise/dépôt/soin observables ; présentation requise. La preuve consigne les exécutions et les corrections d’oracles séparément ; régression exhaustive, campagnes naturelles longues et coût GPU isolé ne sont pas établis.

Les possessions arrivées dans ce lot sont la chemise existante. Aucun inventaire de provisions ni meuble transporté par le civil n’est créé. Le régime archivé conserve son ID historique alloué même si la politique active est ensuite supprimée ; la projection de validation n’en restaure aucun contenu ni autorité sur la carte. L’attente d’ouverture contrôle une cellule directement et ne reconstruit pas la grille de navigation chaque tick.
