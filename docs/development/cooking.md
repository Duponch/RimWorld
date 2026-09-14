# Cuisine, factures et combustible

Contrat introduit en V10, complété en V11 et validé dans les scénarios décrits ci-dessous. [Recherche de référence](../research/cooking-reference.md) : chap. 11/32, SYS-062..064, UI-025. Les effets absents du feu et des recettes restent dans l’[inventaire](../gameplay/implementation-status.md).

## Chaîne physique

Un feu demande 20 bois réellement livrés et 20 ticks de construction. Il naît avec 12 000 ticks de combustible, correspondant aux 20 bois. Chaque tick allumé diminue `fuel.ticks` et augmente `fuel.burned`. Une recharge de dix bois ajoute 6 000 ticks après prélèvement, trajet et 24 ticks de service. Le poste est réservé pendant cuisine ou recharge ; aucun autre colon ne consomme sa capacité au même moment. Les besoins peuvent interrompre le travail avec dépôt conservateur de la cargaison.

Une facture de repas simple choisit dix unités parmi baies et riz admis, réserve les sources et les cases de dépôt, puis les rassemble par portages réels. Chaque case conserve une seule pile compatible. Le colon rejoint exactement la place orientée du poste. Les ingrédients déposés restent des piles au sol réservées ; ils ne sont ni consommés à la prise ni cachés dans un inventaire d’atelier abstrait.

Après 60 ticks de travail au feu allumé, une transaction retire les dix unités, crée un repas simple porté et décrémente une facture X fois une seule fois. Le chef transporte ce produit vers une réserve admissible ou le pose au sol. Une destination devenue indisponible est replanifiée ; aucun produit ne disparaît faute de place.

Les factures sont ordonnées et disposent des trois modes de répétition, suspension, filtres baies/riz, rayon et destination. « Jusqu’à X » compte produits en réserve et cargaisons courantes ; un produit lâché hors réserve n’arrête pas durablement la facture. Un travail déjà commencé n’est pas annulé parce qu’un autre poste atteint le seuil. Modifier ou supprimer sa facture l’interrompt explicitement et conserve la matière.

## Frontières et données

- `cooking-types.ts` : structures persistantes de facture, réservation et tâche ; aucun objet Three/DOM.
- `cooking-bills.ts` : paramètres et comptage ; `cooking-planner.ts` propose un travail sans modifier le monde.
- `cooking.ts` : collecte, dépôt, travail et sortie ; `cooking-commands.ts` applique les éditions après prévalidation des cargaisons.
- `fuel.ts` : réservoir et combustion ; le transport utilise le contrat commun de `hauling.ts`, avec progression de service sauvegardée.
- `cooking-save.ts` : références, réservations, phases, quantités, capacité et exclusivité. Le validateur général conserve ses invariants de propriétaire, chemin et occupation.
- `ui/bill-controls.ts` et `ui/fire-controls.ts` : véritables commandes du worker. L’inspecteur appartient au poste sélectionné ; la priorité Cuisine reste dans Travail.
- `diagnostics.ts` et `cooking-diagnostics.ts` : requêtes sans mutation pour les phases du colon et les blocages connus de facture. L’interface distingue ingrédients manquants, combustible, métier désactivé et place obstruée ; une quantité présente ne certifie pas son accessibilité. Aucune exploration de carte n’est déclenchée par l’inspection.
- `render/campfire-parts.ts` : parties procédurales dans les lots de mobilier et de couleur non éclairée existants. Seul le changement allumé/éteint modifie leur contenu ; le compteur de combustible ne recrée pas de géométrie chaque tick.

Depuis V11, les ingrédients et repas suivent le [contrat de conservation](food-preservation.md). Un ingrédient expiré interrompt sans produit ni décrément de facture ; le chef conserve sa cargaison survivante tant qu’un dépôt physique reste impossible. Le produit neuf démarre frais.

**Migration V9→V10** : ajout `pawn.cooking = null` et priorité Cuisine 2, sans déplacer les personnes ou modifier les travaux existants. Aucun ancien feu n’existe à migrer. Les factures, tâches de cuisine, combustible et repas simples sont refusés si présentés comme données d’une ancienne version. Les migrations V1–V8 passent d’abord par leurs contrats historiques.

`fuel.burned` conserve le bilan du bois de la structure : combustible restant + brûlé + bois hors feu. Une future déconstruction devra transférer ce bilan avant de retirer la structure. Pour l’alimentation, **dix ingrédients deviennent un repas** : le test conserve unités initiales + récoltes = unités présentes + unités mangées + 9 × repas fabriqués. Ce bilan ne prétend pas que la nutrition reste identique pendant la cuisson.

## Interruptions et limites

La recette simple n’a pas d’objet inachevé : annulation remet le travail à zéro, ingrédients encore présents. Rechargement d’une tâche active conserve son progrès. Une cargaison impossible à déposer empêche l’annulation de détruire son contenu ; une commande invalide ne remplace jamais l’état courant.

Les données par ingrédient retiennent type, quantité, pile et phase source/porté/posé. `actionCell` décrit la cible actuelle de l’interaction pour orienter le personnage ; la pose graphique n’a aucune autorité sur la transformation.

Les stocks, compétences, fraicheur, chaleur, pluie, lumière fonctionnelle et autres paramètres non livrés ne doivent pas être supposés existants. Les adaptations de temps, de réservoir entier et de place de dépôt sont détaillées dans la recherche, sans revendication de parité à 100 %.

## Validation de la livraison

Trois scénarios profonds dans `tests/production.test.ts` combinent construction/combustion/recharge, recette mélangée et sauvegarde/interruption, deux postes disputant une seule recette, factures ordonnées, comptage et recharge sans Transport. Le pilote commun de colonie construit un feu et maintient des repas ; ses parcours cœur/UI contrôlent les transformations dans leurs bilans. L’intégration courte exerce la vraie interface, le worker, les contrôles et le rendu GPU.

Le benchmark `scripts/cooking-bench.ts` utilise 3/30/100 colons actifs sur une carte naturelle de 250² avec camps synthétiques. Il distingue charge de production et preuve de progression humaine. Les parcours cœur sur trois graines, les trois jours via la véritable UI et les audits CPU/WebGPU passent ; mesures, résultats et limites de navigation sont consignés dans [validation](validation.md).

## Commandes contextuelles V20

V19 ajoute le ravitaillement manuel par le menu du feu, même au-dessus du seuil ou automatisme désactivé. Le drapeau persistant distingue cet ordre de la recharge automatique ; désactiver l’automatisme ne l’annule pas. Une recharge en file réserve aussi le poste et bloque la cuisine concurrente. V20 ajoute **Cuisiner un repas simple** ou **Ravitailler avant de cuisiner** quand le feu est vide. Cuisine suffit pour ce sous-travail, même sans Transport. Les factures suspendues/satisfaites et ingrédients exclus ne sont pas contournés. Une recette en file réserve ingrédients, dépôts typés et poste ; le changement/retrait de sa facture ou une source périmée libère ses engagements. Une seule recette par ordre ; poste exclusif, y compris pour une seconde recette du même colon. [Contrat](player-orders.md), [relecture et limites V20](../research/cooking-orders-reference.md).
