# V248 — propriétaire des données clonées, sans descripteurs par champ

Variante privée de [V247](validated-sparse-worker-v247.md), qualifiée puis rejetée. Produit V242 et schéma 198 conservés, aucun FPS ajouté. [Contrat](../development/native-clone-owner-v248.md), [preuves](../history/validation-native-clone-owner-v248.md).

Les algorithmes primaires HTML de [sérialisation](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal) et de [désérialisation structurées](https://html.spec.whatwg.org/multipage/structured-data.html#structureddeserialize) conservent la mémoire des aliases/cycles et reconstruisent les propriétés ordinaires comme données. Ils ne transportent pas une fonction/Proxy ni les droits readonly. Les getters éventuellement lus chez l'émetteur ne deviennent pas des accessors du clone reçu. Les formes exotiques conservent leurs slots/prototypes particuliers ; SharedArrayBuffer conserve un backing partagé.

L'inférence constructive de V248 est étroite : un clone reçu du canal privé fixe, les anciens descendants fermés par le même propriétaire et les constructions locales de données permettent de lire directement les propres valeurs après la gate réelle du codec. Cette inférence ne vaut pas pour un raw dont le prototype paraît ordinaire. La classe/factory owner reste lexicale ; aucun export, flag ou supplier ne permet d'y attacher une provenance. L'entrée et la transaction ne contiennent aucun callback externe ou await.

[Object.freeze](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze) et [SetIntegrityLevel](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-setintegritylevel) ferment les propres propriétés/extensibilité, sans récursion ni immobilisation des slots Map/Set/buffers. V248 découvre donc toutes les nouvelles branches avant le moindre freeze et décline les exotiques/holes. Les descendants ordinaires retenus sont reconnus par WeakSet. Les reçus du vrai slice de tableaux denses fermés évitent de redécouvrir les N survivants, mais le slice et le freeze N sont réellement exécutés. L'[algorithme slice](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.slice) et son comportement species ne sont pas remplacés par une copie K.

Le contrat natif V247 reste inchangé : règles canoniques du Worker isolé et World présenté readonly. Le standalone public reste RAW mutable ; les mutations arbitraires des catalogues MAIN ne changent pas les règles du Worker. Une mismatch ou forme non supportée impose un repli RAW monotone jusqu'au restart. Le buffer growth Float64 transitoire n'est pas fermé avec World ; sa contrepartie Shared est relue par RAW MAIN. Les trois journaux natifs gardent leurs stores/callees capturés distincts des magasins publics RAW.

Il s'agit d'une cause nouvelle par rapport au propriétaire Resource [V234](native-resource-ownership-v234.md) et au miroir [V229](scene-reconciliation-v229.md) : la fermeture utilise ici la vraie donnée clonée dans un canal privé déjà qualifié. Elle conserve les deux hops et le strict Worker V247, sans World N reconstruit transmis. Le vieux problème Vite des imports Worker circulaires reste évité par la copie Snapshot RAW sans factory ; aucun nouveau build de promotion n'est acquis.

Les oracles natifs et cinq frontières de graphe passent, y compris zéro freeze partiel des cas trou/Map/ArrayBuffer et repli persistant au checkpoint suivant. Cela ne certifie ni tous les exotiques/guards forgés, ni un raw accessor/Proxy, ni une campagne longue ou un GPU. Le coût distinct sans tap trouve :

| Charge | Adoption MAIN moyenne A→B | Circuit requête→callback | Froid |
|---|---:|---:|---:|
| Aulnes | 3,696→9,396 ms | 8,927→22,490 ms (+151,95 %) | 199,168→510,388 ms |
| mixed | 1,553→15,170 ms | 8,265→29,567 ms (+257,71 %) | 78,605→300,052 ms |

Prepare/finish sont mesurés grossièrement à l'intérieur du timer MAIN, sans timer par objet. Leur coût ainsi que les copies de compteurs sont conservés ; ils ne sont pas des durées exclusives. Les compteurs montrent encore les vrais N de tableaux copiés/figés, pas des temps. La préparation de corpus est séparée et rapportée ; les pulses sériels ne sont ni FPS ni vitesse réelle 6×. Le callback contient Index/Nature V242 partiels, sans GAME entier ou rendu GPU.

Le banc V248 B est localement plus bas que V247 B dans une invocation antérieure, mais aucun ABBA direct V247→V248 n'a été fait. La seule comparaison appariée nouvelle oppose V248 au RAW actuel et rejette V248. Aucun gain général, de langage, de thread ou FPS ne peut être inféré de cette baisse entre bancs. Aucun GAME, build ou deuxième banc inchangé après rejet ; prochaine cause à attribuer dans la vraie source actuelle.
