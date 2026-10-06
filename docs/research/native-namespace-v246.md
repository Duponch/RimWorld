# Propriété des snapshots et registre Resource V246

Le verdict repose d'abord sur les sources locales V242 : boucle de carcasses et construction du namespace dans `src/bridge/snapshots.ts`, recherche de clé absente dans `src/sim/mini-turret-save.ts`, puis préparation et fermeture du propriétaire privé V234. L'oracle utilise les vraies fonctions H/G et tourelle ; il ne simule pas un callback végétal simplifié.

Le clonage natif préserve un graphe avec ses références répétées, mais admet aussi des objets ayant un état interne ou partagé. Il ne constitue donc pas une preuve générale de lecture seule : le domaine futur doit identifier les types admis et conserver un repli pour les autres. [HTML, données structurées](https://html.spec.whatwg.org/multipage/structured-data.html).

La fermeture ECMAScript porte sur les propriétés propres d'un objet. Elle ne ferme pas automatiquement ses descendants, ses prototypes ou l'état interne de toutes les classes. Le propriétaire Resource-only ne protège ainsi pas le getter installé sur une pile retenue. Une fermeture complète envisagée doit respecter cette distinction, préserver les aliases et intervenir après les gardes réussis. [ECMAScript 2024, SetIntegrityLevel](https://tc39.es/ecma262/2024/#sec-setintegritylevel).

Les sources locales montrent d'autres dépendances : arrays de cultures, feuilles de définitions de flore et catalogue mental partiellement mutables. Un gate de realm final ne constate pas un hook exécuté puis restauré. Une alternative globale exige une base réellement fermée, un message frais du canal natif fermé, des catalogues/prototypes compatibles au point d'entrée et l'absence d'autres callbacks pendant l'adoption synchrone. Cette alternative est une étude, pas une propriété actuellement livrée.
