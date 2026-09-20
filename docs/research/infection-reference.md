# Infection de plaie : référence retenue V81

20 septembre 2026. Cette recherche confronte le corpus et les sources publiques ; elle ne certifie pas une parité avec chaque correctif commercial actuel. [Contrat local](../development/infections.md).

## Provenance, versions et décisions

Corpus HTML chapitres 8/9, 15, 23 et 32 ; XLSX SYS/TEST-089 à 094 et 096. Adopter infection localisée, progression/immunité distinctes, soins physiques renouvelés et issue irréversible ; adapter horloge, quantification, PRNG et géométrie des pièces. SYS/TEST-095 chirurgie et 097 traitement des corps humains restent différés. Les statuts de référence ne valent pas validation locale.

Sources relues pour ce lot :

- [Infection](https://rimworldwiki.com/wiki/Infection), révision exposée 183215 ; [Immunity Gain Speed](https://rimworldwiki.com/wiki/Immunity_Gain_Speed), révision 182919. Les tables recoupent maladie et besoins, mais le premier article diverge du code sur l'acquisition et le second signale son ordre des opérations incomplet.
- [Miroir Chillu1 au commit 2d508035](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), **20 mai 2026**, libellé `v1.6.9438.38202 update, block namespaces`. Ce libellé d'assemblage n'identifie pas sûrement le patch commercial. Classes d'infection, immunité, traitements et statistiques relues ; classes de pièce/propreté et HealthAIUtility téléchargées à nouveau le 20 septembre.
- [Définitions Core au commit 85954e64](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e), **7 septembre 2018**, `0.19.2009 rev486`. Les XML des maladies, blessures, sols et pièces sont historiques. Leur téléchargement récent ne les rend pas actuels. Une recherche ciblée n'a pas établi de jeu complet de définitions 1.6 actuel et vérifiable ; nous retenons les coefficients recoupés et explicitons ceux dépendant encore de ce XML.
- [Ludeon, annonce 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), 11 juin 2025 : transmission de scaria par blessure, système distinct. [Correctif 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), 8 juin 2026 : plus récent que le miroir ; aucune modification de l'infection ordinaire listée, sans constituer une preuve d'équivalence exhaustive.

**Décision :** branches explicites du code daté pour les mécanismes ; coefficients XML historiques recoupés lorsque possible par le wiki. Les différences et données non disponibles ne sont pas masquées par une annonce de conformité totale.

## Acquisition et localisation

[HediffComp_Infecter](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/HediffComp_Infecter.cs) opère en deux étapes. Une nouvelle blessure admissible tire sa candidature puis son délai ; une seconde décision à échéance utilise la gravité restante et le traitement. Aucun tirage de remplacement à chaque tick ou chargement.

La lésion ne peut être permanente lors de sa création, portée par une partie solide ou artificielle. Les [XML des blessures](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/HediffDefs/Hediffs_Local_Injuries.xml) donnent morsure 30 %, balle/coupure/Crush 15 %. Contusion, fissure et entaille chirurgicale ne portent pas ce composant. Le lièvre sauvage utilise le facteur animal **0,1** du code. Le critère n'est pas simplement « saigne ».

Le délai est compris entre **15 000 et 45 000 Core**, entier. À échéance, la gravité actuelle suit la courbe `(1 PV, 0,1)` → `(12 PV, 1)`. Si la plaie a été soignée : facteur de pièce capturé au soin et courbe de qualité `(0 %, 0,7)` → `(100 %, 0,4)`, bornée aux extrémités. Le facteur de difficulté joueur est explicitement **1** dans Lisière tant que les difficultés ne sont pas livrées.

Le wiki affiche encore un facteur animal 0,2 et une courbe de soin 0,85→0,05 ; son historique indique pourtant le passage animal à 0,1. Ces chiffres ne sont pas utilisés : la branche de code datée et lisible prime ici. La gravité au déclenchement n'est pas remplacée par la gravité initiale.

Une lésion guérie avant échéance perd son risque. En revanche, devenir cicatrice après création ne réinitialise ni ne supprime automatiquement l'échéance : le contrôle final ne répète pas le test initial de permanence. Fusionner une blessure ne réarme pas son composant. Une partie perdue retire les conditions attachées à son sous-arbre, sans inventer une chirurgie.

[ImmunityHandler](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ImmunityHandler.cs) empêche un deuxième cas de la même maladie sur une partie déjà atteinte. Son facteur de contraction décroît jusqu'à zéro vers 60 % d'immunité ; Infecter ne l'emploie que comme garde `<=0,001`, pas comme multiplicateur continu supplémentaire. Le seuil retenu est donc 59,94 %. Une infection déjà née demeure après guérison de sa plaie initiale.

## Gravité, immunité et physiologie

[WoundInfection dans le XML historique](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/HediffDefs/Hediffs_Local_Infections.xml), recoupé par les tables wiki : gravité initiale 0,001, mort à 1 ; progression non immune +0,84/jour ; soin actif −0,53×qualité/jour ; récupération immune −0,70/jour ; immunité malade +0,6441/jour, puis perte de −0,40/jour après disparition de toutes les infections. Le traitement encore actif s'ajoute à la récupération après immunité.

[HediffComp_SeverityModifierBase](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/HediffComp_SeverityModifierBase.cs) applique les changements de gravité tous les 200 Core. [Pawn_HealthTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Pawn_HealthTracker.cs) traite la santé avant l'immunité : atteindre la gravité létale ne doit pas être annulé rétroactivement par le gain d'immunité du même intervalle. Lisière observe ces phases sur sa grille de dix Core par tick, sans annoncer une identité de phase moteur.

| Gravité | Effets additionnels retenus |
|---|---|
| <0,33 | Douleur +0,05 |
| 0,33 à <0,78 | Douleur +0,08 |
| 0,78 à <0,87 | Douleur +0,12, conscience −0,05 ; maladie menaçante |
| ≥0,87 | Douleur +0,85, conscience plafonnée à0,10, respiration −0,05 |

Ces effets ne soustraient pas de PV à la partie. L'immunité totale empêche de nouveaux soins, mais ne supprime instantanément ni maladie ni symptômes.

[ImmunityRecord](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ImmunityRecord.cs) partage l'immunité par définition entre toutes les parties atteintes. Un facteur stable 0,8–1,2 dépend de la première condition active et du monde ; retirer cette première condition peut changer le facteur commun. Notre hash privé et la valeur persistée par identité remplacent le réensemencement temporaire du PRNG Core. Un soin ou un rechargement ne retire pas une nouvelle chance.

Les [statistiques historiques](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Stats/Stats_Pawns_General.xml), `StatPart_*` et les classes des besoins datées justifient : filtration `0,5+0,5×capacité` ; faim <12 % humaine / <18 % du lièvre ×0,9 et nulle ×0,7 ; repos <28 % ×0,96, <14 % ×0,92, <1 % ×0,8. Usage réel d'un lit ordinaire ×1,07, posture de repos admissible ×1,1. Être porté ou seulement à terre sans lit n'accorde pas automatiquement ces bonus. Âge absent : profil adulte neutre explicite. [RaceProperties](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/RaceProperties.cs) et Need_Food fixent le seuil urgent à0,4×le seuil de recherche de nourriture :0,30 chez l'omnivore humain,0,45 chez le lièvre herbivore ; ne pas imposer12 % à toute espèce. Aucun multiplicateur direct de température n'est ajouté à l'infection ; les effets thermiques passent par les systèmes corporels existants.

## Traitements, classement et repos

[HediffComp_TendDuration](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/HediffComp_TendDuration.cs) ajoute trois heures de chevauchement aux douze heures nominales : **37 500 Core** de bénéfice. Renouveler devient possible quand le restant est **strictement inférieur à7 500 Core**. Le nouveau traitement ajoute37 500 au restant positif ; il ne réinitialise pas simplement un chronomètre. Sa qualité remplace celle du traitement précédent.

[Hediff.TendPriority](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Hediff.cs) prend le maximum entre menace vitale1, saignement×1,5 et bénéfice de soin0,025. **WoundInfection n'est menaçante qu'à partir de0,78 dans le XML**, pas dès sa naissance. La gravité départage ensuite. [TendUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/TendUtility.cs) regroupe seulement les blessures dans les vingt PV d'une dose ; une infection constitue sa propre opération. Les milli-PV des lésions et milliardièmes de maladie doivent être ramenés à la même unité de comparaison, sans convertir une infection en PV anatomiques.

[HealthAIUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/HealthAIUtility.cs), retéléchargé pour ce lot, maintient le repos si une maladie immunisable n'est **pas encore immune**, même lorsqu'aucun soin n'est renouvelable. Après immunité complète, les symptômes résiduels ne suffisent plus seuls à imposer Repos au lit ; les incapacités et blessures gardent leurs propres règles. La branche urgente du travail soignant reste fondée sur la mort estimée par hémorragie avant45 000 Core : aucune nouvelle interruption globale n'est déduite du mot « infection ».

## Pièce : résultat de la recherche manquante

[RoomStatWorker_Cleanliness](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/RoomStatWorker_Cleanliness.cs) somme la propreté de chaque terrain de la pièce, plus celle des bâtiments/objets/plantes/saletés contenus ou adjacents (quantité de pile incluse), puis divise par le nombre de cellules. Les personnes ne sont pas une contribution directe. Les objets sont dédupliqués par identité, même si plusieurs régions les recensent. Les cellules de porte appartiennent à leur espace séparé : leur terrain ne s'ajoute pas à la pièce adjacente.

[Room.GetStat / ProperRoom](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Room.cs) applique le score sans pièce si la zone touche le bord, n'a aucune région normale ou dépasse60 régions. **Le toit n'est pas un critère de ProperRoom** : une cour fermée non couverte peut avoir une propreté de pièce. Le seuil thermique de25 % découvert ou le rôle Chambre ne doivent donc pas être substitués à cette règle.

[RoomStats historique](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/Rooms/RoomStats.xml) transforme propreté −5→facteur1, 0→0,5, 1→0,2 ; sans pièce :1. [Terrain_Natural](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/TerrainDefs/Terrain_Natural.xml) donne −1 aux sols ordinaires, −2 à la boue. La [table Rooms actuelle](https://rimworldwiki.com/wiki/Room_stats#Cleanliness) recoupe −1 des surfaces naturelles ordinaires et0 du sol rocheux. [Terrain_Water](https://github.com/RimWorld-zh/RimWorld-Core/blob/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/TerrainDefs/Terrain_Water.xml), relu séparément : l'eau ordinaire n'a aucun offset de propreté (0), contrairement au marais−2. La généralisation « tout terrain naturel vaut−1 » est donc rejetée. Aucun sol stérile fictif n'est déduit d'un lit ou d'un toit.

**Adoption bornée V81 :** moyenne des terrains réellement livrés, pierre découverte/eau0 ; terre/herbe−1 ; facteur1000 hors composante fermée ou sur porte, sinon courbe arrondie au millième. RoomTopology existante fournit les limites sans dépendre du toit. Capture uniquement à l'achèvement du soin de la plaie, au lieu du patient ; déplacer ensuite le patient, refaire son sol ou ouvrir un mur ne change pas cette capture.

**Écarts explicites :** contributions d'objets (dont fragments/ateliers déjà présents), saletés/nettoyage et planchers ne sont pas encore branchés à ce score terrain ; les régions propriétaires Core n'existent pas, donc le cutoff de60 régions n'est pas transposé arbitrairement en cellules. Ce n'est pas un système général de propreté, et la recherche conserve encore son ancienne approximation intérieure annoncée. Cette dette est identifiée pour le futur domaine des pièces, sans créer un nettoyage invisible dans ce lot.
