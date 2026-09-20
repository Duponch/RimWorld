# Hygiène et intoxication alimentaire — V89

**V89 validée dans son périmètre.** La [recherche datée](../research/food-poisoning-reference-v89.md) motive les règles ci-dessous. La cuisine, les aliments et le modèle médical gardent leurs contrats existants ; l’intoxication ajoute un état indépendant de la fraîcheur, des dégâts et des infections de plaie. Les [preuves communes](../history/validation-hygiene-v89.md) distinguent contrôles cliniques, interface native, charge et colonie avec reprises ; aucun épisode n'a été observé naturellement dans ce dernier parcours.

## Du poste à l’ingestion

La finition prévalide ingrédients, place de sortie et identité avant de tirer une contamination. La propreté est celle de la position physique du cuisinier. Elle est testée avant sa compétence ; seul l’échec du premier essai autorise le second. Les deux cuisinières et le feu de camp suivent la même règle. Une alimentation électrique, une température de conservation ou la qualité du meuble ne donnent pas un bonus d’hygiène inventé. Les ingrédients sont consommés une seule fois, et l’XP de finition existante reste liée au travail réellement effectué.

`MaterialPile.foodPoison` est facultatif et contient `{fraction,cause}`. L’absence vaut zéro. La fraction est finie dans `]0,1]` ; les causes admises sont `filthy-kitchen`, `incompetent-cook` et `unknown`. Ce champ ne porte que sur les repas simples et de survie du catalogue actuel. Division/copie, transport, échanges, portage médical et dépôt doivent le conserver. Une fusion préplanifie sa moyenne pondérée avant de modifier les quantités ; elle ne contamine pas automatiquement toute la pile à 100 %.

Le prélèvement ne déclenche aucune maladie. Une ingestion effectivement achevée évalue une seule fois le risque : type cru pour les humains, fraction du repas pour les ingérants de chair concernés. Le facteur 0,75 du profil Récit d’aventure intervient ici, et non dans les essais de contamination à la cuisson. Les parties historiques sans `gameProfile` utilisent le facteur neutre 1 ; les anciens Crashlanded qui possèdent ce profil conservent son facteur. La migration n’invente ni repas contaminé ni maladie passée. Les anciens repas préparés restent propres mais une future ingestion crue suit désormais le risque du type identifié.

Le gel conserve la contamination comme la matière. La pourriture continue de supprimer la pile à son échéance, avant action ; elle ne donne ni nutrition ni intoxication après sa disparition. Les [régimes](food-policies.md), l’accès, la réservation et l’ingestion restent applicables à un malade et à un prisonnier. Les visiteurs gardent leurs provisions physiques.

## État médical commun

`MedicalRecord.foodPoisoning` conserve `{severity,bornAt,cause,item,vomit?}` pour humain ou lièvre. La sévérité entière utilise **300 000 unités pour 1** : une impulsion de 200 ticks Core, soit 20 ticks locaux, retire 1 000 unités. Ce choix représente exactement le taux et les seuils retenus ; il ne prétend pas reproduire les erreurs d’arrondi successives d’un flottant C#. La phase vient de l’identité de l’acteur, comme les autres intervalles médicaux.

Les seuils sont 240 000 et 60 000. Une réexposition pendant le stade initial laisse l’état inchangé ; après ce stade elle rétablit 239 700 unités, soit 0,799. La guérison retire le champ à zéro, sauf si un vomissement commencé doit encore terminer. Aucun objet médicament, aucune immunité et aucun soin de plaie ne sont consommés pour cette maladie. Les autres affections restent traitables.

`foodPoisoningModifiers` fournit douleur et facteurs de conscience, mouvement, manipulation, filtration, ingestion et parole. `body-capacities` applique chaque facteur avant que les capacités dépendantes lisent le résultat, puis respecte plafonds/minimums/arrondis. Le cache médical compare ces scalaires comme les autres effets : une transition de stade ou une réexposition dans le même tick devient immédiatement visible. La douleur de maladie n’est pas divisée par l’échelle du lièvre.

La sévérité avance indépendamment de l’ingestion et du repos, avec gel de l’état autoritaire après décès. L’incapacité et la mort éventuelles résultent de l’évaluation commune des capacités et autres lésions, pas d’un seuil mortel alimentaire inventé. L’état ancien sans intoxication conserve les mêmes facteurs 1.

## Épisode de vomissement

`vomit={remainingCore,cell}` représente un épisode réel. Le contrôle de déclenchement a lieu tous les 60 ticks locaux, avec les trois intervalles moyens de la recherche. La durée tirée est de 300 à 899 ticks Core. La cellule capturée est admissible ou, après les essais bornés, celle de l’acteur. Un épisode peut être renouvelé lors d’un contrôle ultérieur ; une fin de maladie n’efface pas un épisode engagé.

`processFoodPoisoningVomit` reçoit l’état, tick/phase et un contexte explicite : éveil, position, maximum/niveau alimentaire, PRNG, praticabilité, démarrage conservateur et dépôt de salissure. Il renvoie l’activité du tick et le nouveau niveau alimentaire. Le coordinateur conserve l’autorité sur les tâches, l’arête physique et les possessions. Tant que le démarrage est refusé, aucun travail de vomissement n’est inventé. Une fois engagé, le vomissement retarde les activités ; il ne consomme jamais le repas porté à leur place.

L'épisode engagé n'est pas interruptible par un ordre du joueur (`Jobs_Misc.xml`, `Vomit.playerInterruptible=false`, Core local 1.6.4871). Les ordres individuels de travail, les actions de combat et la mobilisation sont refusés pendant ce temps ; un groupe contenant une personne qui vomit est refusé avant toute mutation de ses membres. Les politiques restent réglables. Le refus médical commun sert aussi aux propositions d'actions, pour qu'une commande ne conserve pas une nouvelle tâche incompatible avec l'épisode. Les ordres redeviennent possibles dès sa fin, même si la maladie persiste.

Tous les 15 ticks locaux alignés sur l’identité, le dépôt de vomi passe par la couche de salissures. Au même moment, un niveau alimentaire strictement supérieur à 10 % perd quatre points de pourcentage du maximum. La faim est réévaluée par les besoins habituels après l’épisode. Le vomi n’est ni un aliment ni un objet récupérable, et son apparition ne déplace pas les piles voisines.

## Interfaces et persistance

| Module | Responsabilité |
|---|---|
| `food-poisoning.ts` | Types, risques purs de pièce/Cuisine, contamination de sortie, copie/moyenne, ingestion, stades, modifiers et récupération |
| `food-poisoning-runtime.ts` | Épisode spatial de vomissement par callbacks conservateurs |
| `food-poisoning-save.ts` | Formes et bornes strictes, types alimentaires admissibles |
| `injury-state`, `injury-evolution`, `body-capacities` | Physiologie, progression et interaction avec les autres affections |
| Cuisine, piles, ingestion et coordinateur | Engagement transactionnel, conservation et ordre des opérations |

La validation du schéma antérieur précède toute migration. V88 et versions antérieures refusent ces nouveaux champs s’ils sont présentés comme leurs données. V89 n’invente aucun état de contamination ou de maladie dans une sauvegarde ancienne. Les corps et archives conservent leur dossier médical ; ils ne deviennent pas de nouveaux malades mobiles. Une cible de vomissement vivante doit rester dans les dimensions de la carte, sans obligation qu’une cellule capturée demeure praticable après un changement réel du terrain.

Les snapshots copient les objets facultatifs et leur cellule, sans alias mutables. Les signatures du rendu ne sont pas des données de santé. Les pourcentages affichés distinguent probabilité d’une pile, sévérité de maladie et nutrition : aucune jauge unique ne remplace ces trois notions.

## Contrôles et limites

`tests/food-poisoning.test.ts` regroupe l’ordre des essais, absence de tirage aux probabilités certaines/nulles, divisions/fusions partielles, différences humains/animaux, facteur de difficulté, réexposition, seuils et épisode physique avec continuation. `tests/food-poisoning-health.test.ts` couvre dépendances de capacités, douleur humaine/animale, horloge médicale commune, combinaison de lésions et refus historique strict. Les contrôles intégrés `food-hygiene.test.ts` et le parcours natif vérifient les consommateurs physiques, les interruptions, le refus des commandes pendant un vomissement, la persistance et les actions UI. Leurs résultats et reprises de fixtures figurent dans la preuve commune ; ils ne prétendent pas couvrir tous les états possibles.

La campagne commune n’a pas à provoquer une maladie naturellement pour réussir. Les frontières cliniques sont explicitement séparées de la colonie issue d’un vrai parcours. Pâte nutritive, nouvelles recettes avancées, gènes/implants, espèces supplémentaires, tous les effets sociaux et toutes les maladies restent hors de ce contrat.
