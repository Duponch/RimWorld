# Régulation du troupeau — référence Core V318

Relevé du 11 octobre 2026 avant engagement : installation locale **RimWorld Core 1.6.4871 rev590**, version et SHA256 du binaire relus : `5CF1B5BE399D5B1C9C56CA72C9D35B4ECF307FEACF5859D04AC5A1AA5926356A`. Les extractions fraîches ILSpy/XML après V316 sont conservées dans [la provenance privée](../../tmp/functional-v317-reference/provenance.json) et [l'audit préparatoire](../../tmp/functional-v317-reference/auto-slaughter-scope.md). Ces références ne prouvent pas l'exécution d'Elsewhere.

## Règles adoptées

`Verse.AutoSlaughterConfig` définit cinq maxima par espèce au niveau carte : total, mâles adultes, mâles jeunes, femelles adultes, femelles jeunes. `-1` est illimité ; zéro peut supprimer tout le groupe admissible. Aucun minimum de reproducteurs n'est garanti. Petits et juvéniles sont jeunes ; les adultes ont atteint le stade reproductif.

`Verse.AutoSlaughterManager` compte les animaux possédés présents indépendamment des réservations et de leur disponibilité physique. Les gestantes protégées sont exclues des groupes femelles et total. Quand autorisées, elles sont ajoutées après les non-gestantes par progression de gestation décroissante. Les autres individus sont classés du plus âgé au plus jeune. Les maxima femelles adultes, femelles jeunes, mâles adultes, mâles jeunes puis total s'appliquent dans cet ordre ; chaque retrait quitte le total restant.

`WorkGiver_Slaughter` expose manuels et candidats du gestionnaire. `PawnUtility.ShouldBeSlaughtered` et `JobDriver_Slaughter` revalident leur union avant incision : retirer le manuel n'exempte pas des quotas, relever un quota conserve le manuel, et la protection automatique ne refuse pas un mandat manuel. Une modification de limite ne tue rien à distance.

## Source publique et divergence datée

Les [annonces officielles de juillet 2021](https://store.steampowered.com/news/posts/?appids=294100&enddate=1627490534&feed=steam_community_announcements) confirment le réglage des animaux liés et les gestantes après les autres animaux. L'annonce 1.3.3067 décrit un ordre des gestations du plus récent au moins récent ; la classe actuelle 1.6.4871 trie leur sévérité en sens décroissant. V318 suit le binaire actuel, sans attribuer cette règle à l'annonce ancienne.

## Adaptations et différés

Cinq espèces déjà domestiquables seulement. Aucun Bond humain-animal n'existe localement : parenté et familiarité ne le remplacent pas, aucun bouton fictif n'est affiché. La gestation locale est entièrement visible, contrairement à la distinction Core cachée/visible du compteur UI. Un départage par ID fixe le déterminisme à âge/progression égaux.

Temps et classement V309 conservés : dix-huit ticks locaux et abattage devant conduite, adaptation déjà déclarée. Lord, inventaire animal déchargé, dryades, libération sauvage et idéologies sont absents. Aucun cache Core exhaustif ni parité complète n'est annoncé. La sélection locale est dérivée des vrais résidents et limites, sans liste d'IDs persistée ni tirage aléatoire.

Frontière locale des secours : un mandat automatique suspend une nouvelle prise en charge, mais ne révoque pas un portage déjà engagé ; le dépôt physique termine avant réadmission de l'abattage. Cette règle conserve le claim et empêche un cycle de secours au même couchage. Ce détail d'intégration est une adaptation aux tâches locales, pas une parité Core de tous les services médicaux.
