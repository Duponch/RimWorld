# Logistique des meubles entiers V26

[Recherche récente](../research/furniture-logistics-reference.md), corpus chapitre 10 / SYS-051..054 et SYS-059. Complète les [transferts et poses](furniture-transfer.md), sans ajouter de famille d'objet ni d'inventaire personnel.

## Transport physique et réservation

Une réserve peut accepter **Meubles emballés**, indépendamment de Bois et Nourriture. Une case libre accueille exactement un paquet ; celui-ci exclut toute pile de matériau et toute autre livraison. Les réservations actives et en file engagent le même emplacement. Le rangement choisit une réserve accessible de priorité strictement supérieure à celle de la source ; une source rejetée par son filtre est non rangée. Pas de redistribution automatique entre réserves égales.

`HaulTask.whole: true` distingue le paquet d'une pile divisible. `sourcePileId` contient l'identité globale du meuble, quantité 1, destination réserve ou dégagement. Au prélèvement, `carryPileId` reprend cette même identité et le propriétaire devient le colon ; au dépôt, il devient la cellule. Aucun matériau ni exemplaire de meuble n'est produit. La validation croise propriétaire, cargaison, commandes en file, destination et intention de réinstallation concurrente.

La simulation réutilise les priorités, besoins, horaires, déplacements et interruptions du transport. Le fournisseur manuel expose le paquet dans le menu contextuel et autorise une file avec Maj. Construction ou Culture peuvent dégager le paquet qui empêche leur propre tâche même si Transport est désactivé. Le dépôt est proche, hors des chantiers/cultures ; son parent est conservé pour annuler correctement ses réservations. Table, tabouret et piquet conservent le paquet compatible sur leur cellule ; mur, lit et feu exigent son déplacement.

Interruption, suppression de réserve, changement de filtre ou annulation préparent les dépôts avant mutation. Si aucune place sûre n'existe, une commande qui exige de lâcher la cargaison est refusée sans perte. Réinstaller un paquet encore au sol remplace sa réservation de rangement ; un objet déjà porté n'est pas repris à distance. Annuler sur la source par rectangle traite la même intention que l'annulation sur le plan, même lorsque ces deux lieux sont éloignés.

## Réinstallation et responsabilités

La pose d'un meuble peut être choisie par **Construction ou Transport**. `Job.installationWork` mémorise le fournisseur choisi pour l'affectation courante et la priorité forcée. Sa suppression libère le champ ; un ancien job V25 sans champ conserve le repli Construction. Le dégagement de plante dans la chaîne de réinstallation est également accessible à ce fournisseur ; Transport ne finit toujours pas un cadre de construction ordinaire. Le retrait séparé reste Construction.

`furniture-haul-planner.ts` propose les destinations avec les budgets communs ; son rejet rapide évite une recherche de navigation quand tous les paquets sont déjà au meilleur niveau de rangement. `furniture-haul-rules.ts` centralise exclusivité et validité, `furniture-hauling.ts` exécute, `player-furniture-hauling.ts` prépare les ordres et `furniture-haul-save.ts` croise les données. Les états des meubles restent dans `World.packed` ; aucun cache n'est autoritaire entre deux ticks.

Les clics simples successifs permettent d’atteindre le contenu au sol sous des colons superposés. Si un paquet coexiste avec un meuble installé, « Installer » vise le paquet, tandis que « Désinstaller » vise le meuble présent ; leurs réservations sont vérifiées séparément. La cellule conserve une inspection regroupée, sans prétendre offrir toute la sélection par objet de RimWorld.

La représentation reprend les lots de mobilier et de cargaisons existants. Le paquet posé tient compte de la surface table/tabouret/piquet. Pas de nouvelle boucle de squelette CPU par personnage, ni de mesh ajouté par transport ; cette réutilisation ne constitue pas une promesse de coût nul.

## Sauvegarde et limites

Schéma **26**. Valider strictement V25 avant migration ; aucun déplacement, filtre ni fournisseur n'est inventé rétroactivement. `filters.furniture` absent signifie refus des meubles, ce qui conserve les réglages des anciennes réserves. Le formulaire propose explicitement le nouveau filtre. Un faux schéma V25 contenant les nouveaux champs est refusé. Sauvegardes/snapshots conservent les files et les propriétaires de paquets.

Lit, table, tabouret et piquet seulement. Pas d'étagère, regroupement de zones en entités nommées, filtre par meuble/matériau/qualité, masse, dégâts, interdits, réparation ni autres familles. Coûts et compétences encore provisoires. Le dépôt de dégagement respecte notre filtre de réserve, restriction locale plus conservatrice que le validateur hors stockage lu dans le miroir. La fidélité complète dépend aussi des nombreux systèmes encore absents.

Les scénarios vérifient bilans, identités, concurrence, files, politiques, saturation, annulations, migration et reprise. Le pilote de colonie retire le piquet après le premier jour, le range réellement, puis le réinstalle. Les mesures 3/30/100 colons séparent ticks actifs et ticks après rangement ; résultats dans [validation](validation.md).
