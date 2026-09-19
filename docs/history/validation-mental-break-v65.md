# Validation V65 — errance triste

19 septembre 2026. [Contrat](../development/mental-break.md), [sources et contradictions](../research/mental-break-reference.md). Un contenu de crise jouable, pas un modèle complet de psychologie.

## Scénarios, régressions et migrations

Passe globale **313/313** (73 fichiers, 161,3 s), incluant les trois graines du pilote cœur sur cinq à huit jours. Après revue des interruptions et de la mobilité, **28/28 ciblés** (humeur, crise, mobilisation, cargaison ; 3 s). Les huit scénarios de crise regroupent exposition/hasard, gel selon éveil, travail/arête réels, refus atomiques, cargaison saturée, repas physique/régime, lit/horaire, durée/récupération, catharsis décroissante/expiration, migration V64 et corruption, continuation, repas interrompu, destination devenue mobilier, blessure + nuit + vêtement + marche lente. Les totaux ne s’additionnent pas en une nouvelle passe globale.

Échecs conservés : premiers tests ciblés 22/26, dont trois chemins d’errance non autorisés par l’ancien validateur et une fixture de lit sur une pile ; corrigés, puis 26/26. Typecheck a ensuite détecté une tuple readonly de commandes dans le test, corrigée sans changer les règles. Une première fixture UI dormait normalement avant le tirage de crise : elle est désormais explicitement alignée sur une exposition déjà acquise, vérifiée au premier tick. Ce n’est pas une crise naturellement provoquée par le pilote de camp.

L’audit mixte a révélé un état de marche lente blessée rejeté par la borne de sauvegarde. Régression étendue jusqu’au cumul blessure + nuit + gilet + diagonale, puis fin de crise sans retimer l’arête et rejeu exact. Revue rétroactive : V63/V64 oubliaient déjà le malus du gilet dans cette borne ; la validation admet maintenant le facteur effectivement produit, sans changer les anciennes arêtes. V65 ajoute la demi-vitesse et la borne temporelle correspondante, avec durée exacte toujours vérifiée. La fixture élargie a aussi été corrigée pour avancer réellement la santé au lieu de déplacer son horloge seule. Aucun relâchement de conservation ni suppression d’assertion métier. Une revue supplémentaire a reproduit une destination effacée alors que la recherche de repas était différée faute de budget de navigation ; corrigé en conservant cible et chemin tant qu’aucun besoin réel ne les remplace ; scénario reproduisant le budget nul, puis continuation exacte quand le budget redevient disponible.

## Interface et présentation

UI native 1×/6× : première passe réussie en 34,7 s, puis **passe finale réussie en 36,4 s**, avec remobilisation réellement acceptée après récupération. Déclenchement worker depuis une exposition préchargée, arrêt de l’attribution des travaux, alerte/portrait/inspection, bouton Mobiliser indisponible, errance physique, sauvegarde/rechargement exact en mouvement, couchage réel et catharsis +40, sauvegarde après récupération. Passe finale : à 1× épisode observé tick 3013 → 3176, à 6× 3021 → 3179 ; récupération réelle tick 3175 / 3175. Aucun diagnostic navigateur. Capture inspectée : pensées lisibles et FPS toujours présent. [Preuve compacte](../../artifacts/mental-break-ui-v65.json). Le travail réellement engagé est interrompu dans le scénario cœur complémentaire ; le parcours UI ne prétend pas l’avoir observé avant son premier tick.

Garde minage/abattage : **deux parcours de 45 s réussis**, chacun 22 changements de vitesse, zéro saut et zéro pénétration rocheuse détectés, aucune starvation après amorçage. Délai maximal observé après changement de vitesse 21,9 / 25,4 ms. Images p95 4,3 ms dans les deux cas, max 16,8 / 16,7 ms. Les gaps initiaux de remplissage restent dans les données, distincts des attentes en régime établi. [Données complètes](../../artifacts/harvest-sync-v65.json). Ces observations ne prouvent pas une fluidité parfaite dans toutes les parties.

## Charge mixte

CPU puis navigateur puis garde exécutés successivement, sources gelées pendant chaque mesure. Ryzen 5 3600, Node24.11.1, Windows11 10.0.26200, WebGPU natif AMD RDNA1, fenêtre1440×1000, carte250². Acteurs armés/vêtus, adversaires mobiles, tirs et mineurs ; `MENTAL_BREAKS=1` démarre l’errance d’un civil sur deux, soit 1/5/17 personnes sur 3/30/100 acteurs. Cette fixture isole une charge de crises coexistantes, pas leur fréquence naturelle. Les cas actuels diffèrent de V64 : ne pas attribuer leur différence de temps à une optimisation.

| Acteurs / crises initiales | Tick CPU p95 / p99 / max (ms) | Encodage p95 (ms) | Image p95 / p99 / max (ms) |
|---|---|---|---|
| 3 / 1 | 5.40 / 8.24 / 29.76 | 1.82 | 8.40 / 12.50 / 100.00 |
| 30 / 5 | 19.02 / 29.25 / 48.29 | 5.00 | 12.50 / 16.80 / 120.80 |
| 100 / 17 | 36.45 / 47.15 / 51.23 | 3.93 | 16.70 / 29.10 / 129.20 |

240 ticks par charge, premiers vingt conservés dans « tous ticks », jumeau de simulation et phases détaillées dans les données. À cent acteurs : 915 vols émis, 206 arrivées avec impact médical observées, 17 cases excavées ; pas de remise à zéro des blessures. Le natif ne crée aucun pipeline durant les fenêtres et ne rapporte aucune erreur. Pointes conservées : **pas de garantie 6× à cent acteurs**. [CPU](../../artifacts/shooting-cpu-v65.json), [worker/rendu](../../artifacts/shooting-native-v65.json).

## Colonie et contrôles finaux

**Parcours UI complet de trois jours réussi en 6,5 minutes**, départ ordinaire 250² et 162 décisions par la vraie interface. Tick final 18 066 : trois lits utilisés, table/trois tabourets, 28 cases couvertes, 15 cases cultivées, atelier/porte/générateur/lampe ; 20 repas cuisinés, 18 consommations observées, deux loisirs. Cinquante acier et trente-cinq blocs stockés, trente médicaments rangés, quatre vêtements portés, aucun chantier ordinaire restant. Bois conservé et nourriture réconciliée ; aucun diagnostic navigateur. Aucune crise sur ce camp bien entretenu : ce parcours contrôle la non-régression de la colonie, les crises sont exercées par les scénarios dédiés. [Preuve datée](../../artifacts/colony-three-days-v65.json). Ce succès complet ne supprime pas les échecs historiques V63/V64.

La garde et les mesures précèdent la dernière extension des bornes du validateur ; cette extension n’affecte ni simulation ni rendu. Le pilote complet utilise ces bornes. La correction finale du report de besoin faute de budget est ensuite couverte par les 28 scénarios ciblés et la nouvelle passe UI courte ; le long pilote n’est pas rejoué pour cette branche isolée. Build TypeScript/Vite final réussi, avertissement de bundle >500 kB inchangé. G0 en consolidation, G1/G2 partiels, G3 humain enrichi, G4/G5 ouverts. Prochaine priorité : traits utiles, puis relations selon leurs producteurs. Mode jour : fin de ce lot, puis attente de la relance utilisateur.

Contrôle documentaire final : 232 documents, 2 490 liens locaux vérifiés et trois originaux byte-identiques ; `git diff --check` passe.
