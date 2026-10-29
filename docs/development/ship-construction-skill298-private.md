# Construction des équipements du vaisseau — seuil privé298

Le 29 octobre 2026, Source10 privée `d0102884` (schéma 298, 2098 sources) raccorde le seuil **Construction 8** de l'ordinateur du vaisseau et des capteurs au lecteur commun de construction. Source9 `99be310f` est conservée ; l'assemblage ajoute une seule source modifiée, `construction-materials.ts` (`43fb4b9e` → `ff353d8a`), et deux fichiers de tests portés (`a101ff05` / `e37b7632`). Tout autre contenu source reste exact. Aucun contenu298, jeu ou victoire n'est livré dans le produit par cette tranche ; aucun déploiement n'a eu lieu.

Les définitions privées déclaraient déjà le seuil 8, mais le lecteur commun renvoyait 0 pour ces deux nouveaux types : cette contrainte restait donc latente. Le raccord réutilise les gardes existants d'affectation et de poursuite du travail. Le seuil concerne **la compétence du bâtisseur** ; il n'interdit pas au joueur de poser le gabarit sans colon de niveau 8. Les anciens types conservent leurs résultats.

## Référence et portée

Root a fermé la primaire locale RimWorld **1.6.4871 rev590** le même jour, avec empreintes DLL `5cf1b5be` et `Buildings_Ship.xml` `5be6b82e` inchangées avant/après lecture. Les deux définitions exigent 8 ; `WorkGiver_ConstructFinishFrames` (`19fcdd83`), `GenConstruct` (`698cfdb4`) et `JobDriver_ConstructFinishFrame` (`4a1ae632`) confirment le contrôle des compétences à l'affectation puis pendant le travail. Le reçu privé `primary/provenance.json` est `b855653f`.

Cette preuve ferme le seuil et ses deux frontières étudiées. Elle ne prouve pas une identité exhaustive de construction, vitesse de travail, XP, échecs ou interface. Aucun code ni asset propriétaire n'est intégré.

## Vérifications acquises

Trois contrats fonctionnels distincts sont acquis sur des fixtures diagnostiques déclarées, avec compétences, recherches et matériaux préparés ; ils ne constituent pas une campagne jouée :

- Deux contrats portés vérifient les deux types : gabarit permis au niveau 7, affectation refusée à 7 et acceptée à 8 ; puis ouvrier réellement affecté réexaminé après une faute diagnostique 8→7, sans consommation supplémentaire de matériaux ni d'XP.
- Un nouveau contrat Source10 contrôle conservation et recharge Whole/OwnReload exactes après ce refus. Dans chaque branche, le même chantier est ensuite réellement réaffecté et réservé, avec progrès supplémentaire après un pas. Les branches avec et sans recharge restent identiques : Whole de 30539 octets, `537da689` pour l'ordinateur et `b4f58ee5` pour les capteurs. Le premier harness, non exécuté, est conservé ; la revue indépendante a renforcé l'oracle avant v2.

Une quatrième vérification est une mesure synthétique du lecteur : 7,5 millions d'appels par bras, avant/candidat **880,1828 / 878,2218 ms**, CPU **859 / 844 ms**. Les sommes 27 M/35 M diffèrent volontairement parce que les deux seuils passent de 0 à 8 ; les 13 autres arguments restent inchangés. Cette paire ordonnée partage JIT/GC et ne démontre ni gain causal, ni équivalence du débit du jeu, FPS ou GPU. Les deux contrats portés et cette mesure passent ensemble en 27,052 s ; le contrat supplémentaire de reprise passe séparément.

Le typage Source10 passe en 10,764 s et le build Pages privé en 3,936 s. Cette compilation conserve 21 avertissements d'URL d'assets non résolues au build, destinées à être résolues à l'exécution ; le paquet d'assets et leur affichage ne sont donc pas qualifiés par ce contrôle. Les avertissements de taille des chunks et d'import dynamique inefficace sont également conservés. Aucun contrôle Native/HTTP ni publication n'est déduit de ces résultats. Les reçus restent dans le dossier privé `construction8-source9-root` : `assembly-source10.json`, `qualification-tests.json`, `reader-cost.json`, `source10-whole-v2-tests.json`, `source10-whole-results/report.json` et les contrôles type/build.

Les six ensembles restent ouverts. Les dettes **PERF-V492-X6**, latence Home et coût adverse du retrait non attribué restent ouvertes ; le retrait `7ce1` n'est pas installé. La campagne humaine `94de/T3328` et le dernier ACTUAL QA `d474/Core98409` restent intacts, sans nouveau pas ni ordre. Cette tranche ne vaut ni acquisition réelle de l'IA ni achèvement de la chaîne de victoire.
