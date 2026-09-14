# Cuisine forcée et dégagement avant semis — relecture V20

14 septembre 2026. RimWorld Core, confrontation avant livraison. Corpus : chap. 9/11/12 ; SYS/TEST-047..054 (travail, réservations, portage), 062..064 et 067 (factures/cuisine), 070..075 (culture), UI-025/027 (production/contexte). SYS/TEST-128 est relu, mais sa provenance Odyssey ne définit pas seule le fonctionnement Core.

## Sources et portée

- [WorkGiver_DoBill, miroir épinglé](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_DoBill.cs) : fournisseur de travail, contrôle du poste, de la place d’interaction et des factures ; branche de ravitaillement avant fabrication.
- [WorkGiver_GrowerSow, même révision](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_GrowerSow.cs) : politiques de culture, plantes gênantes et transport latéral d’un objet qui bloque le semis.
- [Bill, wiki communautaire](https://rimworldwiki.com/wiki/Bill) et [Growing zone](https://rimworldwiki.com/wiki/Growing_zone) : interface et comportements du joueur, recoupement indépendant du miroir de code.
- [Ludeon, mise à jour 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : repère officiel récent de version, pas une spécification de chaque règle.

Le miroir communautaire précède ce correctif officiel ; il n’est ni le binaire courant ni une garantie de parité. Les phases physiques sont bien étayées ; les détails de priorité et de fournisseur restent à revérifier lorsque de nouvelles recettes et capacités sont ajoutées. Aucun code commercial n’est repris. Une tentative de consultation de JobDriver_DoBill à cette URL a échoué et ne sert pas de preuve.

## Décisions

**Adopter — factures et contraintes.** Un ordre priorisé ne rend pas une facture suspendue ou satisfaite exécutable, ne contourne pas ses ingrédients autorisés ni le rayon. Le fournisseur cherche une recette réalisable dans l’ordre des factures. Le poste et sa place doivent être libres, réservables et accessibles. Même planificateur d’ingrédients et même exécution physique pour ordres automatiques et directs : prélèvement, portage, rassemblement, travail et dépôt.

**Adopter — feu vide.** Le fournisseur de facture renvoie un travail de ravitaillement lorsque le poste manque de combustible. Ce travail dépend ici de Cuisine ; il reste possible sans affectation Transport. L’ordre accepté ne promet pas ensuite une fabrication complète. Le ravitaillement forcé garde les contraintes physiques et contourne seulement seuil/interrupteur automatiques.

**Adopter — semis bloqué.** Le cultivateur déplace un objet transportable qui empêche de planter ; ce sous-travail appartient à Culture, indépendamment de Transport. Ne pas semer sur la pile ni la faire disparaître. Les autres exclusions agricoles restent actives.

**Adapter — file et représentation 3D.** La file locale réserve immédiatement quantités, dépôts typés et poste. Le dégagement conserve la zone et la cellule visée ; l’ID temporaire d’une intention agricole peut être renouvelé sans perdre l’ordre. Annuler/modifier la zone retire cette intention et dépose physiquement la cargaison. C’est un contrat de notre moteur, pas une affirmation sur la structure interne de RimWorld. Les cellules de travail gardent leur empreinte 3D explicite.

**Différer — parité logistique complète.** Portage de dix unités et trajets mono-source, absence de ramassage opportuniste, une recette par ordre, exclusivité stricte du poste même pour un second ordre du même colon, et maintien local du travail priorisé restent des écarts connus. L’intoxication, les compétences, les autres recettes/postes et les capacités physiques attendent leurs systèmes. Les durées déjà calibrées du prototype ne deviennent pas des valeurs originales par cette livraison.

Les scénarios approfondis enrichissent les contrôles existants de cuisine, réservations, pourriture, culture et joueur de colonie. [Contrat courant](../development/player-orders.md), [preuves](../development/validation.md).
