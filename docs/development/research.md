# Recherche et déblocage physique — V73

Le joueur choisit **Vêtements complexes** dans Recherche, construit un bureau et affecte Recherche dans Travail. Les colons rejoignent une cellule devant un poste réservé. Plusieurs bureaux contribuent au même projet ; aucune progression pendant le trajet, le sommeil ou une autre activité. [Sources et écarts](../research/research-reference.md).

## Contrat

- `research.ts` possède sélection, proposition, contribution et fin. `World.research` conserve projet, micro-points entiers (un million par point) et date d'achèvement. Coût 600 points ; suspendre conserve le travail. Achèvement unique, notification, puis déblocage du tailleur. Les besoins, ordres, urgences, mobilisation et incapacités réutilisent les interruptions communes.
- `Pawn.research` conserve poste, cellule et nombre de ticks réellement travaillés dans la session. Réservation exclusive du bureau et de son service, distincte du transit civil. Réévaluation après 400 ticks locaux. Un poste occupé attend avant désinstallation ; supprimer/déplacer un poste ne réinitialise pas la recherche collective.
- Intellect persiste séparément, applique vitesse et apprentissage commun (un XP de base par tick local avant passion/traits). Les nouveaux profils de départ ont 8/3/6 ; les anciennes personnes restent sans profil acquis, équivalent niveau 0/sans passion, matérialisé au premier travail. Ce défaut explicite n'est pas une génération de biographie Core.
- Bureau 3×2, 75 bois/acier/blocs +25 acier, ingrédients identiques agrégés ; tailleur 3×1, 75 bois/acier. Quatre orientations, empreintes et volumes cohérents, plans/cadres/livraisons et déplacement entier communs. Surface acceptant des objets, pas des zones ; transit avec délai de 5 ticks et arrêt ordinaire exclu. Place de travail devant le meuble. Rôles Laboratoire/Atelier et facteurs communs ; confort du tabouret uniquement si le chercheur l'utilise effectivement.
- Tailleur : recettes chemise et tenue tribale, vitesse ×0,5, environnement d'atelier. Chemise =45 tissus, travail neutre 270 ticks locaux. La tenue reste 60/180, également disponible à l'emplacement gratuit. Ouvrage, auteur, interruption, qualité, transport et habillage suivent [la confection](tailoring.md). Une recette de chemise ne reprend jamais une tenue tribale inachevée.

L'interface garde Recherche dans les onglets du bas et les priorités dans Travail. Les meubles utilisent le lot de géométrie procédurale résident. Orientation de travail, cargaison, vêtement et portrait réutilisent les poses GPU. Aucune mutation de World depuis le rendu ni animation squelettique CPU ajoutée.

## Persistance et limites

V72 est validée **avant** migration vers 73 : priorité Recherche 3, aucun projet, point, bâtiment ou niveau d'Intellect inventé. V73 contrôle champs, progression, date, propriétaire unique, poste/service, activité incompatible, travail à distance et atelier verrouillé. Chemise inachevée interdite en V72. Les anciennes fixtures de migration retirent explicitement les nouveaux champs ; le chargeur ne nettoie pas une sauvegarde invalide.

Choix de scénario assumé : départ sans Vêtements complexes, contrairement au Crashlanded classique. Propreté intérieure/difficulté/technologie neutres, coefficient extérieur incertain et choix des bureaux par proximité documentés dans la recherche liée. Un seul projet ; pas de livres, analyseur, bureau électrique ni arbre complet. Les dégâts/qualités du mobilier, vêtements thermiques, usure quotidienne et tenues automatiques restent distincts.

## Vérification

`research.test.ts` couvre coopération, réservations, suspension, priorité, déplacement du bureau, continuation exacte, coûts/rotations, seuils et corruptions ; prolonge la colonie de coton V72 par riz, cuisine, abattage, acier, recherche depuis zéro puis chemise portée. Le contrôle UI reprend son état réellement obtenu à 598 points, effectue pause/rechargement, travail à 1×/6×, construction, recette et habillage par les boutons. Les bancs mixtes distinguent simulation, worker et rendu. [Preuves V73](../history/validation-research-v73.md).
