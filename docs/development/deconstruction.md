# Déconstruction — contrat V24

[Règles et sources](../research/deconstruction-reference.md), corpus chapitre 10 **SYS-058 / TEST-058**. Ce contrat complète les [chantiers](construction.md), les [ordres](player-orders.md) et la [logistique](material-logistics.md).

## Intention et action

`Job.kind = deconstruct` désigne un bâtiment existant par `deconstruction.structureId` et son type. Position, orientation et empreinte doivent correspondre à cet objet. Le second carreau d’un meuble tourné sélectionne le même objet ; un rectangle ne crée qu’une intention par bâtiment. La désignation ne consomme ni matière ni temps de travail et ne modifie pas l’obstacle ou les zones.

Le fournisseur appartient à Construction, après dégagement, livraison et finition ordinaires de cette famille. Accès cardinal extérieur à l’empreinte, trajet physique, réservation et orientation utilisent les contrats communs. L’action peut être imposée ou mise en file. Un ordre de retrait seul ne remplace pas le maintien V23 ; le fournisseur est admissible pour une priorité de Construction déjà attachée à cette cellule.

Sommeil, siège de repas, jeux au piquet, cuisine et ravitaillement réservent le bâtiment utilisé. Une désignation en attente ne les interdit pas. Dès qu’un retrait est réservé, aucun autre colon ne peut commencer cet usage exclusif. La file du même colon peut suivre son utilisation actuelle. La propriété inactive d’un lit n’est pas une réservation ; elle disparaît avec le lit. La table n’est pas réservée par ses convives : son retrait conserve leur portion tenue et leur position, tout en retirant la référence à la surface avant l’ingestion.

Annuler retire l’intention sans effet sur le bâtiment. Interrompre le travail remet sa progression à zéro ; sauver/recharger ne l’interrompt pas. En cas de dépôt impossible, le bâtiment reste entier et le travail est relâché pour une nouvelle tentative. Le compteur FPS et le temps de simulation restent indépendants de ces transitions.

## Transaction et bilan

`deconstruction-rules.ts` porte durée, cible et réservation ; `deconstruction.ts` prépare et applique la restitution ; `deconstruction-save.ts` valide formes et références. Le moteur appelle ces responsabilités au moment de l’achèvement.

La restitution vaut la moitié du coût de la définition locale, avec arrondi aléatoire des unités impaires. Le PRNG est prévisualisé et engagé uniquement si le retrait peut se terminer. Un feu ne rend ni sa construction ni son combustible. Les places sont calculées dans une vue où seul le bâtiment ciblé et son ordre ont été retirés. La case libérée est essayée directement ; seul son manque de capacité déclenche une recherche de proximité. Réservations de type/quantité, limite de piles et budget d’identités sont vérifiés avant mutation.

`world.deconstructed` contient `count`, `lostWood` et `fuelTicks`. Les deux derniers sont des termes de bilan, pas un stock disponible : bois non rendu pour les ouvrages ordinaires ; historique de combustible brûlé **et restant** retiré avec les feux. Un feu construit transforme déjà son coût initial en combustible, donc ne pas le compter deux fois. Le bilan du pilote est `bois présent + bois des arbres + ouvrages + combustible des feux + lostWood + fuelTicks / 600`. La perte ne crée aucun objet transportable.

L’achèvement libère la navigation dans le tick même, enlève la cible une seule fois, conserve les piles compatibles déjà présentes et crée les nouveaux matériaux au sol. Les futurs dommages/réseaux/pièces ne doivent pas contourner cette discipline de validation préalable ; ils auront leurs propres causes et politiques de restitution.

## Persistance et présentation

**V23 → V24** : valider V23 avant d’ajouter le bilan nul. Aucun bâtiment, travail, identité, trajet, quantité, âge ou priorité n’est réécrit. Les versions anciennes ne peuvent pas masquer un bilan ou une cible de déconstruction. V24 refuse une cible absente ou incohérente, une progression laissée sans travailleur, une réservation concurrente ou des matériaux livrés à un retrait.

Les snapshots transportent automatiquement l’état dynamique. `JobLayer.ts` est extrait de `ColonyRenderer` : les croix de retrait occupent les mêmes lots de boîtes instanciées que les cadres. Aucune géométrie par colon, aucun travail de déconstruction sur GPU, aucune nouvelle autorité dans le rendu. Les marqueurs fixes ne sont pas reconstruits pour chaque unité de progression. Le mobilier conserve ses buffers de présentation lors du retrait. Les lots de piles sont désormais réservés par chunk au chargement puis compilés, même vides ; aucune nouvelle allocation de lot n’est nécessaire lors du premier dépôt dans une autre zone. Sur 250×250 : 256 lots × 256 instances × 19 flottants, soit environ 4,75 Mio de tableaux CPU préalloués, plus les buffers GPU associés (VRAM non mesurée). Les lots vides ne sont pas réécrits à chaque snapshot. Charger/créer une carte prépare sa présentation avant de réactiver les interactions de la coque UI et les contrôles de vitesse ; le dialogue de nouvelle carte reste modal pendant cette préparation. Cela ne garantit pas que tous les pipelines futurs soient déjà compilés.

## Contrôles et suites

Quatre scénarios profonds couvrent ordre des fournisseurs, file/annulation/interruption, empreintes, deux arrondis, sol saturé, limites d’identités, repas/sièges/lits/piquets/feux, remboursement sans duplication, migration refusée et replay/snapshots. Le pilote de camp construit un pan temporaire puis ouvre le passage après la première journée, avec conservation du bilan. Le parcours navigateur exerce Architecte, inspection, priorité, annulation et sauvegarde.

Les mesures reproductibles séparent simulation (`scripts/deconstruction-bench.ts`) et rendu natif (`scripts/deconstruction-render-bench.mjs`). Résultats dans [validation](validation.md). Réinstallation, minage, matériaux multiples, réparation, dégâts, compétences/XP/qualité, factions et réseaux restent ouverts selon [ROADMAP](../ROADMAP.md).
