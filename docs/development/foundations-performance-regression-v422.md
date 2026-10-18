# Régression du coût d’adoption des fondations — diagnostic V422

18 octobre 2026. Diagnostic demandé après la chute de confort signalée avec le multicarte. Aucun changement de code produit dans cette note ; production V421/9fa50df7/df037b33, schéma263 inchangé. Les correctifs précédents et leurs résultats mixtes restent dans [V421](worker-idle-costs-v421.md).

## Résultat mesuré

Le saut le plus net de ce banc apparaît entre V407 et V408, le lot géographique du17octobre, sur une seule ancienne carte des Aulnes. Le registre multicarte V407 seul ne montre pas ce saut. Cela confirme une régression du coût du Decoder public sur ce cas ; cela ne mesure pas à lui seul la chute des FPS dans Chrome.

| Comparaison indépendante | Médiane avant, ms | Médiane après, ms | Moyenne avant→après, ms |
|---|---:|---:|---:|
| V403→V407, registre |33,941|33,475|40,700→34,532|
| V407→V408, fondations géographiques |34,654|58,305|38,965→57,716|
| V408→V421, suite et premiers correctifs |67,041|59,634|65,982→61,076|

V408 est plus lent dans les cinq paires face à V407. La différence de médianes de cette paire est d’environ68%, uniquement pour l’adoption publique mesurée. Les processus sont distincts : V408 vaut58,305 dans une comparaison et67,041 dans l’autre. Ne pas chaîner les ratios, annoncer un pourcentage de chute FPS ou attribuer toute la variation au seul registre.

## Ce qui a été ajouté

V407 `45805ee0` introduit le registre et ses vues même pour une seule carte : synchronisations superficielles, projection de campagne et validation des métadonnées reçues. Ce ne sont ni des clones profonds des grilles à chaque appel, ni une génération de planète par image. Les cartes inactives ne sont pas envoyées au rendu. Le validateur de présentation du registre pèse seulement3,085ms A/4,660ms B inclusifs dans les profils MAIN acquis ; cela ne suffit pas à lui attribuer la chute drastique.

V408 `f7ffb521` ajoute plusieurs parcours complets au chemin d’adoption :

- `validateMarshTransport` calcule les règles de substrat pour les ressources végétales, même sur une ancienne carte migrée et même si peu de cases changent ; supports des structures et travaux restent aussi parcourus.
- `captureHumanOwners` et `everyHumanPawnOwner` consultent les propriétaires de caissons via un parcours des structures, même sans caisson ; plusieurs gardes les réemploient.
- Les références de couchage et les objets nouvellement admis ajoutent des vérifications de propriétaires et de structures, y compris pour des deltas ne remplaçant que quelques ouvrages.

Les profils MAIN déjà acquis situent du temps dans ces fonctions : sous adoption, terrain A78,014/B197,920ms inclusifs ; caissons A54,955ms self ; lits projetés A7,850ms inclusifs. Ce sont des poids statistiques sur des profils entiers, pas des durées par snapshot ou des différences isolées contre V403 ; les inclusifs se recouvrent et ne doivent pas être additionnés. Le coûteux `noOwnedClock` existe déjà avant V403 : son coût n’est pas une nouveauté V407. Le Decoder applique des gardes de transport explicites, pas `validateWorld` complet à chaque réception.

Ce travail CPU intervient aussi sans ordre donné aux colons. Une nouvelle partie contient également une carte250², de la flore et des animaux ; trois colons ne constituent donc pas une charge vide. Les relevés Chrome actuels montrent des réceptions d’état de l’ordre de20–30ms sur le fil principal ; à60Hz, le budget d’image est16,7ms. Ces blocages peuvent contribuer aux saccades. Le coût GPU total et la causalité de toute la baisse native restent à isoler ; aucune mise en cause exclusive du GPU ou du nombre de cartes.

## Méthode et conservation

ROOT seul a exécuté trois processus successifs PASS72,345s/81,575s/79,221s, après gel et revue indépendante : Node24.19, Vite8.3.0, Ryzen5 3600/Windows. Deux versions chargées au maximum par processus ; sources historiques `src` exactes V403/V407/V408, sources courantes V421 identiques au produit9fa50df7. Aucun asset ou code propriétaire externe.

Une entrée commune : le vrai RAW250 des Aulnes publiquesV394/tick10733, décodé avec le codec livré puis admis strictement et migré par chaque version dans son propre schéma. Chaque version avance réellement un tick dans une copie diagnostique, sans retouche. La projection produit conserve son identité ; le véritable Encoder produit checkpoint puis delta, clonés immédiatement comme au postMessage. Toutes les versions gardent une carte,15personnages,2454structures,17912ressources,382piles et29upserts de structures, sans retrait ni changement d’ordre. Les continuations V407 et V408 reproduisent exactement leurs SHA entre leurs deux processus respectifs.

Dix mesures par version et par comparaison, cinq paires alternées, chauffe hors temps. Un Decoder neuf admet le checkpoint hors chrono ; seul son `adopt(delta)` public est chronométré. Projections, résultats et paquets complets sont comparés sans mutation, sources et entrée contrôlées avant/après. Aucun état ancien n’est réécrit pour rapprocher les versions ; les différences de migration restent présentes. Les originaux publics et leurs archives ne sont pas modifiés.

Limites : Decoder public sous Node, pas la sousclasse MAIN native ; migration, projection, simulation, encodage, clonage et oracles hors temps ; JIT/GC et charge extérieure non isolés. Les champs bruts `checkpointBytes`/`deltaBytes` comptent en réalité les unités UTF16 de JSON.length ; la synthèse les nomme correctement `JsonCodeUnits`. Aucun chiffre d’octets de ces paquets n’est revendiqué. Ce libellé ne change aucun temps mesuré et ne justifie pas une réexécution.

Reçu `tmp/world-foundations/demonstration-v419/history422-acquired01.json`, trois rapports `history422-403-407-01.json`, `history422-407-408-01.json`, `history422-408-421-01.json`, gel `history422-freeze01.json`. Originaux, inventaires et revues restent privés. Aucun déploiement pour ce diagnostic seul.

## Suite prioritaire

Réduire les parcours redondants dans le chemin commun d’adoption, préserver les refus de données invalides et les vrais propriétaires, puis vérifier l’effet dans Chrome. Les comparaisons établissent une cible logicielle précise ; elles ne désignent pas encore une fonction unique responsable de tout le ralentissement. Aucun contenu secondaire repris et aucun retour général du confort annoncé.
