# Climatiseur et exposition froide — V75

[Recherche et écarts](../research/cold-store-reference.md). Décision nouvelle : investir recherche, acier, composants et combustible pour conserver un stock périssable. Critère de sortie : construire, transporter, geler, perdre l’alimentation puis observer le vieillissement/la perte, avec reprise exacte. Câbles, batteries, saisons et gelures localisées restent hors de cette tranche.

## Appareil physique

`cooler.ts` possède faces, thermostat et intégration. L’orientation 0 envoie le froid vers +z, rotations comme les meubles ; bleu = froid, rouge = rejet. L’empreinte est solide pour navigation, tirs, air et lumière ; les cadres restent franchissables. Aucun toit supporté directement par cet appareil. Le plan exige les deux cellules adjacentes libres d’obstacle plein/plan solide. Une obstruction ultérieure arrête le pompage sans changer la consigne.

Construction 90 acier/3 composants/160 ticks neutres ; seuls les bâtisseurs de niveau 5 finissent, les aides peuvent dégager/livrer. `Structure.cooler={target,high}` et `power` sont autoritaires, persistés. `cooler-target` revalide ID, type, intervalle fini ; refus atomique. Les boutons utilisent `cooler-adjust`, incréments résolus sur le worker pour ne perdre aucun clic lors du retard d’affichage. Pas de réinstallation ; déconstruction commune à 50 %. Barrière de 100 PV, réparable dans le foyer et attaquable. Destruction : remboursement arrondi de 25 %, pertes nettes acier/composants ; dépôt prévalidé avant PRNG, dommage terminal ou retrait. Un sol saturé peut retarder ce dernier retrait : adaptation conservatrice partagée avec les transactions matérielles.

Le réseau local choisit un générateur proche ; demande variable partagée par bilan, démarrage et délestage, 20/200 W. Thermostat et mode ne reconstruisent pas la géométrie. Les pièces et températures sont mises à jour à la même frontière que les sources existantes, puis les âges alimentaires ancrent l’ancien taux avant le nouveau. Le gel ne rajeunit pas une pile. La perte de combustible ne remplace pas le réseau par une quantité globale fictive d’énergie.

## Recherche et santé

`ResearchState.points/completedAt` restent les progrès historiques de Vêtements complexes. `airConditioning` possède ses propres points/date ; `project` choisit l’un des deux. Changer de projet libère le poste, conserve les deux progrès et ne termine aucun projet implicitement. La UI ne modifie pas le monde lu. Les bases électriques sont une connaissance de scénario assumée ; 500 points restent à travailler au bureau pour le climatiseur.

`MedicalRecord.hypothermia` est sparse, en milliardièmes comme le coup de chaleur, avec sa propre cause de décès. `cold-rules.ts` sépare l’exposition linéaire de la courbe chaude. L’échantillon de température et l’intervalle médical sont partagés par `heat-exposure.ts` ; sommeil/incapacité n’immunisent pas. La manipulation froide s’ajoute après la formule corporelle, avant arrondi, sans redéfinir les blessures. Vêtements et qualité modifient le confort, pas l’armure. Au stade grave le refuge existant fonctionne dans les deux sens ; `heatRefuge` reste son nom historique de sauvegarde. Ordres directs/mobilisation/crise restent prioritaires, une personne à terre requiert secours et un lit réellement tempéré. Gelures, pensées de froid et choix complet de lits selon danger restent absents.

## Reprise et présentation

V74 validée strictement avant V75 : aucun appareil, progrès, froid passé ou objet inventé. Les champs futurs sont refusés dans V74. V75 refuse climatiseur sans recherche, état électrique/thermostat invalide, blessure froide incohérente et projets aux points/date contradictoires. Les continuations conservent températures, âges, fractions de combustible et réseau.

Volumes procéduraux dans le lot mobilier existant, sans matériau/shader par appareil. Le lot de prévisualisation existant affiche les deux faces ; indicateurs compatibles avec la coupe des murs. Thermostat dans l’inspection, construction dans Architecte → Température, projet dans Recherche. FPS conservé. Aucun travail thermique par image.

Les scénarios profonds couvrent sortie/entrée du froid, cible/veille/panne, faces bloquées ou partageant une pièce, destruction, accès Construction 5, migration et reprise. Le pilote spécialisé réutilise les commandes et le type `Decision` du pilote de colonie, sans injection après le départ. Le contrôle UI reprend une sauvegarde gagnée pendant ce parcours avant la fin de la recherche ; il exerce le vrai worker et le pointeur. Résultats mesurés dans la validation, jamais déduits de la présence des tests.
