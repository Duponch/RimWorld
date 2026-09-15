# Première électricité — V42

[Sources, provenance et adaptations](../research/power-reference.md). G2 reste ouvert : cette tranche livre génération au bois et lampes raccordées directement. Elle réutilise construction, composants, transport, température et lumière ; elle ne livre pas encore les conduits.

## Appareils et interactions

| Appareil | Construction neutre | Usage |
|---|---|---|
| Générateur à bois | 2×2, fixe ; 100 acier + 2 composants, 250 ticks locaux | 1 000 W, réservoir initial vide, capacité 75 bois, consommation 22 bois/jour indépendante de la demande |
| Lampe sur pied | 1×1, fixe ; 20 acier, 30 ticks locaux | 30 W, lumière ordinaire plafonnée à 50 %, démontable et transportable entière |

La construction conserve plans, cadres, livraisons réelles et dégagement. Le générateur interdit piles/zones ; la lampe accepte une pile compatible et une réserve. Les deux se traversent sans arrêt ordinaire (coûts 5 et 1,4 ticks). Le générateur utilise toute son empreinte pour les accès : le prélèvement reste sur la pile, le service de ravitaillement se fait sur une face accessible et dure 24 ticks. La vérification de livraison et la route doivent employer la même empreinte, jamais seulement son ancre.

Le stock de combustible conserve les unités communes de 600 par bois. `burnRemainder` cumule les cinquièmes : 11/5 unités par tick, sans flottant ni perte à la sauvegarde. L’automatisme commence à 30 % de capacité, avec réservations exclusives et portage actuel de dix unités. Désactiver cet automatisme ne coupe pas la combustion. La commande forcée apporte physiquement le bois même si l’automatisme est désactivé. **La commande manuelle marche/arrêt électrique n’est pas encore livrée** ; aucun bouton ne prétend remplacer le déplacement d’un colon vers l’interrupteur.

Déconstruction : restitution 50 acier + 1 composant pour le générateur, 10 acier pour la lampe. Dépôts, IDs, pertes par type, combustible retiré et PRNG sont prévalidés. Le générateur ne se minifie pas ; la lampe conserve identité/matériau en paquet et perd sa connexion lorsqu’elle est retirée.

## Raccordement et puissance

`power-topology.ts` construit les composantes cardinales des empreintes de générateurs : deux appareils qui se touchent par un angle restent séparés. Les lampes ne transmettent pas. Recherche automatique dans le carré de six cases autour de la lampe, sur toutes les cases des transmetteurs ; classement par distance au carré entre ancres, ordre spatial stable pour les égalités. Les murs ne bloquent pas le raccordement. Une connexion valide reste attachée, même si une source plus proche apparaît ou si le générateur se vide.

`power.ts` réconcilie les parents et distribue la puissance. Démarrage progressif et délestage aléatoires, sans batterie : 33 lampes de 30 W peuvent rester allumées sur 1 000 W, la 34e attend. Dix frontières de temps Core par tick local évitent d’aliaser les périodes non divisibles par dix. Une panne de carburant cesse immédiatement de produire ; les consommateurs se délestent progressivement. Le PRNG et les états `on` sont persistants ; les réseaux et index sont dérivés.

Les réseaux équilibrés sans appareil en attente sautent les dix scans de candidats, sans changer l’ordre des tirages des autres réseaux. Le cache appartient au monde ou à l’inspecteur. Sa clé contient dimensions, IDs et positions des transmetteurs, pas leur combustible. Il stocke la topologie, sans garder des objets `Structure` périmés après remplacement de snapshot. Le graphe ne dépend ni de la navigation ni des pièces. Aucune diffusion électrique par image ou lecture GPU bloquante.

## Milieu et présentation

Sources partagées dans `light-sources.ts` : feu existant, générateur actif (rayon brut 6, canal dominant 217) et lampe active (rayon brut provisoire 12, canal dominant 214). Le diffuseur logique commun tient compte des obstacles ; la lumière artificielle ne devient pas du soleil agricole. Le générateur réchauffe l’air retenu, sans plafond de confort comme celui du feu ; la lampe ne chauffe pas. Intégration thermique continue héritée de V38, différente des impulsions Core.

Le rendu ajoute huit parties par générateur et quatre par lampe au lot de mobilier préparé. Aucun `PointLight`, matériau ou ombre supplémentaire par appareil. La texture lumineuse reste partagée. Une modification de pièce hors des bornes de propagation des sources ne relance plus leur diffusion : comparer les obstacles locaux des deux topologies immuables suffit. Le canal d’opacité graphique possède son invalidation séparée, pour conserver les nouveaux murs/rochers même quand le champ lumineux est identique. Les changements `on` et de parent sont des phases discrètes observées par le bridge, appliquées au même temps de présentation que le monde. L’inspection distingue absence de combustible, raccordement absent et alimentation en attente, avec bilan W du réseau. Générateur dans Architecte/Énergie ; lampe dans Architecte/Meubles.

## Sauvegardes et contrôle

V41 est strictement validée avant passage à V42, sans appareil, filtre, ressource ou connexion inventés. Rejet des appareils nouveaux en V41, de l’état électrique sur un autre objet, des mauvais parents, du combustible hors capacité, du reste fractionnaire hors 0–4 et d’une lampe emballée encore active. Une réinstallation ne pivote pas la lampe. Le bilan de pertes peut contenir `lostComponents` ; ce n’est pas un stock.

Trois scénarios profonds dans `power.test.ts` : construction et transport, toutes les faces du réservoir, retrait/réinstallation, restitutions ; réseaux/portée/rétention/surcharge/combustion et reprise ; versions et états invalides. Le pilote de colonie extrait 200 acier au total, en incorpore 150 dans atelier/générateur/lampe, extrait six composants et en incorpore deux. Les bilans incluent les matériaux incorporés pour éviter une extraction automatique sans fin.

Le parcours natif `power.spec.ts` exerce vrais boutons, construction, lumière, déconstruction et rechargement. `power-render-bench.mjs` mesure 3/100 mineurs avec autant de générateurs/lampes, puis des changements simultanés du champ. [Résultats mesurés](validation.md), sans promesse de couverture exhaustive.

Conduits, interrupteurs physiques, batteries, appareils frigorifiques, autres producteurs, recherche, compétences, qualité/HP/dégâts, incidents électriques et réglages avancés de lumière restent absents. Les bâtiments sont disponibles dans le départ unique ; cela ne simule pas leurs prérequis de recherche/Construction 4.
