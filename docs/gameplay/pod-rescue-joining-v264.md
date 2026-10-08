# V264 — Un naufragé secouru peut devenir colon

La boucle V187 de capsule, portage, soins, alimentation et convalescence se termine désormais par une intégration volontaire ou un départ physique. Les nouvelles capsules distinguent les personnes indépendantes des civils affiliés à une faction extérieure. L’inspection affiche cette provenance et la suite de leur séjour.

## Comportement jouable

- Secourir reste un ordre direct : la décision de rester demande un véritable dépôt au lit et une admission, puis un relèvement médical. Une personne qui se rétablit seule dehors ne rejoint pas la colonie.
- Un indépendant admis décide une fois de rester ou de repartir. Le choix stable dépend de son identité : probabilité locale de 50 % en extérieur sûr, 100 % lorsque la température extérieure franchit les seuils de lésion déjà utilisés par le jeu, vêtements compris.
- Une arête, un portage ou un engagement physique en cours doit finir avant cette transition. Le choix peut donc suivre le relèvement de quelques ticks.
- S’il reste, c’est la même personne : blessures encore présentes, besoins, lit médical utilisé, soins en cours, compétences, passé et possessions sont conservés. Les priorités de travail et les politiques vestimentaires normales deviennent accessibles. Aucun objet ou personnage supplémentaire n’est créé.
- S’il repart, les soins et le repos continuent jusqu’à récupération ; il sort ensuite par la bordure avec ses possessions, selon le pipeline existant. La décision ne se rejoue pas si la météo change.
- Les civils affiliés sont soignés puis repartent. Une mort ou une capture clôt le dossier avant toute décision d’adhésion.

Les nouvelles capsules conservent les compétences initiales et les gains de leur passé ; les anciennes gardent leur génération historique. Le dossier d’une personne devenue colon conserve sa provenance après un voyage, une capture ou un décès ultérieur, sans devenir un second propriétaire du personnage.

## Référence et adaptations

Règle vérifiée dans le Core local 1.6.4871 rev590 : `Pawn_GuestTracker.Notify_PawnUndowned` permet l’adhésion automatique d’une personne sans faction, ou d’une faction autorisant `rescueesCanJoin`, après accueil. Le choix est stable par identité, à 50 % dans un extérieur sûr et garanti dans les conditions extérieures dangereuses reconnues par Core. Les Outlanders civils locaux n’ont pas cette permission. Le [code de référence consultable](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Pawn_GuestTracker.cs) est un miroir ; la copie locale versionnée reste la référence de cette vérification. Voir aussi la [recherche du secours V187](../research/pod-rescue-core-v187.md).

Adaptations locales explicites : moitié des nouvelles capsules indépendantes par sélection stable sur la graine ; affiliation technique neutre `outlanders` avec provenance indépendante explicite ; hash local plutôt que sortie RNG identique à Core ; danger selon les seuils thermiques physiologiques existants. Retombées toxiques et brume nocive ne sont pas ajoutées par ce lot. Il n’y a pas de nouvelle offre manuelle à accepter et aucune diplomatie générale livrée.

## Continuité et validation

Schéma **199** : les nouvelles origines et décisions sont strictement versionnées. Le lecteur valide le schéma 198 avant migration neutre ; une ancienne capsule sans origine ne reçoit aucune éligibilité rétroactive. Les 62 sauvegardes publiques et leurs métadonnées restent immuables. Le Decoder contrôle les mêmes liaisons lors des checkpoints et deltas ; une adhésion retire le mandat de patient invité et conserve le dossier comme histoire.

Validation groupée : **74 cas uniques dans 13 fichiers** couvrent secours et soins, admission, relèvement, adhésion/refus, capture/mort, portage, reprise, sauvegardes strictes et Decoder. Les 62 sauvegardes du catalogue sont décompressées, migrées et validées. Une continuation de 48 vrais ticks après adhésion accepte les ordres coloniaux et reste identique après sauvegarde/rechargement. Typage et build passent. Aucun fichier public n’est modifié.

Les deux erreurs initiales des nouveaux tests (accès optionnel TypeScript et enveloppe compressée lue comme un World) ont été corrigées ; seuls les contrôles concernés ont été repris. Les journaux `validate:logged` V264 restent sous `tmp/validation-runs`. La présentation native passe sur les parcours de minage et coupe avec changements de vitesse ; le premier lancement restreint n’avait pas pu démarrer Vite, puis le contrôle natif a passé en 120,908 s. Aucun saut, excès de déplacement continu ou occupation solide observé. Ce parcours ne constitue ni une campagne longue de colonie ni une mesure de gain FPS sur Les Aulnes.

Méthode : simulation, inspection et frontières développées ensemble ; une régression commune remplace les contrôles lourds à chaque sous-lot. Voir la [cadence révisée](../development/consolidation-v209.md#consigne-de-méthode-du-8-octobre-2026).
