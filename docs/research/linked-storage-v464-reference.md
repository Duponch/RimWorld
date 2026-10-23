# Réglages liés des étagères — référence de préparation V464

23 octobre2026. **Référence établie avant code pour V464 ; schéma286 prospectif en qualification.** Le produit publié demeure V463/schéma285. Les décisions de conservation, transport et transaction ci-dessous ont précédé l’implémentation ; les [résultats de qualification](../gameplay/linked-storage-v464.md) sont tenus dans la note du lot. Les autres domaines Core et leurs interactions demeurent dans le mandat.

## Provenance et comparaison

Core installé **1.6.4871 rev590**, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, vérifié avant/après les lectures. ILSpyCmd8.2 préexistant, huit classes nommées seulement : StorageGroup, StorageGroupUtility, StorageGroupManager, StorageSettings, Building_Storage, ITab_Storage, MinifyUtility et Zone_Stockpile. Aucun assembly entier, code propriétaire ou asset intégré au produit.

Les extractions privées fraîches sont dans `tmp/couple-v463/storage-core/` ; la [provenance détaillée](../../tmp/couple-v463/next-storage-primary.md) conserve lignes, empreintes XML, outil, namespace réel et essais de noms erronés. Furniture/Production XML identifient Shelf/ShelfSmall et leurs familles. La nouvelle extraction StorageSettings est identique à celle de V301, sans prendre cette ancienne lecture pour une règle fraîche à elle seule.

Comparaison Internet du23octobre : l’[annonce officielle de1.4](https://ludeon.com/blog/2022/10/biotech-expansion-and-update-1-4-available-now/) mène au [changelog officiel lié par Ludeon](https://docs.google.com/document/d/e/2PACX-1vRVirkmrIX9ladhT8FTEKtOA_JZ1dP8IK5ZaHL8zfd2pOOVm5xyPcO6JUKoNZeNt7RWg33vBx0uNqLP/pub), rubrique du jeu de base consacrée aux étagères. Elle confirme l’existence du regroupement de réglages hors DLC. Les détails actuels ci-dessous viennent du Core installé1.6, pas de valeurs anciennes du changelog. Le dernier billet officiel du21octobre2026, [Pick your storyteller](https://ludeon.com/blog/2026/10/pick-your-storyteller/), concerne des produits dérivés et n’établit aucune nouvelle règle de narrateur.

## Règles primaires établies

| Domaine | Règle actuelle vérifiée |
|---|---|
| Propriétaire | Le gestionnaire appartient à une Map. Un groupe a son identité, nom, politique unique et références de membres ; le bâtiment garde sa politique privée et son lien optionnel. |
| Politique effective | Un membre lié lit la politique du groupe. Copier capture l’effectif ; coller sur un lié modifie le groupe. Les réglages privés cachés ne sont pas une deuxième autorité effective. |
| Familles | Shelf et ShelfSmall héritent du même tag Shelf, toutes matières représentées compatibles. Même Map requise ; aucune proximité. Zone_Stockpile n’est pas membre ; Hopper/Bookcase ont d’autres tags. |
| Créer/lier | Au moins deux membres compatibles. Le premier membre retenu fournit son groupe existant ou sa politique effective à un groupe neuf. Les seuls membres sélectionnés rejoignent la destination ; les autres membres d’un groupe source ne sont pas fusionnés implicitement. |
| Rejoindre | Quitter l’ancien groupe copie d’abord son effectif, puis la destination impose sa politique. Rejoindre le groupe courant est sans effet. Ni fusion de filtres ni recherche de cible de secours. |
| Délier/dissoudre | La séparation copie l’effectif actuel, sans restaurer une ancienne préférence. Quand il ne reste qu’un membre, celui-ci est également séparé avec copie, puis le groupe est retiré. |
| Effets de réglage | Priorité et filtre notifient les vrais groupes/cellules de stockage. Leur admissibilité et leurs réservations changent ; l’action seule ne déplace aucune pile. Les exclusions physiques restent intersectées avec la politique utilisateur. |
| Emballer | Minifier retire la même Thing de la carte et la place dans son emballage. Le lien et l’appartenance demeurent ; une modification ultérieure du groupe reste effective pour l’emballé. DeSpawn n’est pas Destroy. |
| Réinstaller | Sur la carte du groupe, garder le lien. Sur une autre carte, retirer le membre et copier l’effectif dans sa politique indépendante. Le simple voyage ou l’entrée sur une autre carte encore emballé ne déclenche pas cette rupture. |
| Détruire | La vraie destruction retire le membre ; une dissolution éventuelle copie la politique au survivant. Le décès d’un porteur ne signifie pas que son meuble est détruit. |
| Travail et hasard | La liaison relue n’exige ni travail de colon, trajet, ressource, recherche, délai ou RNG supplémentaires. Les meubles et leur construction restent physiques. |
| Périmètre distinct | Le groupe natif est aussi ISlotGroup. Ses usages plus larges dans les factures ne sont pas déduits d’une seule liaison de politiques. |

La sélection multiple native dans ITab_Storage n’édite une politique commune que si elle désigne réellement un même groupe. Des réglages indépendants ou plusieurs groupes ne deviennent pas une politique fusionnée dont on devinerait les valeurs.

## Propriétaires locaux et coût envisagé

Le produit possède déjà [les étagères et cellules](../../src/sim/shelf-storage.ts), [le patch de politique propre](../../src/sim/shelf-commands.ts), [les formes sauvegardées](../../src/sim/shelf-save.ts), la [minification/réinstallation](../../src/sim/furniture-transfer.ts) et les transports humain/animal. La note V320 est historique ; détérioration et filières ajoutées depuis ne redeviennent pas absentes.

Le bâtiment original et ses cellules restent sur PackedFurniture, dans les vrais détenteurs déjà admis : carte, fret de groupe, WorldPawn, corps, caissons ou archives compactes selon leurs contrats. Un chantier ne contient qu’un descripteur ; aucune nouvelle copie d’étagère dans le job. Visiteurs/pod-rescues historiques refusent les étagères emballées dans leurs archives : aucun élargissement implicite de ce catalogue. Un mécanoïde n’acquiert pas un inventaire de meuble parce qu’il est connu du namespace.

Option examinée : un propriétaire de politiques durable au niveau campagne, avec origine de carte explicite et membres scalaires, conserve la politique unique. Chaque `shelf.settings` matérialise l’effectif, strictement vérifié contre ce propriétaire. Les transactions froides mettent toutes les projections à jour ensemble ; les lecteurs partiels existants restent locaux, sans recherche campagne par tick/image. Ce choix est une projection contrôlée, pas une copie indépendante ni un alias JavaScript utilisé comme contrat de sauvegarde. Le détail reste à adopter après fermeture des frontières ci-dessous ; aucun gain CPU/FPS mesuré.

Une ancienne politique privée native est cachée tant que le meuble est lié et n’est jamais restaurée au détachement. Si elle est conservée pour fidélité d’état, elle doit avoir son propre champ exact ; elle ne peut pas partager le sens de `shelf.settings` effectif. Aucune valeur ou liaison nouvelle n’est offerte aux étagères historiques.

## Interface réellement disponible et adaptation proposée

Le clic/cycle inspecte une étagère. Le double-clic sélectionne les objets similaires visibles, plafonnés à200 ; Maj+double-clic ajoute ce groupe. En revanche, Maj+clic et le rectangle ciblent les acteurs : aucune sélection individuelle de meubles par ces gestes n’est prétendue. Le panneau multi-objets actuel ne fournit pas un éditeur de stockage commun.

Parcours proposé depuis une inspection unique : choisir explicitement une autre indépendante pour créer A+B avec la politique annoncée d’A, ou choisir un groupe pour le rejoindre en adoptant sa politique. Ouverture et brouillon n’émettent aucune action ; confirmation nomme source, destination et membres concernés. L’inspection liée annonce la portée de chaque édition/collage. Délier conserve l’effectif et annonce la dissolution d’une paire. La sélection multiple existante peut fournir un raccourci, sans filtrer silencieusement une sélection invalide ni inventer un nouveau geste.

Ces menus/reformulations sont une **adaptation locale d’interaction** aux contrôles existants ; les règles de source/destination restent celles établies ci-dessus. Membres emballés ou absents sont comptés sans recevoir de cellule, de sélection ou d’action distante fictive. Politique, piles et capacité physique restent distinctes. Réponses tardives, carte/selection changées et appartenance périmée doivent refuser ou s’invalider avec leurs vraies identités, sans cible de remplacement.

## Corpus utilisateur et adoption

Le [cadre d’adoption](reference-adoption.md) reste applicable. Originaux XLSX/HTML conservés ; cellules XML relues en mémoire, aucune réécriture. Chapitres8/10/11/29/30/32 : sélection/commandes, stockage/logistique, production, représentation, sauvegardes et critères. Leurs propositions de file/index ne sont pas une architecture automatique.

| IDs réels et lignes XLSX | Adoption bornée |
|---|---|
| UI-001/002/003/004, Commandes2–5 | **Adopter** sélection distincte d’action ; **adapter** les menus aux gestes réellement disponibles. Le corpus ne prouve pas Maj+clic meuble dans le produit courant. |
| UI-024, Commandes25 | **Adopter** filtres/priorité sans transport instantané ; **adapter** l’affichage indépendant/groupe. L’entrée ne décrit pas à elle seule les gizmos natifs de liaison. |
| SYS/TEST-051, Systemes/Tests52 | **Adopter** identité, quantité, état et réservations des mêmes piles. Aucun nouveau détenteur matériel par regroupement. |
| SYS/TEST-052, Systemes/Tests53 | **Adopter** filtre/qualité/état/priorité réels ; **vérifier** tous les consommateurs et projections. La provenance S31/RecipeDef n’est pas celle de StorageGroup ; les classes fraîches servent pour cette règle. |
| SYS/TEST-053/054, Systemes/Tests54–55 | **Adopter** capacité réservée et prise/portage/dépôt physiques ; **vérifier** changement de filtre, destination détruite et refus sans perte. |
| CAT-044, Contenu45 | **Différer** les familles absentes ; le groupe d’étagères ne clôt pas zones/conteneurs ni tout le stockage. |

Aucun ID « stockage lié » inventé. Les TEST et statuts du corpus restent des critères, pas des résultats acquis.

## Décisions fermées avant implémentation

1. **Fin de carte : adaptation assumée.** Les [onze classes nommées supplémentaires](../../tmp/couple-v463/next-storage-map-removal-primary.md) montrent que le retrait natif marque les objets restants Discarded sans retirer leurs références StorageGroup ; les emballés déjà partis gardent leur lien en mémoire. Le groupe est sérialisé en profondeur sous la Map retirée, le bâtiment par référence seulement : cette chaîne ne garantit pas la recharge et aucun reload natif n’a été exécuté. Localement, conserver le propriétaire campagne et sa vraie origine retirée, retirer les seuls meubles réellement perdus dans le préflight MapRemoved et dissoudre à un survivant est une **adaptation de durabilité**, pas une règle native prétendue. Seuls les vrais emballés conservés peuvent rester membres après retrait ; une structure d’archive ou un compte scalaire de perte ne devient pas une étagère utilisable.
2. **RAW/public/résident : autorités distinctes.** Le RAW prouve la bijection globale ; une vue partielle vérifie ses seuls originaux et leur égalité de politique, sans inventer la présence des absents. Le propriétaire partagé et les projections effectives doivent entrer dans la même révision reconstruite, avec contrôle croisé avant adoption. Les origines retirées nécessaires étendent explicitement le producteur ciblé `worldPawnOriginProjection256`, depuis les vrais records retirés ; ce témoin scalaire déjà utilisé sans occupant n’est ni un Pawn ni une carte. Le [contrat de transport](../../tmp/couple-v463/next-storage-transport-contract.md) ferme les listes/champs concernés ; les seuls retiredCamps ne suffisent pas.
3. **Politique matérialisée et mutabilité.** Retenir un propriétaire campagne unique avec origine/ID/membres et copies effectives dans `shelf.settings` aussi en RAW. Conserver la politique indépendante native dans un champ séparé pendant le lien ; en sortant, l’effective gagne et l’ancienne valeur cachée disparaît. Égalité stricte des formes/valeurs, aucune réparation ni alias mutable. Préflighter toutes les feuilles écrites, y compris meubles emballés dans les détenteurs ; refus entier si nécessaire et immuable/inconnu, sans réveil ni mutation clinique.
4. **Transports engagés.** Le [contrat de politique](../../tmp/couple-v463/next-storage-policy-contract.md) identifie les risques des dépôts par étagère. Retenir une union des seules cellules dont l’effectif change, un préflight commun des humains stationnaires puis leurs dépôts avant tout Near animal, ce dernier pouvant conserver son vrai cargo en holding. Pour un humain encore sur son arête confirmée, garder le même objet porté via le mécanisme existant de cargo interrompu, sans dépôt à l’arrivée logique et sans effacer ses ordres indépendants. Tous les effets nécessaires sont admis avant la politique ; aucun résultat releaseWork ignoré ni synchronisation tardive par tick. Un noop même groupe ne réveille ni n’alloue rien.

Les noms et groupes sont distincts ; un renommage ne modifie ni les politiques ni les marchandises. L’interface principale sera l’inspection unique avec choix explicite et action de liaison/séparation, compatible avec les gestes actuels. La projection à coût local est une adaptation d’architecture ; ses performances et ses parcours demeurent à qualifier. Migration prévue :285 strictement validé, puis numéro286 seulement, sans groupe ni bénéfice offert ; futur fermé.

Le [contrat de propriétaires privé](../../tmp/couple-v463/next-storage-owners-contract.md) et le [contrat UI/corpus](../../tmp/couple-v463/next-storage-ui-contract.md) détaillent les callers actuels et les questions restantes. Cette préparation ne ferme ni domaine, campagne, ensemble ou cible FPS. Après le lot utile, tous les champs et interactions seront de nouveau comparés.
