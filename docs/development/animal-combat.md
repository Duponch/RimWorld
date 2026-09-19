# Santé animale et tirs V77

**Extension V79 :** [chasse civile](hunting.md), [corps transportables](corpses.md), [boucherie/viande/cuir](butchery.md) complètent ce contrat. Les mentions de leur absence ci-dessous décrivent le périmètre historique V76–V78 ; élevage, autres espèces et corps humains restent absents.

**Complément V78 :** [mêlée interespèces et riposte locale](animal-melee.md). Les anciennes limites de contact V77 sont levées dans ce périmètre ; filière alimentaire et corps transportables restent absents.

[Recherche fraîche](../research/animal-combat-reference.md), [faune et besoins](wildlife.md), [santé commune](health.md), [preuves](../history/validation-animal-combat-v77.md).

## Boucle visible et frontière

Le joueur sélectionne un colon mobilisé avec un revolver, ouvre **Faune**, puis **Tirer** sur un lièvre à portée. Le worker revalide toute la sélection, la ligne de tir et l'arme. Visée, projectile, précision selon taille/posture, couverture et récupération sont les mécanismes existants. Les colons regardent la cible animale. La liste montre mobilité, douleur, débit de sang, blessures localisées et parties perdues ; les animaux à terre/morts ont une pose couchée, la mort une teinte distincte.

Un impact peut tuer immédiatement, laisser un animal incapable ou le faire fuir avec une blessure ; le sang et la guérison continuent ensuite. Les besoins s'arrêtent à la mort. La victime reste identifiée à sa position, sans devenir une pile générique ni donner de viande à distance. Elle protège encore sa cellule contre la finition d’un chantier et maintient une porte ouverte si elle tombe sur son passage. V79 permet de convertir puis transporter cette dépouille après sa chute ; sur un sol encombré, le chasseur peut la récupérer directement, sinon elle attend que sa cellule soit dégagée. Voir le [contrat des corps](corpses.md).

**Découpage décidé :** anatomie, capture de cibles et impacts étaient exclusivement humains. Leur généralisation constitue une dépendance majeure à la chaîne complète. V77 est une tranche visible de tir/survie animale, pas la livraison de la chasse alimentaire. Riposte de mêlée ajoutée V78 ; prochaine boucle canonique : chasse automatique, dépouille physique, boucherie, viande puis repas. Pas d'ajout d'espèces avant cette boucle.

## Modèles et transactions

`body-model.ts` indexe deux anatomies immuables. `MedicalRecord.body='hare'` est permis seulement pour un propriétaire animal ; son absence conserve le profil humain historique. Le noyau commun résout blessures, parties perdues, saignement, douleur, cicatrices, guérison et décès. Les évaluations des capacités se spécialisent sur les chaînes corporelles ; un lièvre sain partage un résultat constant. Pas de barre globale de PV, skeleton CPU ou dossier créé pour chaque animal sain.

`wildlife-health.ts` possède l'horloge, les transitions, la fin des réservations alimentaires et le producteur Bullet transactionnel. Le PRNG et les lésions sont engagés ensemble. Le tirage de mort après incapacité violente est distinct du diagnostic physiologique et persiste comme cause `downed`. L'exposition thermique, la famine pathologique et les soins vétérinaires ne sont pas ajoutés implicitement.

La chute termine l'arête déjà capturée, comme chez les humains ; aucun nouveau pas n'est engagé avant récupération. Une blessure modifie la vitesse de la prochaine arête et l'ingestion. Un ralentissement de projectile modifie seulement le reste temporel de l'arête active : `travelPieces`, bridge et attributs GPU conservent les fractions déjà parcourues. La mort ne rejoue pas une animation de marche pendant cette translation.

`combat-target.ts` distingue les propriétaires ; `animal:<id>` est une clé de cible distincte de `pawn:<id>`, même si les identités numériques sont globales. La capture complète et le lot de projectiles partagent taille/posture et ordre stable. L'animal est dans l'overlay mobile, jamais figé dans le fond d'un lot. Chaque impact invalide cet overlay et les requêtes de tir. Les tirs automatiques contre les ennemis humains ne sélectionnent pas spontanément des lièvres.

`wildlife-flight.ts` cherche une échappée accessible et bornée ; `wildlife-noise.ts` partage la géométrie audible avec les humains. Les réactions interrompent le repas et libèrent sa portion, sans la consommer. Recherche alimentaire et recherche de fuite partagent le budget d'une décision coûteuse par tick, avec rotation des acteurs. Un animal coincé retente à cadence bornée ; la sortie écologique de carte reste absente.

## Persistance et présentation

V76 est validée selon ses anciennes exclusions **avant** migration neutre V77. Pas de blessure, cadavre ou fuite inventés. Rejeter partie humaine sur un animal, profil animal sur un colon, horloge médicale incohérente, état incompatible, portion alimentaire pendant incapacité, durée/vitesse/arête ralentie mal formée et clés animales dans un projectile V76.

Un mesh résident pour les lièvres, même géométrie et graphe TSL ; état/teinte/pose passent par les attributs. Les segments fractionnés interpolent leurs extrémités réelles, avec les hauteurs de l'arête entière pour les meubles. Les nouvelles cibles utilisent l'orientation du tireur existant. Aucun calcul anatomique par frame graphique.

## Limites explicitement ouvertes

V79 ajoute Chasse, achèvement au contact, dépouille transportable, décomposition, boucherie et viande/cuir. Restent absents : manhunter d'autres espèces, prédation, soins vétérinaires, maladies, faim létale, climat corporel animal, apprivoisement, élevage, départ de carte et renouvellement écologique. Les parties amputées restent présentes sur le modèle low poly, comme la limite actuelle du modèle humain. Les calendriers/coefficients de fuite sont adaptés, pas certifiés identiques à Core.
