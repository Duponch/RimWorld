# Construction avec matériau — contrat V30–V33

V43 applique désormais la [compétence Construction](skills.md) aux phases concernées : vitesse relative, apprentissage seulement lors de la finition d’un cadre approvisionné et de la déconstruction à coût. Les durées du catalogue restent des unités de travail neutre.

V42 ajoute deux recettes fixes explicites en acier : générateur 100 acier + 2 composants, lampe 20 acier. Les ingrédients acceptent `ItemId`, distinct du matériau structurel substituable ; aucun remplacement du composant par de l’acier. Aucun profil historique sans matériau pour ces nouvelles définitions. [Électricité et sauvegarde](power.md).

V40 ajoute `passive-cooler` : bois fixe explicite, 50 unités livrées et 200 ticks Core de travail sans facteur de matériau, convertis en 20 ticks neutres locaux. Une case, orientation zéro. Ces mêmes 50 bois constituent le combustible initial ; [contrat](passive-cooling.md).

[Recherche fraîche et décisions](../research/construction-materials-reference.md), [chantiers](construction.md), [logistique](material-logistics.md), [réinstallation](furniture-transfer.md). Le choix bois/acier et cinq pierres est livré pour mur, lit simple, table 1×2, tabouret et piquet ; le feu reste à 20 bois fixes. Les nouvelles quantités et durées sont dans la recherche. V31 ajoute la [table de taille à ingrédients mixtes](stonecutter.md). V33 ajoute les cinq blocs, leur travail constructif et le repos réduit des lits. Résistance, feu, beauté, valeur et qualité restent absents ; [vérification précise](../research/stone-buildings-reference.md).

## Définitions et livraison

`building-materials.ts` centralise les facteurs de construction et de repos réellement utilisés ; `construction-materials.ts` construit les recettes immuables et leurs matériaux admissibles. Pierre interdite à la table de taille, bois seul au feu. Base × facteur + offset 140 précède la conversion locale ; ne pas confondre travail de construction et fabrication. `Job.material` et `Structure.material` sont facultatifs : **absence = recette historique V1–V29**, présence = recette actuelle du matériau indiqué. `JOB_WOOD_COST` et `JOB_DURATION` conservent les valeurs historiques ; aucun nouveau constructeur ne doit lire ces constantes pour résoudre un ouvrage typé.

Chaque recette contient une liste d’exigences agrégées par `ItemId`, son travail Core et sa durée locale. Une désignation ordinaire prend bois par défaut ; un matériau incompatible est refusé avant mutation. Les commandes de récolte/retrait/installation n’acceptent pas de matériau substituable. L’objet entier porte déjà le sien.

L’autorité matérielle demeure dans les piles. Une livraison réserve simultanément la source et la capacité **du même type** au chantier, y compris en file forcée. La première livraison transforme le plan en cadre. Construction peut approvisionner sans Transport ; Transport seul ne finit pas le cadre. Le constructeur ne commence que lorsque chaque exigence est physiquement satisfaite. Du bois ne remplace jamais un manque d’acier. Achèvement incorpore les piles au bâtiment ; annulation les restitue sans conversion.

`escrow` et `World.stock` restent les vues historiques bois/nourriture ; zéro bois dans un cadre en acier ne signifie pas qu’il est vide. Les diagnostics et l’inspection lisent les exigences et les piles typées. Le planner agrège livraisons/réservations par `(jobId, item)` pendant sa décision synchrone ; aucun cache ne survit à une mutation ou à un tick.

## Conservation de l’objet et restitution

La désinstallation, le paquet et la réinstallation transportent la même `Structure`, donc son matériau et le propriétaire du lit. Les intentions de déconstruction copient le matériau pour résoudre la durée et valident leur correspondance à la cible.

Les restitutions de déconstruction sont préplanifiées dans une vue possédant ses piles et ses escrows. Plusieurs exigences ne peuvent promettre une même cellule à des types incompatibles. Les limites de piles, d’identités et de compteurs sont vérifiées avant retrait, tirage PRNG ou perte. `lostSteel?` et `lostBlocks?` complètent le bilan historique ; ce dernier conserve un compteur par ItemId de bloc, sans mélange des pierres. Champs omis tant qu’aucune perte correspondante ne survient. Un dépassement de compteur refuse le retrait atomiquement. L’acier incorporé et la perte comptable ne sont pas du stock disponible.

## Migration et présentation

**V29 est validée strictement avant V30.** Aucune ancienne structure, intention, quantité, durée, carte, route ou identité n’est régénérée. Les objets sans matériau restent sans matériau, y compris après un transfert entier. Les schémas V2–V4 sont validés par leur catégorie historique avant l’introduction des ItemId en V5. Un champ de matériau, un ingrédient non requis ou une perte d’acier cachés dans un ancien schéma sont refusés. Une sauvegarde invalide ne remplace pas la partie active.

Architecte conserve ses catégories et expose Matériau pour les six familles concernées, atelier V31 compris. Les coûts affichés et les commandes viennent de la même recette. Les structures bois/acier/pierre partagent les géométries et lots instanciés ; seules les couleurs des parties solides changent, pas le matelas ou l’empreinte. Les clés de révision incluent le matériau, même après rechargement ou emballage. L’aperçu de collision est commun car l’empreinte ne dépend pas du matériau.

## Contrôles et étapes suivantes

Trois scénarios approfondis ajoutent : fournisseurs concurrents, absence de substitution, annulation pendant portage, reprise exacte, refus d’ingrédient ; lit acier emballé/réinstallé avec propriétaire et remboursement atomique ; migration V29 d’un lit à 8 bois, nouvel ordre à 45 et refus des champs futurs. Les scénarios préexistants et le pilote sont ajustés aux nouveaux budgets, sans enrichir artificiellement le départ naturel. Le parcours UI construit bois et acier, sauvegarde et inspecte le résultat ; le pilote long garde sa colonie naturelle. [Preuves](validation.md).

`construction-bench.ts` mesure 3/30/100 bâtisseurs sur 250² : mur bois et tabouret acier par colon, matériaux réels, construction terminée et bilan exact. Les ticks et snapshots sont chronométrés séparément. Ce cas synthétique ne constitue pas une mesure de FPS.

Atelier mixte V31 et [production typée V32](stonecutting.md) livrés. V33 construit les cinq variantes de pierre des cinq familles admissibles : 25 variantes, aucun nouveau type de bâtiment. Le lit reçoit physiquement le facteur de repos 0,9 seulement lorsque le colon dort à sa place réservée ; lit bois/acier/historique et sommeil au sol conservent leurs gains. L'UI montre cette différence avant placement et à l'inspection.

**V32→V33** : validation stricte avant changement du numéro ; aucune donnée ni intention inventée. Ancien fichier avec un matériau pierre dans chantier, bâtiment, paquet ou cible de retrait refusé ; `lostBlocks` interdit avant V33. Les piles V32 de blocs restent inchangées. Trois scénarios approfondis contrôlent matrices de travail, livraisons incomplètes/concurrentes, remboursement typé, annulation et reprise, lit utilisé puis transporté, saturation/limites de compteurs et refus des champs futurs.

Le pilote CPU de cinq/huit jours construit un premier mur avec cinq blocs fabriqués sur place puis rétablit sa réserve : 40 produits = 5 incorporés + 35 rangés. À trois jours, le joueur UI peut encore avoir quinze blocs et aucun nouveau fragment ; il doit alors accepter et sauvegarder une nouvelle désignation de minage. Son extraction complémentaire répond au manque visible, sans changer les tirages. `construction-bench.ts --stone` enrichit le banc existant : 3/30/100 bâtisseurs, mur + tabouret chacun, types cyclés, bilans par pierre et snapshots distincts. Portes/toits/pièces sont les prochaines dépendances ; propriétés absentes de la pierre restent dans la recherche.
