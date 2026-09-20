# Captivité et recrutement

V86 validée dans son périmètre. [Référence Core et divergences](../research/prisoners-reference.md), chapitres 24 et 27 du corpus, SYS/TEST-148 et 149, UI-017 et UI-018. Le profil actuel relie un assaillant blessé, sa captivité et son entrée dans la colonie. Commerce et diplomatie ne sont pas des dépendances fictivement livrées.

## Cellule et capture

Le rôle **Prisonniers** se règle sur un lit et se propage aux lits de la même pièce. La pièce doit être fermée et ne pas toucher le bord de carte ; le toit n'est pas requis pour ce rôle. L'usage médical reste indépendant. Un lit médical réserve une utilisation temporaire, sans propriétaire permanent. Un lit de prison n'est pas un couchage disponible pour un colon libre. Le rapprochement de deux pièces propage le rôle existant, sans inventer de prison à la migration.

Un colon civil peut commander **Capturer** sur un assaillant vivant à terre. La personne et le lit sont réservés exclusivement. L'approche, la prise, les arêtes du porteur et l'arrivée utilisent le transport humain commun ; le captif reste la même personne du monde. Se relever avant la prise annule le transport ; se relever pendant le portage ne le téléporte pas hors des bras. Annulation, disparition du lit et incapacité du porteur libèrent les engagements sans supprimer la personne.

Le statut de prisonnier apparaît à l'arrivée dans le lit, après prévalidation des dépôts matériels. L'origine hostile, l'anatomie, les blessures, les compétences et les vêtements restent conservés. Les armes et cargaisons sont déposées avec leur identité ; un sol saturé reporte la transition. Les commandes civiles, la mobilisation et le mandat d'assaut ne pilotent plus le détenu. Une capture compte comme une perte pour l'assaut ; un recrutement ne le relance pas.

Adaptations explicites : la capture exige ici la démobilisation préalable et ne s'ajoute pas à une file. L'arrestation d'une personne debout est absente. Le mouvement d'un prisonnier applique le facteur Core 0,35 ; le portage d'une personne applique 0,6 à partir des nouvelles arêtes V86, y compris lors d'un secours. Les arêtes déjà engagées dans une sauvegarde conservent leur durée.

## Soins, repas et repos

**Médecin** soigne les blessures et renouvelle les traitements existants avec les vrais médicaments. **Geôlier** replace un captif à terre au lit, nourrit le patient qui ne peut pas manger seul, puis apporte des aliments aux détenus mobiles et converse avec eux. Le régime choisi pour un prisonnier gouverne les aliments apportés par le personnel. Un détenu choisissant lui-même de la nourriture dans sa pièce n'obéit pas à cette restriction, conformément à la référence inspectée.

L'alimentation assistée partage la réserve de patient et la chaîne prélèvement → portage → ingestion au chevet ; Geôlier la prend en charge pour les captifs. Le seuil d'activation est strictement inférieur à 26 % pour ceux-ci. Un geôlier ne soigne pas par son seul métier. Pour un détenu mobile, le repas est une vraie pile déposée dans la pièce, sans hausse de faim avant prélèvement et ingestion. L'identité, la quantité et l'âge sont conservés. La destination et le type de pile sont réservés avec les autres usages du sol. Les repas de prison sont exclus du choix alimentaire des colons libres et du rangement automatique. Aucune interdiction générale d'ingrédient n'est annoncée sans preuve correspondante.

Le fournisseur vérifie les aliments présents dans la pièce et les besoins des résidents ; la marge de 0,5 nutrition est une heuristique de livraison, jamais une création de nourriture. Les choix proposés et leurs limites détaillées sont dans la recherche. Médecin et Geôlier partagent les réservations de chevet, de patient et de stocks ; ils ne peuvent pas traiter simultanément le même engagement.

Faim, fatigue, confort, douleur, température, blessures et immunité continuent. Le détenu prend un repos médical quand son état le demande, indépendamment d'anciennes priorités de travail hostiles. Un détenu guéri quitte le lit, mange, dort et marche dans sa pièce. Le besoin de loisirs cesse de diminuer en captivité et ne produit pas de pensée de manque ; son état antérieur reste conservé pour le recrutement. L'humeur reprend les pensées existantes, avec les attentes fixes provisoires déjà communes au jeu.

## Entretiens et recrutement

Le mode initial **Maintenir en détention** ne cherche pas à recruter. **Réduire la résistance** s'arrête à zéro. **Recruter** réduit d'abord cette même résistance puis provoque l'adhésion lors d'une conversation ultérieure admissible.

Une conversation nécessite le contact physique, un geôlier apte à parler et un détenu éveillable, sécurisé, hors crise ; un détenu à terre doit être au lit. Cinq rapprochements donnent chacun leur effet au début de leur attente de 35 ticks locaux. La réduction ou l'adhésion survient ensuite, avec une fermeture de 35 ticks. Les compteurs et phases persistés empêchent de répéter opinion, XP ou recrutement après un rechargement. Le patient reste réservé pendant l'échange ; sa nutrition et son sommeil ne sont jamais crédités par cette attente.

Deux effets finaux au maximum par jour civil ; l'écart depuis le précédent doit être **strictement supérieur à 1 000 ticks locaux**. Un trajet commencé n'est pas un entretien terminé. Ces limites ne garantissent pas deux visites quotidiennes si le personnel est occupé, endormi ou empêché.

La résistance initiale 7–12 est une adaptation du type Drifter aux assaillants limités présents. La réduction utilise l'aptitude de négociation réelle, la cible instantanée d'humeur et l'opinion dirigée envers le geôlier ; les formules vérifiées sont canoniques dans la recherche. Les cinq rapprochements ajoutent des souvenirs dirigés et 225 XP Social de base ; la fin ajoute 230, avant les règles d'apprentissage. Atteindre zéro ne recrute pas dans la même visite ; une visite admissible suivante recrute sans tirage supplémentaire de réussite.

Le recrutement change l'appartenance de la personne existante, supprime son mandat de raid et conserve sa provenance datée. Ses capacités, blessures, compétences et souvenirs restent ceux acquis. Il faut lui affecter un couchage libre, des priorités et prévoir sa nourriture ; aucun colon de remplacement ni trousseau supplémentaire n'est créé.

## Sécurité et sorties

Les captifs marchent dans leur pièce sur de vrais chemins, avec un petit tirage privé persisté. Une porte simplement en train de s'ouvrir ne constitue pas un passage libre : elle doit être totalement ouverte et tenue ouverte, ou réellement empêchée de se refermer. Le passage ordinaire d'un colon debout autorisé à l'ouvrir, sur le seuil ou en approche, annonce au contraire une fermeture prochaine, même s'il gêne momentanément celle-ci. Un corps incapable ou un objet bloquant reste distinct ; un voisin immobile ne constitue pas à lui seul une approche. Une brèche réelle peut relier la prison à l'extérieur. La [relecture de `WillCloseSoon`](../research/prisoners-reference.md) corrige explicitement notre première interprétation trop large des corps bloquants.

La recherche d'évasion passe d'abord par les pièces et leurs ouvertures, puis par le même budget de navigation pondérée que les autres acteurs. Elle ne traverse ni roche, ni eau, ni coin solide. Le détenu sort seulement après avoir atteint physiquement le bord et terminé son mouvement ; les vêtements portés sont exportés une fois dans le registre correspondant. Refermer le chemin peut interrompre l'évasion. Une pièce ouverte est un état de jeu à traiter, pas un motif pour supprimer le détenu au chargement.

Les évasions organisées, agressions de geôliers, libérations diplomatiques et réputation sont absentes. La faction d'origine est distincte du contrôle ; la captivité neutralise l'hostilité automatique actuelle. La recapture d'un prisonnier déjà à terre utilise son transport vers un lit de prison.

## Persistance et frontières techniques

Schéma **86**, migration depuis V85 strictement validée : seule la priorité Geôlier 3 est ajoutée, sans réécrire les priorités précédentes. Aucune prison, personne, résistance, relation, blessure ou possession n'est inventée. Les nouveaux champs sont refusés dans les versions antérieures. Rôles des lits présents ou empaquetés, état du détenu, tâche du geôlier, provenance de recrutement et sorties sont validés avec les identités et réservations communes.

`prisoner-state.ts` porte les valeurs persistées et calculs sociaux ; `prison-space.ts` les pièces et accès ; `capture.ts` la transition ; `prisoners.ts` les commandes et activités ; `warden.ts` les conversations et livraisons ; `prisoner-exit.ts` les sorties. Le transport et les soins restent dans leurs modules communs. Le bridge transporte ces champs et actualise l'inspection lors des transitions ennemi → captif → colon ; le portage conserve les poses GPU communes.

## Limites et preuves

Tous les assaillants actuels sont recrutables : les prisonniers indéfectibles Core et l'intention démographique du narrateur manquent encore. Le catalogue humain, les attentes calculées sur la richesse, les relations familiales, l'arrestation, le commerce, les exécutions, la chirurgie, la sépulture et la diplomatie complète restent distincts. Aucun nombre universel de jours de recrutement n'est déduit des sauvegardes personnelles.

Les scénarios cliniques courts préparent explicitement une pièce, des provisions et une blessure. Le pilote naturel poursuit séparément la colonie V85 avec ses seules commandes, ressources et événements. [ROADMAP](../ROADMAP.md) conserve le calendrier ; les [preuves de validation](../history/validation-prisoners-v86.md) distinguent cliniques, continuation naturelle, parcours natifs et limites.
