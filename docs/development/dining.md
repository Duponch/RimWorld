# Repas à table, confort et instrumentation

Livraison G1 anticipée, 13 septembre 2026. [Recherche, provenance et incertitudes](../research/dining-reference.md). G0 n'est pas clos ; [ROADMAP](../ROADMAP.md) reste le plan canonique.

## Contrat métier

Le catalogue ajoute table en bois 1×2 et tabouret en bois 1×1. Leurs 28 et 25 bois doivent être livrés physiquement avant leurs 53 et 32 ticks de construction. Les emprises servent au placement, à l'accès de chantier, à l'inspection et à la navigation. Q/E tourne la table ; l'orientation d'un tabouret n'est pas un filtre de repas. Table et plan bloquent le déplacement : adaptation 3D explicite, à réexaminer avec les profils de franchissement.

`needs.ts` orchestre les urgences et le sommeil ; `eating.ts` gère la matière et les phases de repas ; `dining.ts` choisit la place ; `wellbeing.ts` gère confort et premier souvenir. Ces modules ne connaissent ni Three.js ni le DOM.

| Phase persistée | État et engagement | Sortie |
|---|---|---|
| pickup | Une unité de pile au sol réservée, partagée avec les réservations de transport | Approche puis transfert réel d'une unité vers le colon |
| choose-spot | Une portion possédée par le colon, sans destination ni progression | Siège disponible avec table, sinon place debout proche ; attente si budget de recherche épuisé |
| travel | Portion portée et destination réservée, avec IDs du siège et de la table lorsqu'ils existent | Arrivée exacte sur la case, jamais ingestion depuis une case voisine |
| ingest | Portion toujours possédée, acteur immobile sur sa place | Après 50 ticks, consommation, nutrition et éventuel souvenir ; libération de place |

La recherche de siège mesure son rayon de 32 cases depuis la position après prélèvement. Elle classe les candidats par distance géométrique puis ID, tout en vérifiant leur accessibilité réelle. Les surfaces sont indexées une fois par décision ; la direction du siège est ignorée. Les réservations des autres repas et couchages, ainsi que l'occupation des colons, excluent une place. Un plateau adjacent suffit à éviter le souvenir même pendant un repas debout.

Sans siège, le repli choisit la case libre la plus proche dans un rayon de quatre cases, avec départage déterministe. Ce départage ne reproduit pas la recherche aléatoire par régions du jeu original. Danger, interdictions, statuts de prisonnier et pièces ne sont pas implémentés. Un meuble devenu invalide provoque une nouvelle recherche avec la portion conservée ; une interruption générale dépose cette portion intacte à la position du colon et libère sa réservation. Aucun effet nutritionnel ou souvenir partiel n'est accordé.

## Confort et pensées

Le confort n'est ni un bonus de proximité ni une récupération instantanée : pendant l'utilisation réelle, il tend vers 50 pour le tabouret normal ou 75 pour le lit normal. Montée de 60 points/heure, baisse de 4 points/heure, conversion à 6 000 ticks/jour. La cadence continue, la qualité normale implicite et le coefficient de baisse à confirmer sont répertoriés dans la recherche. Les accessoires, qualités et profils ne sont pas simulés.

Le souvenir `ate-without-table` expire après 6 000 ticks. Il vaut −3, se renouvelle sans se cumuler et ne disparaît pas parce que le repas suivant était à table. Une interruption avant la consommation ne le crée pas. Les niveaux de confort fournissent un modificateur séparé. L'humeur complète reste absente : son agrégation actuelle faim/repos + ces effets n'est pas la dynamique d'humeur de RimWorld.

## Sauvegardes

Le schéma **4** ajoute destination et nouvelles phases de repas, confort et souvenirs. Les migrations V1/V2 restent validées avant ajout des champs. V3 est aussi validé selon son ancien contrat : une ingestion déjà commencée garde position, portion et progression ; aucune pensée passée n'est inventée. Les anciens personnages reçoivent un confort neutre de 50 faute d'historique, adaptation de migration explicite. Une ancienne ingestion sur un lit est conservée sur place pour finir l'action existante.

Le validateur contrôle références de mobilier, emprise de destination, unicité de réservation, position effective d'ingestion, propriété de portion, limites du confort et échéance du souvenir. Des chemins périmés restent admissibles : leur réévaluation appartient au tick suivant. Un JSON invalide est refusé avant adoption par le worker. La reprise exacte est garantie et testée entre états du schéma 4 ; pas entre deux versions de règles différentes.

## Rendu et compteur FPS

`PawnLayer.ts` possède les deux lots instanciés, acteur et cargaison, leurs attributs et leurs poses GPU. Le placeholder passe à huit os rigides pour distinguer cuisses et jambes ; aucune hiérarchie d'os CPU ou `AnimationMixer` par colon. `FurnitureLayer.ts` fabrique les volumes de mobilier en code. `primitives.ts` centralise les lots et leur destruction. La scène principale garde caméra, chunks et interaction. Les attributs instanciés permettent de fournir l'état par instance sans dupliquer les données de chaque sommet ([documentation Three.js](https://threejs.org/docs/pages/InstancedBufferAttribute.html)).

Le compteur FPS reste dans le coin supérieur droit, en pause comme en jeu ou dans Menu. `FrameMetrics` mesure les intervalles réels entre frames, publie environ chaque 750 ms et conserve au plus 512 durées ; le DOM est mis à jour une fois par seconde. Les diagnostics détaillés donnent moyenne et p95 des temps de frame. Les pauses de visibilité remettent la fenêtre à zéro ; un blocage visible reste mesuré. `requestAnimationFrame` dépend de la cadence de l'écran et est généralement suspendu dans un onglet caché ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)). Le compteur ne mesure ni les TPS ni le seul temps GPU.

## Navigation et audit

Les recherches pour un repas s'arrêtent après la première couche BFS contenant un but ; toute la couche est terminée afin de conserver les égalités et l'ordre N/E/S/W. La carte des parents peut donc être partielle : elle n'est réutilisée que pour sélectionner le plus proche aliment ou vérifier le siège prioritaire. Si ce siège est inaccessible, la recherche a épuisé la composante et peut alors examiner les autres. Le lit possédé utilise le même principe ; la recherche ordinaire de travail reste complète. Le principe BFS concerne une distance en nombre d'arêtes, pas une distance pondérée ([Boost Graph](https://www.boost.org/doc/libs/latest/libs/graph/doc/html/graph/algorithms/traversal/breadth_first_search.html)). La navigation jouée reste **CPU**, le laboratoire GPU est distinct.

F1–F3 : trois scénarios de repas/mobilier, plus un oracle de 120 cartes comparant recherche bornée et recherche complète. F4 : parcours UI de construction et repas avec restauration pendant transport/ingestion et compteur visible sur fenêtre étroite. F5 : `node --experimental-strip-types scripts/dining-bench.ts`, puis `node scripts/dining-render-bench.mjs`. Les fixtures à 100 acteurs possèdent des places individuelles : elles isolent le coût des décisions et du rendu, pas les congestions. Les rapports avant/après conservent les empreintes des états finaux. Résultats et limites dans [validation](validation.md).
