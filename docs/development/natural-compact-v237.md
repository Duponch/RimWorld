# V237 — qualification du résultat naturel compact

Expérience privée **écartée après mesure**, produit V233 et schéma 198 conservés. Le retrait de la matérialisation complète améliore la tranche de scène observée, mais pas le coût total sur Les Aulnes dans les deux cycles. Aucun GAME supplémentaire, gain FPS, nouveau contenu ou code produit n'est livré. [Recherche primaire](../research/natural-compact-v237.md), [preuves et décision](../history/validation-natural-compact-v237.md).

## Changement essayé

V233 maintient déjà la présentation naturelle par ID à partir du suffixe confirmé A→C. Sa sortie publique matérialise encore un tableau de N sources et un World filtré lorsqu'une forme change. Le prototype ajoute une entrée de scène qui transmet les K changements aux consommateurs sans construire cette vue complète sur le chemin indexé.

Le corps public `read`, les calculs de l'agenda, forecasts, queries de croissance, règles numériques, Room, PlantCluster et wire restent historiques. Le Core conserve sa branche mutable littérale. Seul son mandat immuable natif existant ouvre l'entrée compacte ; un booléen ou un stamp public ne crée aucune nouvelle autorité sur un World raw.

Le résultat possède une façade de K records copiés et figés, indépendante du Map public. Il est lié au World C et à la génération courante du lecteur. `isCurrent(C)` est contrôlé entre consommateurs ; une nouvelle lecture, un clear ou `close()` révoque sa matérialisation. La fermeture est synchrone dans `finally`, sans transaction annulant les écritures déjà réalisées par un consommateur réentrant.

PlantCluster utilise les changements K sur C dans sa voie delta existante. Resource et Overview reçoivent C et la frame courante. Si cette frame décline immédiatement, la vue complète est construite par le filter/map et le spread historiques, depuis le ledger C encore courant ; elle ne peut pas être reconstruite depuis D déjà décodé. Froid, reset, provenance ou suffixe absent, ordre inconnu, checkpoint, epoch, éviction, même World répété et appels mutables conservent les replis complets. Les anciennes vues publiques restent fixes.

Copies/freeze K, scopes, guards, fermeture, repli et froid K=N font partie du coût mesuré. Le prototype ne change aucune cadence d'application, population, caméra, qualité, horloge ou commande.

## Portée du contrôle graphique

Un premier oracle d'uploads examinait toute la capacité dès qu'un mesh était actif. Le diagnostic localise son refus dans la queue d'une matrice Crop retirée après réduction de count. La comparaison CPU complète reste exigée ; seule la portée de cette assertion nécessaire est corrigée dans une reprise distincte.

L'observateur possède un shadow résident par pipeline, agrège les domaines de tous les parents et vérifie aussi la réactivation sans nouvelle écriture CPU. La matrice Storage/mat4 d'un vrai InstancedMesh a un adressage par instance démontré ; les domaines inconnus, custom ou interleaved restent conservateurs. Versions, ranges, visibilité, `DynamicDrawUsage`, remplacements d'array et allocations nouvelles sont distingués. Les cas ciblés refusent les marks absents ou portant sur le mauvais slot actif.

Ce modèle vérifie les **uploads déclarés au dessin nominal**, sans exécuter le backend ni effacer les ranges du source. Il ne certifie pas les transferts GPU physiques, le padding, les attributs dérivés ou la résidence des textures dormantes. Les préparations de compilation CPU ne font pas avancer le shadow. Égalité complète des F32/alias/ordre/counts/bounds et contrôle historique des textures restent séparés.

## Décision et suite

Sur Les Aulnes, la tranche appliquée baisse d'environ 0,21–0,28 ms, mais clone+adoption+pipeline augmente de 0,24 puis 2,90 %. Les coûts froids et complets ne donnent pas non plus un avantage général. Le changement n'est donc pas promu et son GAME conditionnel n'est pas exécuté. Un second banc de cette piste inchangée n'est pas une suite automatique.

Le prochain diagnostic doit distinguer patches de lifecycle, captures réellement nécessaires, forecasts conservés ou recalculés, échéances dues et queries exécutées. Les compteurs privés préparés n'ont pas encore été joués et ne fournissent ni durées ni FPS. La [comparaison nocturne globale](../history/autonomous-performance-2026-10-06.md) reste un résultat distinct ; la cible proche de 240 FPS à 6× demeure ouverte.
