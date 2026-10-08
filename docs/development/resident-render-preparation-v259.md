# V259 — préparation résidente du rendu, prototype écarté

**Produit V242 et schéma 198 conservés ; aucun FPS ajouté.** Le prototype privé produit les mêmes images dans son corpus matériel, mais augmente le coût CPU complet de rendu de 22,03 %. [Recherche](../research/resident-render-preparation-v259.md), [preuves et décision](../history/validation-resident-render-preparation-v259.md).

Le profil MAIN V258 motivait le retrait de travail avant les parcours géométries/nodes/bindings de Three r186. V259 construit un observer privé par famille et objet/passe : FULL historique lors d'un changement, SHARED lorsque les dépendances résidentes sont reconnues et identiques. Il ne renvoie jamais NONE. Caméras, calculs de lumière, vent, culling, tri, dessins, ombres et horloges restent natifs. Aucun hasNode désactivé aveuglément, nouveau bundle ou baisse de qualité.

## Domaine construit et transaction

La policy appartient à un renderer neuf, sans builder préexistant. Les matériaux configurés, clones, uniformes fixes et groupes de vent sont enregistrés par leur identité. La signature complète conserve matrices, attributs/storage, versions et disposal des textures, sampler, références de matériau et dépendances compilées. Le monitor natif demeure synchronisé. Le succès est acquitté seulement après le retour du rendu externe complet, ombres incluses, puis relecture des dépendances ; throw, reset, remplacement ou changement de scène invalident les reçus.

Tous les builders sont audités, y compris les matériaux non configurés et overrides d'ombre. Les callbacks inconnus révoquent globalement avant leur exécution. Les préflights de projection et de dessin conservent le même appel natif. Dynamic instancing, velocity, contexte inconnu, bornes dépassées et dépendances non reconnues imposent FULL. La révocation est monotone ; reset ne la retire pas. Ce domaine exclut les Fn de build hostiles et prototypes interposés : ce n'est pas un contrat public pour graphes arbitraires.

Le premier kernel AF22 était révoqué dès la compilation du grand corpus et n'exerçait aucun SHARED. La reprise native `1C50D0DE` reconnaît les contributions réellement observées par identités canoniques : lumière déjà compilée, Inspector natif, viewport, événements beforeFrame d'instancing et map du matériau source avant override. Elle lit les caches existants sans appeler Fn/setup/build/update ni allouer les propriétés du builder. Une première raison de refus primitive est conservée. Les anciens kernels et rouges restent intacts.

## Qualification et admission préalable

Le premier écran utilise un vrai renderer WebGPU AMD, 64 meshes fusionnés, six lots Box/288 instances, quatre lots Crop/96 plantes et 255 ressources. Les vingt paires couvrent caméra/lumière, vent deux fois au même frameId, C, buffers, matrice, texture/sampler/disposal, visibilité/réactivation, clone compilé tardivement, capacité, callbacks inconnus, throw et nouvelle cible. Pixels RGBA8, ordre/ranges de dessins, champs UBO consommés par rôle et bytes CPU attributs/storage/textures sont comparés exactement. B doit exercer SHARED avant les cas négatifs.

L'oracle ne déduit pas les uploads physiques de compteurs ou versions. La nouvelle cible n'est pas une perte GPUDevice. Ce corpus n'instancie pas le vrai Core, la simulation, l'UI ou l'audio ; aucun FPS n'en découle.

Seulement après le physique exact, le coût ABBA utilise 32 rendus de chauffe et 192 mesurés par cohorte, avec application C tous les quatre rendus, sans observateur détaillé. Le CPU inclut inputs caméra/soleil/vent, Environment C/invalidation, begin, rendu et commit ; le circuit parent attend aussi la vraie queue GPU. Ils ne s'additionnent pas. Le critère préalable exige CPU B/A ≤0,85 et circuit B/A ≤1,05, erreurs nulles et domaine actif. Il autoriserait seulement une qualification du vrai Core Les Aulnes, avant GAME ou promotion.

**Décision : critère refusé, aucun raccord produit.** CPU 1,066→1,301 ms ; circuit 4,382→4,431 ms. Le candidat est écarté sans Core/GAME/build, complément ACES, perte GPU ou second banc inchangé. Les copies privées de Core importent encore l'ancien helper et ne constituent pas une intégration native qualifiée. La suite étudie une propriété construite et fermée des graphes graphiques afin d'éviter les doubles recensements chauds ; elle reste un design, sans gain acquis. Les 62 références/65 fichiers publics, sauvegardes, règles, cadence et qualité sont conservés. Relance automatique en pause, commits locaux sans push.
