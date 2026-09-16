# Indépendance des colons à la création — correctif V47

17 septembre 2026. Les contrôles de construction ont reproduit une nouvelle partie avec `moveCooldown=5.15`, aucune arête et `comfort=46.192`, malgré les valeurs littérales initiales 0 et 50. Les personnes étaient distinctes ; certains nombres reprenaient ceux d'un acteur modifié dans une partie précédente.

## Reproduction et portée du diagnostic

Sous Node **24.11.1 / V8 13.6.233.10-node.28**, sans Vitest ni Vite : créer une carte 32², contrôler confort/délai initiaux du premier colon, écrire 46.192 et 5.15, puis recommencer. Avec l'ancien littéral dans `generateWorld`, l'échec survient à la sixième création observée. Un bundle JavaScript autonome reproduit aussi l'échec. Le même bundle lancé avec `--jitless` passe soixante créations ; `--no-opt` seul n'est pas une preuve suffisante, la reproduction TypeScript échoue encore avec ce drapeau.

Ces observations isolent une dépendance au chemin d'exécution optimisé du runtime local ; elles ne prouvent ni un défaut dans toutes les versions de V8, ni un bug identifié par un numéro amont. Les [explications V8 sur champs numériques et formes](https://v8.dev/blog/react-cliff) décrivent les représentations internes pertinentes, sans constituer une confirmation de cette anomalie précise. Aucun flag JIT n'est imposé au jeu ou aux tests livrés.

## Correction et garde-fou

`starting-pawns.ts` possède une petite fabrique dédiée, appelée depuis le générateur de terrain. Le grand parcours de carte n'alloue plus son littéral de personnage dans sa boucle. Profils de scénario, nombres initiaux, PRNG et règles restent identiques ; aucune remise à zéro d'un colon chargé ou déjà joué. Cette extraction réduit aussi le mélange des responsabilités terrain/personnes.

La reproduction directe passe soixante créations après extraction, avec les optimisations normales. Le scénario existant de génération répète désormais cette création et compare **tout le profil** après mutations numériques fractionnaires, XP et horaires d'une partie précédente. Les fixtures de construction contrôlent aussi leurs délais initiaux ; le validateur de sauvegarde garde son rejet et enrichit le diagnostic en cas d'arête manquante. Voir [validation](validation.md) pour les exécutions finales.

La création n'est pas dans la boucle des ticks ni des frames. Les mesures de soins CPU/WebGPU restent des mesures de leur exécution, pas de cette allocation initiale. Une prochaine mise à jour de Node doit refaire la reproduction avant de retirer un éventuel contournement ; ne pas assimiler une relance réussie à une résolution.
