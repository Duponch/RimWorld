# Vente de textiles au comptoir civil V203 — livré dans son périmètre ciblé

Lot G5 borné : transformer une production renouvelable existante en argent, puis en médicaments ou composants, pendant un voyage physique. [Socle V193](caravan-trade-v193.md), [recherche Core](../research/caravan-sales-core-v203.md), [roadmap](../ROADMAP.md). **Schéma 185 livré dans le périmètre de la [preuve ciblée](../history/validation-commercial-sales-v203.md)** : validation stricte de 184 puis migration de version seule, sans fret, argent, vente ni stock rétroactifs.

## Circuit et propriété

Le joueur choisit des piles au sol de tissu ou de laine de muffalo, par identité et quantité. Deux ou trois rations restent obligatoires ; l'argent embarqué peut être nul uniquement avec du fret positif. Les réservations concurrentes, toutes les routes, les 32 sources maximum et la charge sont prévalidées ensemble avant mutation. Chargement au contact, annulation conservant les prises, sortie réelle, propriétaire hors carte et retour inventorié/dépôts ordinaires restent ceux de V193. Aucun stock du foyer n'est vendable à distance. Les invendus reviennent avec leur propriétaire.

Masses Core : tissu 26 g et laine de muffalo 28 g par unité ; équipement et vêtements comptent toujours dans les 35 kg. Prix de vente commun V88, bonus de site +0,02 après le clamp du négociateur, valeur de tissu 1,5 et laine 2,7, sans facteur PV ou qualité ajouté à ces ressources. Conditions présentes conservées lors des divisions/transferts. Aucun nouveau produit, animal ou recette.

## Échange

Une commande de vente distincte des achats V193 engage un devis courant atomiquement. Le devis capture marchandises réellement portées, fonds du poste, prix, quantités, charge et identité du négociateur ; un devis changé ou une borne dépassée refuse sans mutation ni RNG. Le poste reçoit les vraies piles, le voyageur reçoit son argent depuis les piles du poste. Les piles entières gardent leur identité, les divisions leur état. Argent et biens s'engagent ensemble après validation d'un draft et des bornes 256 inventoriées, 512 au poste et 32768 dans le registre colonial.

Adaptations explicites : ventes et achats sont deux paniers successifs, donc deux arrondis de monnaie, au lieu du panier net Core ; aucun don avec paiement incomplet, une vente dépassant les fonds est refusée ; les textiles vendus restent dans le conteneur du poste mais leur rachat n'est pas ouvert dans cette tranche. Le renouvellement strictement après trente jours, à l'arrivée seulement, conserve les trois tirages V193 et remplace explicitement le stock. Les textiles ne sont jamais générés rétroactivement.

Les cumuls bruts restent distincts : argent porté = embarqué + encaissé − payé ; textile porté = embarqué − vendu. Poste et voyage conservent ventes et encaissements, reçus bornés à 32. Extensions persistantes facultatives : absence historique signifie aucun fret ni vente ; les validateurs 184 rejettent les champs et textiles futurs avant toute migration.

## Validation et limites

Contrôles ciblés : départ sans argent, prises et réservations réelles, refus/annulation, source détruite, devis périmé, fonds/capacité, identités et conditions, vente suivie d'achats dépassant l'argent initial, conservation et continuation, invendus déposés, ancien 184 strict et refus atomique de snapshots. Une scène publique préparée et un parcours natif exercent le vrai circuit. Mesure CPU isolée du devis/réconciliation puis navigateur et présentation successifs, sources gelées ; aucune prétention de coût nul, gain global ou parité commerciale exhaustive.

La [preuve V203](../history/validation-commercial-sales-v203.md) conserve72 ciblés uniques/17 fichiers par composition, build, parcours public natif et sous-coûts CPU. Ces résultats ne clôturent pas G5, le commerce général ni une campagne économique naturelle. La limite des fiches de test passe de48 à64 avec garde frontière64/65 ; payloads toujours chargés à la demande et plafond de manifesteHTTP128Kio conservé.
