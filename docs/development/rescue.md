# Secours physiques et lits médicaux — V46

17 septembre 2026. [Recherche et limites](../research/care-preparation.md), [santé](health.md), [interruptions](interrupted-cargo.md), [ordres](player-orders.md), [validation](validation.md). Corpus : chapitre 15, SYS/TEST-094 et 096 ; chapitres 8/9 pour tâches, accès et réservations. La tranche livre le secours, **pas encore le traitement des plaies ni l'alimentation assistée**.

## Actions et propriété

Le métier **Médecin**, dans Travail, permet à un colon valide de secourir une personne à terre hors d'un lit. Le fournisseur participe au classement commun des priorités ; à priorité égale, il passe avant les travaux actuels. Les jobs déjà engagés ne sont pas interrompus par une nouvelle recherche globale. Le clic droit propose aussi « Secourir » avec motif de refus. Une priorité à zéro interdit un nouvel ordre ; un secours direct déjà accepté continue jusqu'à son terme ou son annulation. La priorité par défaut vaut 1 sur une nouvelle partie et lors de la migration V45.

`Pawn.rescue` appartient au porteur : identité du patient, lit et phase `approach`/`carry`. La personne et le lit sont réservés dès l'acceptation, sans créer de pile ni de second Pawn. L'accès est prouvé par la même navigation civile et les mêmes budgets que les autres tâches. Le classement préfère un lit médical, puis le lit possédé par le patient, puis un autre lit sans propriétaire ; distance depuis le patient et identité départagent les candidats actuels. Qualité, partenaire, lits doubles et types hospitaliers restent absents. Une meilleure destination inaccessible n'empêche pas le repli vers une destination admissible.

Le sauveteur rejoint réellement la personne, attend la fin de son arête de chute éventuelle, la prend puis rejoint le lit. **Adaptation 3D** : prise sur la même cellule logique et dépôt sur l'ancre du lit, selon notre contrat actuel des services. Le Core utilise des contacts ClosestTouch/Touch. Ni réservation, proximité, arrivée à une cellule voisine ni simple réception d'un snapshot ne déposent le patient. Le portage n'ajoute pas un malus universel de vitesse ; capacités, lumière, terrain, mobilier et portes du sauveteur gardent leurs effets.

Pendant le portage, position, arête capturée et délai du patient suivent ceux du sauveteur. Sa santé et sa faim continuent ; il ne bénéficie pas d'un lit et ne dort pas dans les bras dans cette tranche. L'intervalle de santé antérieur est ancré avant prise, dépôt et interruption, quelle que soit la position des deux acteurs dans l'ordre du tick. La cargaison d'urgence éventuellement retenue par le patient reste à **son** nom ; son dépôt passif attend son retour au sol. Le sauveteur doit libérer sa propre cargaison avant un ordre direct, avec refus atomique si aucun dépôt n'est possible. La personne portée n'est jamais convertie en matériau.

Récupération ou décès du patient, perte du lit, interruption/fatigue/blessure du sauveteur libèrent la relation et les engagements. L'arête engagée finit selon l'adaptation V45 ; pas de téléportation vers une autre cellule. La physiologie est réconciliée aussi avant l'action et en fin de tick : l'ordre de traitement des acteurs ne peut pas permettre une dernière prise d'un patient déjà mort ou relevé. Le décès ne livre toujours pas un objet cadavre transportable.

## Rôle du lit

L'inspection d'un lit construit propose **Usage médical**. `Structure.medical?:true` est un rôle, pas une définition « lit d'hôpital ». Le matelas bleuté utilise le même lot de mobilier. Ce rôle exclut le sommeil ordinaire et retire les propriétaires durables ; une réservation médicale reste une réservation temporaire. Les meubles emballés conservent ce rôle. Les plans de construction sont ordinaires jusqu'à leur achèvement.

Le changement de rôle annule les approches/transports visant le lit et les usages ordinaires. Un patient déjà couché conserve son utilisation ; si le lit redevient ordinaire il le possède. Un lit occupé/réservé n'est pas simultanément disponible pour un autre secours ou une déconstruction. Une désignation seule ne détruit pas la réservation de service.

Un lit ordinaire choisi est attribué au patient dès le début du secours, conformément au chemin ClaimBedIfNonMedical relu ; interrompre le secours ne retire pas cette propriété. Un lit médical ne remplace pas le lit ordinaire possédé. L'arrivée crée l'utilisation physique du lit chez le patient incapable. Repos et guérison utilisent alors les règles médicales V45 ; être au lit ne cautérise pas une plaie, n'apporte pas de nourriture et ne restaure pas instantanément des PV. La récupération libère l'utilisation médicale. Le besoin de repos normal peut ensuite chercher un couchage ordinaire.

## Frontières et sauvegarde

`rescue-state.ts` possède la relation et sa libération ; `rescue.ts` choisit et exécute ; `medical-beds.ts` gère le rôle et l'admissibilité ; `rescue-save.ts` valide formes et relations. Les hooks du planner, besoins, sortie du mobilier et interruptions restent explicites. Aucun cache d'accès ne survit à une décision. Les parcours non compétitifs sont évités avant construction de leurs routes ; pas d'ECS ou de seconde navigation introduits pour ce lot.

V45 est validée strictement avant migration 46. Seule la priorité Médecin 1 est ajoutée : aucun blessé, lit médical, secours, matériau, route ou historique n'est inventé. Une sauvegarde actuelle exige l'unicité du patient/lit, un acteur admissible, des tâches exclusives, et l'égalité des positions/arêtes pendant le portage. Des champs médicaux futurs dans une V45 sont rejetés. Les fixtures historiques suppriment explicitement cette nouvelle priorité ; le validateur ne la tolère pas silencieusement.

Le bridge observe prise/dépôt et rôle du lit comme phases discrètes. La présentation copie les attributs de trajectoire du sauveteur vers le patient dans les buffers existants ; corps, cargaison et anneaux suivent donc la même interpolation. La pose portée est calculée en TSL, sans squelette CPU, nouvelle géométrie par personne ni compilation au premier secours. Les cas de rechargement et les vrais attributs GPU sont observés dans le navigateur, en complément des invariants simulés.

## Limites assumées et suite

- L'ordre de secours peut être forcé immédiatement ; **Maj/file de secours n'est pas encore livré** et fait l'objet d'un refus explicite. Les anciennes familles gardent leurs files existantes.
- Aucun médicament, soin physique, compétence médicale/XP, politique de traitement, repos médical autonome d'un patient mobile, alimentation assistée, chirurgie, infection ou maladie n'est annoncé livré. C'est le prochain ensemble de boucles de G3.
- Les acteurs actuels sont des colons adultes alliés. Contrôle d'ennemi proche, permission de faction, prisonnier, animal et dangers tactiques restent à brancher sur ces futurs systèmes. Le domaine thermique jouable actuel est tempéré ; le filtre médical des températures extrêmes/confort vestimentaire reste absent, avec son contrat de référence conservé dans la recherche.
- Les modèles gardent leurs membres de placeholder malgré les amputations. Les relations de propriétaire, de lit partagé et les types de couchages enrichiront le même contrat.

Les six scénarios de simulation croisent concurrence, accès, rôles, sauvegardes, physiologie, interruption, mort/récupération, cargaison saturée, snapshots et migration, avec un contrôle des frontières temporelles de guérison. Le parcours UI utilise réellement Travail, inspection, clic droit, vitesses et menu de sauvegarde. Le pilote de colonie conserve les bilans et identifie désormais relation de secours et utilisation de lit. Les audits 2/30/100 personnes sont séparés CPU/WebGPU et ne certifient pas toutes les machines ni toutes les combinaisons de gameplay.
