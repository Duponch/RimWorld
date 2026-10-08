# V262 — résultats caméra compilés et audit passif des ombres

**La reprise privée acquiert une résidence Core native et la retrouve après une vraie perte GPU. Produit V242, schéma 198, 62 références et 65 fichiers publics inchangés ; aucun FPS ajouté.** [Recherche](../research/core-compiled-camera-v262.md), [preuves](../history/validation-core-compiled-camera-v262.md).

V262 poursuit le [raccord Core V261](core-resident-admission-v261.md).
Le domaine résident, les racines inscrites, les exclusions et le propriétaire privé restent ceux de V261.
La correction porte sur la découverte de données natives déjà compilées et sur l'audit global des callbacks.
Elle ne donne aucun droit résident aux sprites, à Resource ou aux overrides d'ombre.

## Origine des résultats caméra

Les sept exports Fn caméra canoniques sont capturés au bootstrap avec leurs wrappers éventuels, ShaderCall, ShaderNode et dispatchs.
Leurs identités, prototypes, descriptors et configuration once/global sont revérifiés à la lecture.
Seule la propriété propre data `default`, déjà présente sous leur ShaderNode exact dans les caches compilés, est consultée.
Aucun Fn, call, getOutputNode, setup, build ou getNodeProperties n'est exécuté pour découvrir ce résultat.
La découverte ne crée aucun cache Three et ne parcourt pas tous les enfants de cache ou toutes les Fn.

Le retour UniformNode exact doit appartenir réellement aux updateNodes et au groupe RENDER canonique, sans before/after.
Les dispatchs natifs et le callback update propre doivent rester ceux capturés dans le domaine construit.
Les callbacks et valeurs d'uniformes continuent à être exécutés et écrits par le parcours natif.
Une sortie absente, ambiguë, modifiée ou hors domaine reste refusée ; nom et classe seuls ne sont jamais une autorité.
Les variantes ArrayCamera/UniformArray non couvertes restent conservatrices.

## Premier contrôle et nouvelle frontière

Le premier diagnostic natif V262, rapport `9EFFF99F`, reste **FAIL 32,799 s**.
Le premier refus observé devient ReferenceNode `map`, update OBJECT, dans le rendu d'ombre d'un mesh `tree-canopy`.
Le matériau du builder est un override distinct du matériau réel de l'objet.
Ce premier parcours ne qualifie pas l'ensemble du graphe : ses compteurs résidents FULL/ACK/SHARED sont nuls.
Ses 41 meshes inscrits et 88 builders audités ne sont pas des mesures de débit ; ce rouge reste conservé.

## Reprise passive bornée

`shadow-map-reference-next` dérive de la copie caméra typée `2F09C2FD` avec inverse entier exact.
La voie passive `passiveObjectMapReference` appartient seulement à `auditCallbacks` : `configuredMapReference` et `qualify` restent inchangés.
Elle exige un ReferenceNode exact map/texture, ses champs propres data, ses dispatchs canoniques et un chemin réduit à `map`.
`node.object` et `node.reference` doivent désigner le matériau scalaire propre de `builder.object` ; les tableaux sont refusés.
Le TextureNode interne doit être une base directe exacte, sans override de value/getBase ni arête referenceNode.

La source map réelle doit être une propriété propre data contenant une Texture, DataTexture ou CanvasTexture exacte.
Son updateMatrix doit rester canonique ; onUpdate propre data doit être nul/undefined ou explicitement enregistré.
Un callback onUpdate accessoire ou inconnu refuse immédiatement, même si le cache conserve une ancienne texture.
La base et la source réelle rejoignent l'audit des textures, sans exécuter getter, update ou fonction de découverte.
Membership, refresh, transactions, ACK, ordre natif et lifecycle ne changent pas.

## État de qualification

Le contrôle natif distinct, rapport `E36FE1AC`, est **PASS 46,119 s**.
À froid au tick 6934 : 15 FULL, 15 ACK et 1 605 SHARED ; les vrais parcours 1× puis 6× atteignent 6939 puis 6988.
Sauvegarde/reload exacts à 6988, vraie perte du device à 7031, génération 1→2 et continuation à 7084 passent.
Au checkpoint de continuation : 6 292 SHARED et 325 ACK ; ces comptes ne mesurent ni CPU, ni pixels, ni FPS.
Cleanup : deux owners créés et fermés, liveOwners/membres/pending nuls, erreurs nulles et sources/public exacts.
Le seul abort musical est situé dans owned-cleanup et reconnu attendu pour cette reprise ; le premier rouge n'est pas réécrit.
Les lectures restent bornées par les limites privées de caches, profondeur et transactions, avec repli conservateur.
Proxies, Fn hostiles et interpositions de prototypes/intrinsics antérieures au bootstrap ne sont pas qualifiés après coup.
Les vingt cas composants passent dans un fichier en 3,319 s ; typage 1,710 s, extraction 1,489 s et gel 0,871 s passent.
V263 doit qualifier le Core A/B complet borné : méthodes/writers, champs consommés, compilation intercalée, pixels, froid et coût complet avant GAME.
Aucun gain V260 n'est transféré au jeu ; aucun build, promotion ou second essai inchangé n'est autorisé par ce document.
ROOT seul exécute les contrôles gelés séquentiels ; sessions, references_UI et caches E: sont préservés, relance automatique en pause, commits locaux sans push.
