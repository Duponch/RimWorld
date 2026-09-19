# Faune autonome — contrat V76

**V77 complète ce contrat :** anatomie, impacts de projectiles, saignement/guérison, fuite sonore et après blessure, incapacité/mort et inspection. Le périmètre V76 ci-dessous décrit le socle ; ses anciennes exclusions médicales sont remplacées par le [contrat courant](animal-combat.md). Chasse automatique, mêlée interespèces et filière des dépouilles restent absentes.

Décision visible : repérer les lièvres dans **Faune**, constater leur alimentation et protéger les cultures/aliments par une enceinte dont les portes restent fermées. Arrêt du lot : présence obtenable dans un camp neuf, marche/broutage/ingestion/sommeil réels, sauvegarde exacte, rendu GPU et charge mesurée. Anatomie animale/chasse/dépouilles constituent le prochain lot ; pas de chasse simulée en supprimant une décoration.

[Recherche et écarts](../research/wildlife-reference.md) ; [preuves](../history/validation-wildlife-v76.md).

## État et transitions

`World.wildlife` facultatif contient profil `temperate-hares-v1`, PRNG privé, animaux et bilan des consommations. Une nouvelle partie ordinaire l'active, les fixtures `createWorld` restent neutres. V75 est validée **avant** migration vers V76 : aucune espèce ajoutée à une ancienne sauvegarde. Le bouton Faune permet une introduction explicite et idempotente. Trois à douze lièvres selon surface, à proximité de plantes réelles, avec une première présence près du centre ; plafond de validation 256, sans promesse de performance associée.

L'identité est globale, distincte des colons. Espèce, sexe, nutrition, repos, état, prochaine décision, route, arête et repas sont persistants. Pas de métier, d'humeur, d'inventaire ou de corps humain ajouté aux animaux. Le PRNG écologique ne modifie pas celui des récoltes/combat.

Alimentation : trajet vers une interaction accessible, arrêt après achèvement physique de l'arête, cinquante ticks d'ingestion, puis retrait réel. Plante : croissance réduite et ancrée au tick, destruction uniquement après consommation complète, sans fabriquer son produit récoltable. Pile : unités entières prises au sol, réservation partagée avec transports/repas/cuisine ; reliquat et âge conservés. Le bilan compte la nutrition ingérée, même si une partie dépasse la capacité, les unités de piles et les plantes totalement détruites. Disparition/réservation concurrente de cible annule le repas sans bénéfice, en conservant l'arête déjà engagée. Réconciliation après les travaux et commandes.

La jauge est une nutrition de capacité 0,2 ; baisse nominale calibrée 0,18/jour, réduite à moitié sous 36 % et au quart sous 18 %. Intégration continue adaptée à l'horloge locale. Le repos décroît selon ses catégories et récupère au sol, sans gain pendant le trajet. Nuit 22 h–7 h, seuil d'endormissement 75 % ; jour 30 %. Famine : recherche alimentaire renouvelée pendant l’éveil ; le repos reste possible à nutrition nulle, sans gain alimentaire ; conséquences médicales encore absentes, explicitement inventoriées.

## Espace et coûts

Navigation pondérée commune à huit voisins, capture propre aux animaux. Une porte fermée ou en cours d'ouverture bloque ; une porte ouverte peut être franchie sans changer sa permission. Aucune ouverture automatique. Les coins de portes restent solides. L'arête active protège ses extrémités et coins contre l'achèvement d'un chantier ; le corps maintient la porte ouverte jusqu'à son passage.

Un seul parcours alimentaire potentiellement mondial par tick, priorité tournante ; errance par voisins bornés. Capture construite à la demande, abandonnée après mutation alimentaire ; aucun résultat de route périmé partagé entre ticks. Chaque arête revalide les obstacles. Les coûts de mobilier sont ramenés à la vitesse de l'espèce, et la diagonale suit sa longueur réelle. Les animaux partagent les cases de transit, sans devenir des obstacles hostiles humains.

## Présentation

`WildlifeLayer` conserve une géométrie instanciée et un matériau résident, préchauffés même sans animal. Lièvre procédural à quatre os rigides, translation/orientation/pose exécutées en TSL. Aucun squelette CPU par image. `MotionRecorder` et le temps confirmé incluent les animaux ; les phases d'ingestion/sommeil et les prélèvements déclenchent une publication datée. Changer de vitesse ne crée pas un autre tampon. La liste Faune permet de centrer la caméra ; aucune case de chasse/apprivoisement active tant que la mécanique manque.

Fichiers cohérents : `wildlife-state`, `wildlife`, `wildlife-food`, `wildlife-navigation`, `wildlife-save`, `WildlifeLayer`, `hare-geometry`, `wildlife-panel`. Le modèle 3D et la séparation des données restent remplaçables lorsque le corps quadrupède de combat est intégré.
