# V263 — qualification physique privée du Core, clôture incomplète

**V263 est clôturé avec une qualification physique incomplète. Produit V242, schéma 198, 62 références et 65 fichiers publics exacts ; aucun FPS ajouté ni promotion.** [Recherche](../research/core-physical-qualification-v263.md), [preuves](../history/validation-core-physical-qualification-v263.md).

Le lot poursuit l'[admission native V262](core-compiled-camera-v262.md) sans modifier son kernel ou ses règles d'admission.
A conserve la façade commune V260 ; B raccorde le propriétaire privé V262 dans le vrai MAIN/Core.
Le mapper substitue seulement MAIN, ColonyRenderer et SceneRenderCore ; Source, Decoder, moteur et layers restent RAW.
Les corps, imports relocalisés, contrôles et reprises ont leurs parents et inverses entiers distincts.

## Contrat du contrôle

La référence est Les Aulnes 250² au tick 6934, en pause, sous Chromium/WebGPU local.
Le rapport conserve adapter.present=true mais info={} ; il ne fournit pas une nouvelle identification matérielle positive de cet adaptateur.
Le vrai Worker publie les commandes stockpile ; le journal strict et l'application du même C sont vérifiés.
Le vrai RAF Three est arrêté ; chaque frame contrôlée appelle la frontière native NodeFrame/FRAME puis Core.frame.
Seule l'horloge locale hostPort suit la cadence diagnostique : aucune horloge globale ni valeur FRAME native n'est remplacée.
La garde de présentation de 200 ms reste active ; un checkpoint draine au plus douze frames puis capture la suivante.
Le froid désigne load/prepare/enter puis premier FULL contrôlé après reapply, sans prétendre capturer le premier draw natif.

L'observer copie les champs et bytes CPU immédiatement avant les vrais draws, avec passes, ordres, layouts, offsets et alias.
Les pixels Chromium sont décodés en RGBA et comparés exactement ; aucun masque, tolérance ou multiset de bytes n'est employé.
Les champs anonymes restent recensés avec dropped0 ; getters/Fn/setup/getOutputNode ne servent pas à découvrir les identités.
La passe de sortie native est observée dans le cache réel Renderer._quadCache, sans autorité supplémentaire pour la politique.
Le transport reste borné à 64 MiB par capture, blocs de 64 KiB, lots ordonnés de seize et 65 536 chunks maximum.

## Résultat conservé

Le natif final reste FAIL 201,952 s : A et B ont chacun achevé les quatorze captures Aulnes/baseline avant un mauvais sélecteur du nettoyage B.
Un audit hors ligne distinct, avec le comparateur inchangé, reste FAIL 45,945 s.
Treize paires ont scène, passes/draws, champs, bytes CPU et pixels exacts, jusqu'à resize-small inclus.
À resize-original, scène et passes sont exactes ; les asserts de champs/layouts/alias/bytes CPU passent avant le seul échec final RGBA.
La cause de cet écart pixel n'est pas établie et la qualification physique complète reste refusée.
Le World MAIN final est exact entre A/B ; ce clone de snapshot n'est pas une preuve de sauvegarde native.

Le chemin réel owner.policy.membership.count vaut zéro, comme liveOwners/pending ; active est false et navigateur/serveur sont fermés.
Le compteur B workersAfterCleanup est absent, l'assertion fautive ayant interrompu cette mesure avant fermeture du navigateur.
Le rouge natif n'est pas réécrit par la lecture correcte du cleanup.

Compilation intercalée, custom object/node, throw, mixed, coût complet, GAME de performance et build n'ont pas été exécutés dans cette qualification.
Typage et syntaxe réussis ne remplacent ni ces frontières ni le pixel manquant ; aucune preuve V260 n'est transférée au produit.
Clôture demandée : commit local ROOT puis arrêt, sans nouvelle version prescrite, sans push ; relance automatique en pause et sessions/references_UI/caches E: préservés.
