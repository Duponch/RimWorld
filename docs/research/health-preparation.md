# Santé : préparation, non implémentée

Lecture du 16 septembre 2026, pendant la validation UI de V43. Ce document prépare la prochaine entrée de la [ROADMAP](../ROADMAP.md) ; il ne constitue ni contrat livré ni preuve de tests.

## Corpus et intention

Chapitre 15 : corps hiérarchique, organes, capacités dérivées, douleur/saignement, traitements physiques, état à terre distinct de mort. Chapitre 13 : race/corps différents du profil et des compétences. SYS-081..097 doit être redécoupé au domaine exact lors du prochain lot, plutôt que marqué complet globalement.

Le prochain contrat doit préserver l'identité, les blessures localisées et les conséquences sur travail/marche. Soins et équipement suivront sans remplacement par une jauge globale générique. Définir les transitions de tâches, réservations et cargaisons avant de rendre un acteur indisponible. Une blessure en fixture peut vérifier une frontière ; elle ne livre pas implicitement un incident, un combat ou un soin jouable.

## Sources fraîchement relues

- [Présentation officielle](https://rimworldgame.com/) : lésions par partie et capacités affectées.
- [Health](https://rimworldwiki.com/wiki/Health), [Body Parts](https://rimworldwiki.com/wiki/Body_Parts), [Pain](https://rimworldwiki.com/wiki/Pain), [Consciousness](https://rimworldwiki.com/wiki/Consciousness). Les pages générales contiennent des divergences de formulation ; privilégier les pages spécialisées et vérifier contre les programmes/définitions d'une version identifiée.
- Miroir épinglé `2d508035082e7cb0c8e29e230d26bda6e546928f` : [Pawn_HealthTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Pawn_HealthTracker.cs), [PawnCapacityUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/PawnCapacityUtility.cs), [Hediff_Injury](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Hediff_Injury.cs), [Hediff_MissingPart](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Hediff_MissingPart.cs).
- Capacités du même miroir : [Moving](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PawnCapacityWorker_Moving.cs), [Manipulation](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PawnCapacityWorker_Manipulation.cs), [Consciousness](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PawnCapacityWorker_Consciousness.cs).

## Points à ne pas manquer

Le code de conscience **soustrait** le malus de douleur à l'efficacité cérébrale avant les facteurs circulatoires ; la formule multiplicative de la page Health n'est donc pas interchangeable pour un cerveau lésé. Une simple reprise du résumé wiki introduirait une erreur. Le code ignore un malus calculé inférieur à 0,01 ; vérifier les arrondis et seuils dans le futur oracle.

Moving combine membres, bassin, colonne, respiration, circulation et conscience plafonnée à 1. Il vérifie aussi la proportion de membres fonctionnels. Manipulation possède un autre poids pour les doigts et utilise la conscience sans ce même plafonnement. Les identifiants de parties doivent être stables et distinguer les côtés, pas simplement des noms traduits.

`ShouldBeDowned` consulte choc douloureux, capacité d'éveil et mobilité. La mort consulte notamment états létaux, capacités vitales, racine corporelle et seuil cumulé de blessures. Ne pas déduire une mort automatique du seul état à terre. Certains comportements dépendent de faction/difficulté et restent à investiguer.

**Vérifications restantes avant code :** BodyDef humain récent (la structure a changé en 1.5), PV/tags/exposition de chaque partie, courbes exactes d'efficacité, types de blessures et cadence de guérison/saignement, seuils d'incapacitation, interruption d'une arête et libération conservatrice des objets. Le vieux miroir XML utilisé pour les bâtiments n'est pas une preuve de l'anatomie actuelle. Aucun fichier téléchargé de code Core n'est intégré à notre source ; les copies de consultation sont dans le dossier de travail ignoré.

## Producteur possible : toit construit perdu

Le [toit Core](https://rimworldwiki.com/wiki/Roof) et [RoofCollapserImmediate, même révision épinglée](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/RoofCollapserImmediate.cs) concordent : un toit fin inflige 15–30 dégâts Crush, pénétration 0, région Top/Outside. Ce n’est pas nécessairement une blessure unique à la tête ; il faut encore lire la sélection et la propagation du dommage. Le retrait volontaire du toit ne doit pas devenir un effondrement dangereux. Les autres objets et plantes touchés et les gravats ont leurs propres contrats encore absents.

Ce producteur peut compléter une interaction déjà présente, après l’anatomie et les transitions de tâches. Ne pas inventer des accidents de coupe ou de construction pour remplacer les sources de blessures Core. Les [notes de migration 1.5](https://rimworldwiki.com/wiki/Modding_Tutorials/RimWorld_1.5_Mod_Updates) précisent une couverture de langue devenue 0,001 et des changements de tags/rendu ; elles ne justifient pas de supprimer arbitrairement des parties du corps.

## Frontière technique proposée

Définitions anatomiques immuables et identifiants stables, séparés des blessures persistantes de chaque personne. Éviter de recopier un corps sain complet par colon et par snapshot : l’absence de lésion peut rester un état sparse, les capacités étant dérivées. Les invalidations doivent suivre les lésions, traitements et modificateurs effectivement livrés, jamais une horloge graphique. Mesurer le coût des personnes saines séparément des foules blessées. Cette proposition n’est pas encore du code ni une preuve de performance.

## Asymétrie des membres

La relecture de [Moving](https://rimworldwiki.com/wiki/Moving) face à `CalculateLimbEfficiency` du miroir épinglé trouve une autre différence importante : le code multiplie les segments connectés **au sein de chaque membre**, applique sa moyenne de doigts/orteils pondérée, puis moyenne les membres. La formule globale du wiki, produit de moyennes bilatérales, n’est pas équivalente pour des lésions asymétriques. Exemple abstrait d’efficacités, autres facteurs neutres : jambe gauche 0,5 et pied gauche 0,5, droite saine → `(0,5×0,5+1)/2 = 0,625`, contre 0,5625 avec le produit de moyennes. Prévoir cet oracle avant intégration.

`CalculatePartEfficiency` tient compte des parties manquantes et des implants des ancêtres ; pour les parties préservées par les dommages, le ratio de PV passe par une rampe 0,1–1 avant efficacité. Les [effets de Manipulation](https://rimworldwiki.com/wiki/Manipulation) diffèrent selon les statistiques : ne pas multiplier indistinctement tous les métiers par le même facteur. Le rampement des personnages à terre, signalé par la référence récente, doit être explicitement livré ou différé, pas confondu avec un déplacement debout ralenti.

## Interruption forcée : cas de saturation

Avant d’activer douleur incapacitante ou mort, résoudre le cas où `releaseWork` refuse un dépôt faute de place. Un blessé ne peut continuer à travailler seulement parce que son objet ne peut pas être posé ; l’objet ne peut pas non plus disparaître. Définir une propriété physique durable de la cargaison interrompue, distincte d’une réservation de chantier/service, puis sa récupération. Tester portage, repas engagé, ingrédients et meuble entier ; queue forcée, lit, arête/porte et cellules saturées doivent rester cohérents. Il faut aussi distinguer le corps transportable d’un simple colon supprimé : décès, équipement et dépouille ont des implications de propriété différentes.
