# V232 — recaptures de ressources et coût sonore

Diagnostic sur V231 `1aea56d6`, produit V230 et schéma 198 inchangés. [Preuves et limites](../history/validation-resource-census-v232.md). Aucun des trois candidats privés n'est intégré ; aucun gain FPS livré.

La réconciliation naturelle par ID conserve les scans complets et ajoute du remapping. Elle est exacte mais plus lente sur Les Aulnes. Le tri ciblé du garde végétal conserve les lectures et verdicts historiques, mais son gain d'adoption n'est pas stable. Le recensement sonore local possède ses entrées à l'adoption puis calcule seulement les cellules réellement demandées par l'écoute ; son coût cumulé baisse nettement, mais les reconstructions d'appartenance aggravent ses pointes et les RAF ne gagnent pas de façon stable.

Le problème commun est la recapture après un ajout ou retrait, pas un manque de variantes de contenu ni un gain démontré de langage. Le transport émet déjà `removed/upserted/growth` ; le cas ordinaire survivants stables puis ajouts en queue n'envoie pas un tableau complet `order`. Une future refonte doit donc propager la transition réellement confirmée et composer les modifications depuis le World effectivement lu jusqu'au World final, plutôt que refaire ces déductions dans chaque couche.

## Limites de propriété et d'exactitude

Le recensement différé ne peut emprunter les plantes ou le terrain : l'ancien champ reste celui de l'adoption après une mutation avant `gain`. Le candidat possède les scalaires de croissance/feuilles, sols/planchers, toit et calendrier. Il conserve les quatre contributions doubles puis chaque addition Float32 dans l'ordre source, rayon 28 et cellules de 8 ; les helpers métier restent originaux. Une inspection diagnostique du champ matérialise toutes ses cellules et n'est jamais chronométrée comme écoute locale.

Le tri conserve le vrai appel `.some`, son ordre de lectures, trous, getters et erreurs. Les 37 sondes exactes ne prouvent pas un gain : seule la durée de l'adoption entière sert à sa décision.

Le futur journal structurel ne doit ni retenir les paquets/anciens Worlds, ni prendre une publication sautée pour une application réelle. Refus/stale/epoch/éviction gardent leur effet ; le journal est publié après tous les gardes et le commit planète. Une introspection ajoutée sur un Proxy peut avoir des effets irréversibles : un catch puis repli ne suffit pas. La tranche privée suivante capture uniquement les valeurs des lectures historiques et décline toute preuve incertaine. Elle ne certifie jamais une immuabilité future.

## Décision

Préparer un journal structurel privé et des consommateurs durables par ID, sans nouveau wire ou freeze global. Le contrat interne de dirtiness peut évoluer explicitement, mais les valeurs graphiques, ordre de dessin, sélection, limites, restauration et cadence restent exacts. Les versions/ranges redondants d'upload doivent être distingués des mises à jour réellement nécessaires. Qualification complète avant intégration ; le prototype sonore pourrait ensuite réutiliser cette frontière pour supprimer ses recaptures coûteuses.

Sources primaires locales : `SnapshotEncoder/Decoder`, journal V225, `NaturalPresentationEvents`, `FoliageAmbience`, `plantGrowth/plantLeafless`, vrai `main.ts` et banc GAME V231. [ECMAScript — some](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.some) explique la longueur initiale, les propriétés présentes et l'arrêt au premier succès ; [ECMAScript — Map](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.prototype.set) conserve l'ordre d'insertion lors d'un remplacement. Ces spécifications fondent l'exactitude des parcours, pas une promesse de vitesse du moteur JavaScript.
