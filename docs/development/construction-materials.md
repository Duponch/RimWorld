# Construction avec matériau — contrat V30

[Recherche fraîche et décisions](../research/construction-materials-reference.md), [chantiers](construction.md), [logistique](material-logistics.md), [réinstallation](furniture-transfer.md). Le choix bois/acier est livré pour mur, lit simple, table 1×2, tabouret et piquet ; le feu reste à 20 bois fixes. Les nouvelles quantités et durées sont dans la recherche. Les ateliers à plusieurs ingrédients, blocs de pierre, statistiques de matériau et qualité restent absents.

## Définitions et livraison

`construction-materials.ts` centralise les recettes immuables. `Job.material` et `Structure.material` sont facultatifs : **absence = recette historique V1–V29**, présence = recette actuelle du matériau indiqué. `JOB_WOOD_COST` et `JOB_DURATION` conservent les valeurs historiques ; aucun nouveau constructeur ne doit lire ces constantes pour résoudre un ouvrage typé.

Chaque recette contient une liste d’exigences par `ItemId`, son travail Core et sa durée locale. Une désignation ordinaire prend bois par défaut ; un matériau incompatible est refusé avant mutation. Les commandes de récolte/retrait/installation n’acceptent pas de matériau substituable. L’objet entier porte déjà le sien.

L’autorité matérielle demeure dans les piles. Une livraison réserve simultanément la source et la capacité **du même type** au chantier, y compris en file forcée. La première livraison transforme le plan en cadre. Construction peut approvisionner sans Transport ; Transport seul ne finit pas le cadre. Le constructeur ne commence que lorsque chaque exigence est physiquement satisfaite. Du bois ne remplace jamais un manque d’acier. Achèvement incorpore les piles au bâtiment ; annulation les restitue sans conversion.

`escrow` et `World.stock` restent les vues historiques bois/nourriture ; zéro bois dans un cadre en acier ne signifie pas qu’il est vide. Les diagnostics et l’inspection lisent les exigences et les piles typées. Le planner agrège livraisons/réservations par `(jobId, item)` pendant sa décision synchrone ; aucun cache ne survit à une mutation ou à un tick.

## Conservation de l’objet et restitution

La désinstallation, le paquet et la réinstallation transportent la même `Structure`, donc son matériau et le propriétaire du lit. Les intentions de déconstruction copient le matériau pour résoudre la durée et valident leur correspondance à la cible.

Les restitutions de déconstruction sont préplanifiées dans une vue possédant ses piles et ses escrows. Plusieurs exigences futures ne peuvent promettre une même cellule à des types incompatibles. Les limites de piles, d’identités et de compteurs sont vérifiées avant retrait, tirage PRNG ou perte. `lostSteel?` complète le bilan historique ; champ omis tant qu’aucune perte d’acier ne survient. L’acier incorporé et la perte comptable ne sont pas du stock disponible.

## Migration et présentation

**V29 est validée strictement avant V30.** Aucune ancienne structure, intention, quantité, durée, carte, route ou identité n’est régénérée. Les objets sans matériau restent sans matériau, y compris après un transfert entier. Les schémas V2–V4 sont validés par leur catégorie historique avant l’introduction des ItemId en V5. Un champ de matériau, un ingrédient non requis ou une perte d’acier cachés dans un ancien schéma sont refusés. Une sauvegarde invalide ne remplace pas la partie active.

Architecte conserve ses catégories et expose Matériau uniquement pour les cinq familles concernées. Les coûts affichés et les commandes viennent de la même recette. Les structures bois/acier partagent les géométries et lots instanciés ; seules les couleurs des parties solides changent, pas le matelas ou l’empreinte. Les clés de révision incluent le matériau, même après rechargement ou emballage. L’aperçu de collision est commun car l’empreinte ne dépend pas du matériau.

## Contrôles et étapes suivantes

Trois scénarios approfondis ajoutent : fournisseurs concurrents, absence de substitution, annulation pendant portage, reprise exacte, refus d’ingrédient ; lit acier emballé/réinstallé avec propriétaire et remboursement atomique ; migration V29 d’un lit à 8 bois, nouvel ordre à 45 et refus des champs futurs. Les scénarios préexistants et le pilote sont ajustés aux nouveaux budgets, sans enrichir artificiellement le départ naturel. Le parcours UI construit bois et acier, sauvegarde et inspecte le résultat ; le pilote long garde sa colonie naturelle. [Preuves](validation.md).

`construction-bench.ts` mesure 3/30/100 bâtisseurs sur 250² : mur bois et tabouret acier par colon, matériaux réels, construction terminée et bilan exact. Les ticks et snapshots sont chronométrés séparément. Ce cas synthétique ne constitue pas une mesure de FPS.

Prochaine dépendance : atelier de taille avec ingrédients fixes et matériau substituable, puis métier/recettes et blocs typés. Agréger les exigences identiques avant réservation, enrichir les mêmes scénarios, vérifier les règles et préserver les propriétés de la pierre avant ses variantes de mobilier.
