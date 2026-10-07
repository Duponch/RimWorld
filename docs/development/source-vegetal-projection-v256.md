# V256 — projection naturelle et agricole depuis la source

Qualification privée puis **rejet du candidat couplé** : aucun gain complet utile, aucun GAME, build ou promotion. Produit V242, schéma 198 et 62 références/65 fichiers publics conservés ; aucun FPS ajouté. [Recherche](../research/source-vegetal-projection-v256.md), [preuves et limites](../history/validation-source-vegetal-projection-v256.md).

V255 accélère la source mais recule dans le jeu complet. V256 couple sa capsule Room qualifiée à une réduction du travail MAIN : calculer les scalaires Nature et cultures dans le Worker source existant, les publier dans le même paquet et les consommer après le lecteur strict MAIN actuel. Il conserve un Worker source, une publication native et un lecteur strict. V242 ayant déjà retiré la liste naturelle intermédiaire, ce retrait n'est pas compté une seconde fois.

## Production et données

Dans le candidat privé, `state/vegetal-projection-wire.ts` décrit `snapshot.vegetal` format 1 : génération, epoch/revision/baseRevision, tick, dimensions et schéma ; Nature complète ou delta de triplets Float64 `[id,size,flags]`, puis cultures complètes `[id,growth,leafless]`. Les flags codent maturité berries et absence de feuilles. Nature couvre tous les Resource hors rice/potato/corn/cotton, y compris ressources invariantes et clusters ; ces quatre cultures disposent de leurs scalaires propres.

Le producteur bridge conserve les helpers mathématiques, observations, échéances de 32–63 ticks et backend d'agenda historiques. Il réutilise les K trouvés par l'encodeur, les patches de croissance, échéances et changements de contexte. Le ledger copie les primitives nécessaires sans retenir de Resource/PlantLife/World mutable. Froid, membership, ordre, kind, contexte et checkpoint paient un seed complet ; la voie K stable n'ajoute pas de census Resource N ou full périodique. Les cultures sont calculées au C publié avec un tableau agricole complet.

L'encodeur et ses captures historiques restent payés. La projection suit encode et précède le même send synchrone. Son échec produit une absence de sidecar et un repli, sans englober les fautes historiques de step, encode ou send. La révocation exotique de la capsule V255 reste monotone, même après load. Les propriétaires, capacités de plateforme et horloges réelles demeurent dans bridge ; sim conserve sa frontière déterministe. PRNG, cadence, règles et qualité ne changent pas.

## Contrat MAIN et scène

La projection est un **contrat numérique explicite et cohérent**, pas un témoin d'immuabilité d'un World inconnu. Le raccord natif préparé emploie une factory MAIN fixe sans World, Worker, lecteur ou callback fourni ; son broker lexical laisse sortir des commandes liées et des façades plus étroites. Le SimulationClient public conserve son comportement. Ce raccord réel n'a pas été qualifié par le banc CPU de V256.

Le seul Decoder strict termine d'abord gardes et commits. APPLIED précède association numérique, présentation, audio et replies dans l'ordre historique. Projection absente/incompatible, refus, stale et erreurs conservent les verdicts et issues existants. La donnée produite par la source ne remplace aucun garde MAIN.

Le journal copie les scalaires, conserve les historiques naturels par ID et les cultures de C, avec 64 records et un plafond de primitives/bytes. Il compose A→C depuis la dernière scène présentée : D adopté n'écrase pas C et B invisible n'est pas joué. L'éviction compacte les historiques concernés et révoque les vieux reçus. Full, rupture de chaîne, projection incorrecte ou dépassement impose un repli ; un nouveau full peut réamorcer le contrat.

Core reçoit explicitement la paire C/reçu pour sa file et les reconstructions. `setWorld` public révoque le mode numérique, y compris les entrées déjà en file ; `read` et `readScene` historiques restent distincts. Mandat readonly et deux contrôles réels SceneResourceFrame sont conservés indépendamment du reçu numérique.

Nature conserve références Resource MAIN C, membership, naissance/ordre et changes. Resource, Overview, PlantCluster et flora substituent les scalaires aux points exacts ; maturité projetée remplace berries seulement. Crop garde partition, quatre batches, matrices/couleurs, conversions F32, counts, ranges et bounds. Le repli restaure le dernier A présenté, sans rejouer B ou utiliser les slots de D.

## Résultat et portée

Les composants passent. L'audit distinct qualifie uniquement les deux Aulnes achevées : 75 publications chacune, 63 paires de scènes CPU exactes et 1 275 683 contrôles scalaires. Les rapports natifs globaux restent rouges ; mixed ne dispose pas d'une qualification complète de scène.

Le coût complet ABBA de 96 vrais ticks compare le produit V242 au candidat couplé, source et association comprises. Sur Aulnes, request→fin callback passe de 36,940 à 37,060 ms et le callback MAIN de 6,610 à 6,650 ms ; p95 défavorable. Sur mixed, le circuit reste presque neutre et le callback régresse de 14,61 %. Ces mesures mixed ne remplacent pas son oracle d'équivalence manquant.

Décision : conserver le candidat privé sans GAME, build, promotion ou nouveau contrôle mixed pour cette piste inchangée. Le déplacement des calculs n'a pas produit l'économie MAIN recherchée. Ni cette décision ni le corpus sériel ne définissent un plafond général de JavaScript ou un résultat FPS.
