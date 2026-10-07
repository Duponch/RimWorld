# Validation V252 — application de scène actuelle

7 octobre 2026, ROOT seul, contrôles gelés séquentiels via `validate:logged`. [Contrat et limites](../development/scene-apply-current-v252.md). Diagnostic du produit V242, schéma 198 inchangé ; aucune optimisation ni nouveau gain FPS livré.

## Qualification et provenance

GEL privé `0F7AA3E5099C415B543329D6E6C85B2670E0B1B3C5E8F4FF32C824BF80AD9300`, 3 049 fichiers. Le ledger conserve trois réussites : `aulnes-v252-types` 1,575 s ; `aulnes-v252-components` 2,345 s, un fichier/quatre cas ; `aulnes-v252-game-causal` 36,400 s. Les quatre cas vérifient forwarding de this/arguments/retour/throw, parenté, installation idempotente et restauration des descripteurs propres/hérités, remplacement des propriétaires herbe/mesh, puis syntaxe du JavaScript réellement transformé et inverse entier. Le stub Node ne remplace que l'API PerformanceObserver absente ; l'horloge factice reste limitée aux fonctions factices des cas d'observateur.

Rapport privé `tmp/performance-orientation-v252/apply-game-next/captures/run-2026-10-07T16-53-11.504Z-t7nZD3/report.json`, SHA256 `6653967C38238D7038CC7AE70AE6E38552263CD364695E40B06E994E842BABDA`. Les seuls raccords servis sont main et SceneRenderCore, une interception chacun, avec inverses entiers. Le Core remplace dix identifiants de callees bulk par leurs wrappers ; arguments, conditions, ordre et corps restent identiques. Aucun module métier substitué : Worker source, encodeur, lecteur strict, Nature et agenda canoniques restent RAW. Aucun journal source V250, lecteur déplacé V251 ou candidat rejeté chargé.

## Fenêtre réelle

Les Aulnes corrigées 250×250, source tick6934, Chromium/WebGPU matériel AMD rdna-1, 1920×1080/DPR1, caméra orthographique129/122/zoom1. Vraie UI montée, labels/qualités conservés, audio et musique actifs après le geste existant ; aucun personnage sélectionné ni panneau de gestion ouvert. Chauffe3 s puis fenêtre8 s à6× demandé.

Le registre contient 23 131 samples et 77 couples propriétaire/méthode, sans overflow, exception ou pile pendante. Toutes les cibles requises sont réellement appelées, y compris Nature.readScene/readIds/idEvents.read et les quatre CropBatch.update/bounds. Aucun public Nature.read ni idEvents.initialize dans la fenêtre ; les phases froides avant arm ne sont pas couvertes.

969 callbacks RAF donnent **121,125/s instrumentés**, sans comparaison A/B. Le CPU frame moyen est de 4,797 ms, p95 16,300/max 24,500 ; les intervalles RAF moyens de 8,260 ms, p95 20,900/max 37,600 ne sont pas ce temps CPU. Les publications observées vont de 7010 à 7253 : 243 ticks sur 7,9723 s, soit 5,080× réel contre 6× demandé. Cette dose ne désigne pas tous les ticks joués depuis 6934. Réveil de fin 18,900 ms ; une frame admise dépasse la borne de 11,800 ms.

## Application et descendants

178 applications : moyenne 10,717 ms, p95 16,600/max 19,900 ; résidu observé moyen 0,180 ms. Les lignes suivantes sont des enfants **directs** de ces applications ; leurs moyennes sont rapportées aux 178 applications, sans y ajouter leurs propres descendants.

| Phase | Appels sous applyWorld | Moyenne par application (ms) | Maximum d'un appel (ms) |
| --- | ---: | ---: | ---: |
| updateResources | 178 | 2,936 | 10,800 |
| CropLayer.update | 178 | 1,250 | 2,900 |
| EnvironmentLighting.update | 178 | 0,876 | 1,200 |
| Signature structures | 178 | 0,638 | 1,800 |
| DoorLayer.update | 178 | 0,620 | 1,100 |
| updatePiles | 178 | 0,598 | 1,500 |
| Feedback.update | 178 | 0,542 | 1,200 |
| StructureVfx.adopt | 178 | 0,482 | 2,800 |

Nature.readScene prend 2,096 ms sur 178 appels ; son enfant readIds à 2,094 ms contient idEvents.read à 1,500 ms. Ces trois durées se recouvrent. ResourceLayer et Overview sont appelés 145 fois : moyennes par appel 0,821/0,137 ms. Leur somme rapportée aux 178 applications vaut 0,780 ms en moyenne, avec un maximum conjoint de 6,600 ms. Cette moyenne est une enveloppe de travail inclusif observé, pas une économie de projection commune démontrée. PlantCluster.update ajoute 145 appels à 0,057 ms par appel, déjà dans updateResources.

CropLayer.update inclut partition.read à 0,202 ms et les quatre batches. Leurs folds computeBoundingSphere totalisent 0,261 ms en moyenne par application ; ils sont déjà dans les batches et dans CropLayer. Le reste mélange membership, croissance, feuilles, matrices/couleurs et publication. Aucun timer par plante ne les sépare artificiellement. Un mesh créé pendant le premier update peut manquer sa première sonde bounds ; ce travail reste dans le batch, puis le nouvel owner est instrumenté à l'application suivante.

Les deux buildStructures observés durent 2,850 ms en moyenne/max 3,200, dont FurniturePresentation à 2,100 ms et patchFurnitureBatch à 2,050 ms imbriqués. Ces événements ne sont plus les reconstructions complètes de V240. Le plus gros apply, sample 5501 à 19,900 ms, contient updateResources à 10,800 ms et CropLayer à 1,400 ms ; son résidu observé vaut 0,200 ms. L'attribution des pointes utilise les vrais arbres de samples, pas la somme de maxima indépendants.

186 strictAdopt : moyenne 4,848/p95 9,300/max 11,800 ms ; 186 onSnapshot : 1,997 ms, dont foliageAdopt à 1,678 ms. Ces phases sont hors applyWorld. Les propriétaires faune et piles aussi appelés par frame sont séparés : 968 faune et 18 piles hors application ne sont pas ajoutés au budget apply. Les 1 936 appels renderer observés incluent main/ombre imbriqués ; ils ne donnent aucun budget GPU.

## Reprise et décision

Pause, drainage, sauvegarde et rechargement réels hors fenêtre : tick7363, roundtrip persistant exact, reprise appliquée, ancienne vue stable et3 266 270 comparaisons. Sources, 62 payloads et65 fichiers publics exacts avant/après ; erreurs vides. Contexte, navigateur et origine possédée5266 fermés ; sessions utilisateur préservées.

Le résidu soustrait seulement les enfants directement instrumentés : il conserve travail inconnu, installation et taxe des wrappers. Ce n'est pas du self time V8. Parents/descendants et quantiles ne s'additionnent pas ; une cible sans appel n'est pas un travail gratuit. Aucun profil V8, timestamp GPU, perte GPU ou écran240 Hz certifié ici. V252 clôt ce diagnostic sans changement produit ; toute refonte suivante exige son propre contrat d'exactitude et un gain complet mesuré, sans rejouer une piste rejetée inchangée.
