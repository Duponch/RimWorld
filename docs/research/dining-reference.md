# Repas, mobilier et confort : référence vérifiée et décisions

État du 13 septembre 2026. Périmètre : RimWorld de base, repas autonomes des humains, table 1×2 et tabouret ; interprétation 3D de Lisière. Le résultat est une spécification révisable, pas une certification de parité avec toutes les versions du jeu.

## Conclusion pour le projet

Le repas doit conserver une chaîne matérielle complète : chercher l'aliment, en réserver une quantité, le rejoindre, le prélever, choisir une place, transporter la portion et l'ingérer. La recherche de siège intervient après acquisition dans la séquence observée du job. Cela exclut toute réservation distante qui remplirait directement la jauge.[^1] L'absence de table reste un cas jouable avec une conséquence distincte du confort. Un siège voisin n'accorde aucun bénéfice pendant un simple passage.

Cette recherche complète les chapitres 5, 9/10 et 14 du [corpus utilisateur](reference-adoption.md). Les besoins et effets relèvent notamment de SYS-076..080, l'inspection de UI-016/026, la continuité des actions de TEST-189 et des familles locales F1/F2/F3. Ces repères ne signifient pas que l'ensemble de ces contrats est maintenant livré.

## Niveau de preuve et divergences

Le wiki communautaire décrit les objets et leurs valeurs ; un miroir du code décompilé permet d'examiner la séquence des actions. Ce miroir constitue un indice direct de comportement, mais n'est ni une publication officielle de Ludeon ni une garantie de correspondance avec la version commerciale du joueur. Sa révision HEAD relevée est `2d508035082e7cb0c8e29e230d26bda6e546928f`. Les fichiers ont été consultés sur `master` le même jour ; le projet ne dépend pas de ce dépôt et n'en importe aucun code.

| Point contesté | Éléments consultés | Décision et confiance |
|---|---|---|
| Distance d'une table | La page Table mentionne 50 cases ; le champ de définition consulté initialise le rayon de siège à 32. Le job lit le champ de l'aliment.[^2][^3][^4] | Pas de règle universelle « 50 cases ». Rayon 32 pour notre aliment générique, valeur dans son catalogue. Fort pour la dépendance à l'aliment ; provisoire pour les futurs aliments sans leurs définitions XML. |
| Origine de la recherche | L'acquisition précède le choix de place dans le job.[^1] | Position du colon après prélèvement, pas son ancienne position lors de la décision de faim. |
| Siège orienté vers la table | Le tabouret n'a pas de contrainte d'orientation fonctionnelle ; le contrôle consulté porte sur une surface dans le voisinage cardinal.[^4][^5] | Aucune obligation de rotation du tabouret. L'acteur 3D se tourne vers le plateau. |
| Absence de chaise | Le texte général du wiki dit qu'un siège est nécessaire ; le contrôle du souvenir examine la surface adjacente dans la direction d'ingestion.[^4][^5] | Chercher un siège avec table en priorité. Manger debout déjà contre un plateau n'inflige pas automatiquement le souvenir négatif. |
| Lieu de repli | La référence cherche un emplacement debout à proximité, avec réservations et conditions locales.[^6] | Dans notre carte sans pièces, danger ou interdictions, choisir une case libre proche et reproductible. Le départage est une adaptation documentée. |

L'observation actuelle ne permet pas de valider les exceptions liées aux prisonniers, aux zones interdites, aux aliments de poche, au danger, aux traits ou aux pièces. Elles restent ouvertes ; elles ne sont pas remplacées par des constantes supposées fidèles.

## Mobilier de départ

Le tabouret occupe une case, demande 25 unités de matériau et ne nécessite ni recherche ni compétence minimale. En bois, le travail indiqué est 315 ticks originaux et son confort normal vaut 0,5.[^5] La table 1×2 demande 28 unités ; son travail de base est 750 ticks et le bois applique le facteur 0,7, soit 525.[^2] Une chaise de salle à manger demande davantage de travail et des prérequis : recherche de mobilier complexe et Construction 4. Elle n'est donc pas ajoutée comme un meuble gratuit de départ.[^7]

Lisière exprime le travail en ticks de sa journée de 6 000 ticks, contre 60 000 dans la référence temporelle retenue. Les nouveaux travaux sont arrondis au supérieur après division par dix : table 53, tabouret 32. Cette conversion conserve leur part de journée, avec un arrondi inférieur à un tick local ; elle ne prétend pas préserver les secondes réelles puisque l'horloge du prototype diffère encore. Les anciens coûts du lit et du mur restent identifiés comme non calibrés.

## Deux effets différents du repas

Le souvenir « mangé sans table » vaut −3 d'humeur, dure une journée et ne s'empile pas. Les exceptions Ascète et certains préceptes ne s'appliquent pas tant que ces systèmes ne sont pas présents.[^8] Dans Lisière, le souvenir n'apparaît qu'à l'ingestion terminée. Un nouveau repas sans table renouvelle son échéance ; un repas ultérieur avec table ne supprime pas le souvenir précédent. Depuis V64, la jauge converge vers une cible expliquée ; ce premier souvenir ne clôt toujours pas le domaine humeur. Voir la [recherche renouvelée](mood-reference.md).

Le confort est une réserve qui tend vers un plafond. Un tabouret normal fournit un plafond de 50 %, un lit normal 75 %. Être réellement en train d'utiliser le meuble est nécessaire. Les indications consultées donnent une montée de 60 points par heure et une baisse de 4 points par heure, avec seuils d'humeur à 10/60/70/80/90 %.[^9] Le code de besoin confirme une approche bornée du niveau instantané, avec paramètres de hausse/baisse portés par les définitions.[^10][^11]

Notre intégration est continue à 10 Hz, au lieu des mises à jour périodiques du jeu de référence. Les plafonds et le sens de variation sont conservés ; les définitions XML de version exacte, la qualité, les accessoires du lit et tous les autres effets d'humeur devront être revérifiés avant leur implémentation. Le tableau du wiki affiche des durées de décroissance qui ne sont pas toutes cohérentes avec son texte de 4 points/heure : ce coefficient reste signalé comme à confirmer, sans ajustement caché d'après un tableau contradictoire.

## Adaptation spatiale assumée

Le plateau est à 0,76 m, l'assise à 0,45 m et l'humain à 1,75 m. Ce sont nos proportions 3D, pas des dimensions réelles attribuées à RimWorld. La table conserve une emprise 1×2, le tabouret 1×1. La pose assise utilise cuisses et jambes articulées sur GPU ; les pieds et le bassin suivent des volumes cohérents.

**Écart de collision : la table achevée bloque actuellement le passage.** RimWorld classe la table comme traversable avec coût de chemin supplémentaire.[^2] Nous choisissons un contour physique lisible en 3D, faute d'animation de franchissement et de profil de mobilier complet. Cette différence peut changer l'accès à une pièce étroite ; elle doit être réexaminée avec portes, circulation et franchissement. V16 corrige le blocage du plan et distingue le cadre traversable avec coût : [nouvelle vérification](construction-reference.md). Le meuble achevé n'est pas présenté comme une reproduction rigoureuse de la passabilité originale.

## Vérification continue

À chaque nouvelle catégorie d'aliments : relire ses définitions, nutrition, durée d'ingestion, désir de table, rayon, préférences et restrictions. Avec les horaires et les pièces : vérifier réveils, zones autorisées, destinations socialement appropriées et effets de salle à manger. Avec les qualités : vérifier plafonds et prérequis du meuble. La [documentation d'implémentation](../development/dining.md) précise les contrats déjà exécutables ; la [validation](../development/validation.md) distingue les preuves locales des comportements seulement recherchés.

## Sources consultées

[^1]: [JobDriver_Ingest, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/JobDriver_Ingest.cs), séquence acquisition / place / ingestion. Identité commerciale de version non certifiée.
[^2]: [Table (1×2), RimWorld Wiki](https://rimworldwiki.com/wiki/Table_(1x2)), coûts, travail, passabilité et description des repas.
[^3]: [IngestibleProperties, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/IngestibleProperties.cs), valeurs par défaut et propriétés de l'aliment.
[^4]: [Toils_Ingest, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Toils_Ingest.cs), réservation de place, surface adjacente et fin d'ingestion.
[^5]: [Stool, RimWorld Wiki](https://rimworldwiki.com/wiki/Stool), coût, bois, absence de prérequis et orientation.
[^6]: [RCellFinder, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/RCellFinder.cs), recherche d'une place debout pour manger.
[^7]: [Dining chair, RimWorld Wiki](https://rimworldwiki.com/wiki/Dining_chair), prérequis de fabrication.
[^8]: [Thoughts, RimWorld Wiki](https://rimworldwiki.com/wiki/Thoughts), Ate without table : effet, durée, empilement et exceptions.
[^9]: [Comfort, RimWorld Wiki](https://rimworldwiki.com/wiki/Comfort), niveaux, variations, utilisation effective et seuils.
[^10]: [Need_Comfort, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Need_Comfort.cs), niveau instantané et catégories.
[^11]: [Need_Seeker, miroir du code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Need_Seeker.cs), convergence vers le niveau instantané.
