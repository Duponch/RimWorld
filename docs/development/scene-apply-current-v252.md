# V252 — attribution de l'application actuelle

Le diagnostic observe le vrai GAME V242 après les changements de [mobilier résident](furniture-resident-v241.md) et de [présentation naturelle](natural-scene-v242.md). Il remplace les anciennes hypothèses de sondes V240 par les chemins réellement exécutés. [Preuves et résultats](../history/validation-apply-current-v252.md). Produit, schéma 198, règles, cadence, qualité et sauvegardes restent inchangés ; aucun gain FPS livré.

## Raccord et transparence

Le montage conserve le Worker source, le lecteur strict unique MAIN, la scène, le HUD, les labels, l'audio et la musique. Aucun candidat source/transport/agenda rejeté n'est chargé. Le serveur sert les modules métier canoniques ; seules les réponses main et SceneRenderCore du navigateur possédé reçoivent des observations réversibles.

Les parents coarse utilisent le HostObserver qualifié V231. Les phases fines enveloppent les méthodes des vrais propriétaires de présentation, sans lecture supplémentaire de World/Resource. Dix fonctions bulk importées sont observées à leur callsite exact par remplacement du seul identifiant de callee. Aucun timer par plante, vertex, jobDuration, setMatrixAt ou uniform. Inverse entier, syntaxe du résultat réellement servi, forwarding et restauration des descripteurs sont qualifiés avant le GAME.

L'installation est idempotente par owner/méthode. Elle reconnaît le nouveau propriétaire herbe ou mesh avant les applications suivantes. L'initializer est appelé dans le parent applyWorld ; ses vérifications et la taxe des timers restent payées dans la mesure. Métadonnées primitives bornées à 512 couples propriétaire/méthode et registre de 50 000 samples ; overflow ou capture invalide font échouer la qualification.

## Sens des phases

Le parcours Nature actuel est readScene→readIds(false)→idEvents.read/initialize. Les trois étages sont inclusifs et imbriqués. Observer l'ancien publicread ou l'agenda ordinal ne suffit plus. Les consommateurs ResourceLayer, Overview et PlantCluster restent séparés ; leurs appels appartiennent au World réellement appliqué et au journal canonique existant.

CropLayer est mesuré avec partition.read, quatre CropBatch.update et leurs vrais computeBoundingSphere. Les folds sont des descendants des batches ; les calculs et écritures restent intercalés dans le résidu du batch. Le premier fold d'un mesh créé pendant l'update froid peut rester non séparé, sans disparaître du parent. Aucun budget math/écriture ni upload GPU physique n'est déduit de ces mesures CPU.

Mobilier, portes, toits, signatures, éclairage, index, piles, feedback, VFX, personnages et faune sont observés sur leurs propriétaires actuels. Une phase peut être appelée sous applyWorld, sous frame ou depuis une interaction. L'attribution à applyWorld exige que la chaîne réelle parentId/parentName atteigne cette invocation ; les appels hors parent sont rapportés à part. Les appels renderer main/ombre peuvent eux-mêmes être imbriqués.

Chaque wrapper admet l'appel selon son début dans la fenêtre qualifiée. Des doses parent/enfant peuvent différer aux bords ; un appel commencé avant la fin conserve sa durée dépassant cette borne. Le résidu observé retranche seulement les enfants directs minutés, conserve les inconnus et les taxes, et n'est pas du self time V8. Les temps inclusifs, p95 et maxima des descendants ne s'additionnent pas. Un hook inactif décrit cette fenêtre, sans certifier l'absence générale de travail.

## Résultat et portée

La fenêtre Aulnes 250² à 6× demandé contient 178 applyWorld à 10,717 ms moyens, dont un résidu observé de 0,180 ms. updateResources à 2,936 ms et CropLayer à 1,250 ms sont les principaux parents continus observés ; Nature.readScene à 2,096 ms contient l'agenda ID à 1,500 ms. L'éclairage à 0,876 ms reste un autre parent distinct. Ces valeurs orientent une investigation, sans établir une nouvelle économie ni réhabiliter les pistes déjà rejetées.

ResourceLayer+Overview représentent 0,780 ms inclusif moyen rapporté à toutes les applications, avec un maximum conjoint de 6,600 ms. Leur coût commun supprimable n'est pas établi ; aucune refonte de projection commune ni gain significatif n'est promis sur cette seule enveloppe. Les deux événements mobilier mesurés restent courts et utilisent le patch résident livré.

969 RAF/8 s donnent 121,125/s instrumentés, avec vitesse source observée de 5,080× et des pointes persistantes. Ce n'est ni un ABBA d'optimisation, ni une comparaison causale avec une autre caméra/version, ni un certificat 240 FPS/6× réel. La fenêtre ne couvre pas l'inspecteur sélectionné, toutes les colonies ou le froid complet. La vraie sauvegarde/reprise et l'ancienne vue passent hors mesure ; aucun reset GPU supplémentaire n'est revendiqué.

La suite doit retirer un travail répété démontré tout en conservant valeurs, ordre, propriété, replis, horloges et qualité. Chaque candidat reste conditionné aux oracles appropriés, au coût complet puis au vrai GAME. Ce diagnostic clos ne nécessite ni second profil inchangé ni répétition des bancs rejetés.
