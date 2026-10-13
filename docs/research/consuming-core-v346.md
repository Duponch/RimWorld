# V346 — consommation directe : référence Core et portée locale

13 octobre 2026. L’action manquante est le choix explicite d’un aliment pour le colon sélectionné. La lecture primaire établit son comportement ; elle ne qualifie pas encore le produit ni une campagne.

## Provenance

Core installé **1.6.4871 rev590**, assembly `E:/Steam/steamapps/common/RimWorld/RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. ILSpyCmd8.2 existant a extrait trois classes ciblées. [Provenance privée](../../tmp/early-access-v345/consume-reference/provenance.json) : commandes, empreintes, tailles et cinq classes complémentaires réemployées après contrôle des empreintes. Les sources décompilées restent privées.

| Classe | SHA256 de la sortie conservée |
| --- | --- |
| FloatMenuOptionProvider_Ingest | `af7cb4fcb58e0cf6e66fe793865acac7b90d5416a5f2c01afb0cdaf54c7af1f8` |
| JobDriver_Ingest | `21ddb2e9ec02b7d60cc4bacca67f1931fea87fdb27a9df72afa5ed2ccba00022` |
| FloatMenuOptionProvider | `6847f53a5217a86abb10740829b3a544c5ab434d7a198d21e55519ebc5180efa` |

Ces sorties peuvent inclure l’avis final du CLI, distinct du code. Analyse privée : `tmp/early-access-v345/consume-reference/findings.md`.

## Contrat primaire observé

Le provider Ingest propose l’action à un seul acteur, mobilisé ou civil, sur une cible alimentaire réelle disponible. Pour la nourriture il vérifie la compatibilité alimentaire de la race, sans appliquer le choix automatique du régime. L’impropriété sociale et les effets d’humeur ajoutent des avertissements ; ils ne sont pas tous des refus. Le callback défait l’interdiction de la pile et prend un travail explicitement forcé. Drogues, corps, inventaires, titres et DLC ont des branches distinctes.

La portion dépend du besoin nutritionnel, du maximum ingérable et du nombre disponible/réservable, avec minimum un. Le driver réserve, rejoint réellement la pile, prend la portion et la mâche. Les acteurs sans manipulation ont une autre voie au sol. Le mobilisé omet le trajet vers une place de repas et garde sa mobilisation ; le civil peut chercher une place pour manger. La nutrition et les conséquences sont appliquées à la fin de l’ingestion. Une commande ne nourrit pas immédiatement.

L’ordre remplace une activité interruptible et conserve ses obligations physiques. Ces classes ne prouvent pas une immunité aux dégâts ni la sécurité du trajet. Le garde global de chaque interruption et toutes les branches Core ne sont pas assimilés à une parité exhaustive.

## Tranche locale choisie

Humains libres locaux capables, pile alimentaire réelle au sol, réserve ou étagère ; portion unique, aucune file. Pâte nutritive déjà produite admise comme aliment, acquisition au distributeur hors lot. Manipulation et Eating nécessaires pour cette première voie à cargo ; corps, drogues, inventaires, nourrissons, cannibalisme et DLC différés.

Réemploi de `mealQuantity`, des réservations de sources et du kernel d’ingestion. **Aucun plafond10 de transport appliqué au repas** : les repas automatiques peuvent déjà porter14riz à faim30,20à faim0 si disponibles. Interdiction du régime et risques alimentaires sont des avertissements explicites ; les besoins civils automatiques conservent leur régime. Les zones civiles et portes physiques restent applicables, adaptation locale conservatrice. La mobilisation suspend la zone selon son contrat existant.

Une seule possession, un trajet capturé, une place réellement arrêtée et des réservations exclusives restent requis. Les dégâts, risques et expirations alimentaires continuent normalement. Le [lot produit](../gameplay/consuming-v346.md) porte seul les acquisitions de contrôles et leurs limites.
