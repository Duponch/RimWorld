# Équipement physique V52

[Recherche fraîche et adaptations](../research/equipment-reference.md), corpus chapitres 2/8/13/20/29, UI-014 et SYS/TEST-055. Première arme : revolver. Le tir dirigé est ajouté en [V56](shooting.md) ; vêtements et inventaire personnel restent absents.

## Propriété et actions

`MaterialPile` porte les armes individuelles, quantité un et `weapon {quality, hitPoints, forbidden?}`. Propriétaire `equipment` distinct de `pawn` (cargaison), `ground` et `job`. Une principale par colon ; une arme ne peut pas être incorporée dans un chantier. Ni fusion ni conversion en matière. Qualité et PV restent identiques à travers équipement, échange, transport, dépôt, interruption et sauvegarde. Le transport d'une arme entière déplace son instance sans consommer d'identité.

`equipment.ts` gère les commandes et la tâche physique. Réserver la source contre tous les autres préleveurs ; revalider cible, manipulation, incapacité, accès et permission. Se déplacer au contact, prévalider où déposer l'ancienne arme en tenant compte de la cellule libérée, puis transférer les deux propriétaires. Aucun délai artificiel au contact. Un dépôt explicite arrête après l'arête engagée, attend trois ticks locaux puis pose l'objet interdit au sol. Sol plein : refuser l'échange ou conserver l'arme, jamais perdre la matière. La file spécifique d'équipement est différée et refusée ; les travaux ordinaires ajoutés derrière une tâche d'équipement restent réservés et reprennent.

`equipment-state.ts` traite l'incapacité : à terre hors lit, décès ou manipulation nulle provoquent un dépôt ; à terre dans un lit déjà occupé conserve l'arme sauf perte de manipulation. Un lit supprimé ou un service perdu recontrôle cette exception avant qu'une sauvegarde soit exposée. Sol saturé : `equipmentDropPending`, arme inactive conservée, un seul réessai depuis la boucle des acteurs tous les vingt ticks décalés par ID, même si plusieurs réconciliations ont lieu. Après chute, mémoriser l'arme encore au sol ; récupération physique aux décisions libres après besoins et ordres. Transport par un autre acteur ou disparition fait oublier cette cible. Le bouton Oublier permet de renoncer. La priorité de récupération et son ignorance de l'interdiction sont des adaptations déclarées, pas une reproduction validée de la ThinkTree Core.

Une nouvelle carte contient un revolver normal à 100 PV. Un ancien site n'en reçoit pas automatiquement. Le filtre Armes accepte une arme par case ; une arme interdite n'est pas rangée automatiquement. Inventaire personnel, masse cumulée, vêtements, usure, fabrication/commerce et mêlée restent absents ; tir dirigé livré V56.

## Persistance et présentation

V51 validée strictement avant V52, aucune arme, tâche ou mémoire inventée. `equipment-save.ts` sépare forme et références : propriétaire existant/unique, sept qualités, PV entiers 1–100, quantité un, exclusivité des activités et réservations, progression 0–2 du dépôt, cohérence de l'intention et du marqueur de conservation. Aucun objet équipé ne devient une cargaison implicite.

`pawn-geometry.ts` isole la géométrie du rig et des cargaisons. Trois petits volumes du revolver partagent le lot corporel et sa pose GPU ; un attribut d'instance pilote leur visibilité, dans la limite de huit buffers de sommets WebGPU. Pas de nouveau lot par arme, squelette CPU ou travail de géométrie à chaque image. Même forme procédurale pour le sol et la cargaison. Le coût supplémentaire de sommets existe : aucune promesse de coût nul.

`character-equipment.ts` fournit une projection de snapshot commune à la carte, au portrait et à l'inspection. Le buste ne dessine pas une arme située à la hanche ; son libellé tient compte de la principale. Le propriétaire et les phases sont des transitions discrètes, appliquées sur l'horloge de la scène ; réception du snapshot seule ne retire pas l'objet au sol.

## Vérifications

Cinq scénarios profonds : contact/échange/file, délai/annulation/permissions/logistique, incapacité/lit/décès/sol saturé/récupération, migration/corruption/deltas, perte d'accès/cible et retrait du lit. Parcours UI natif avec sonde des attributs GPU, reprise à l'approche et équipée, dépôt retardé, état du portrait et capture inspectée. Pilote multi-jours équipé par commande du joueur, identité et qualité conservées. Audit mixte CPU 3/30/100 acteurs et extension du banc graphique minier avec armes et lésions. Les résultats, échecs et limites sont dans la [validation courante](validation.md).

La garde initiale d’équipement a révélé trois micro-attentes d’abattage. Le correctif d’encodeur ultérieur sous V52 a passé la garde native ; preuves et échecs conservés dans la [validation](validation.md). La mobilisation est ajoutée séparément en [V53](drafting.md).
