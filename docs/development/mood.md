# Humeur et pensées explicables — V64

L’humeur actuelle est une valeur sauvegardée qui converge vers une cible dérivée des pensées. Le joueur consulte les causes, leurs valeurs et l’échéance des souvenirs dans **Pensées et humeur**, dans l’inspection du colon. Ce lot remplace la moyenne instantanée faim/repos, sans annoncer un catalogue complet de crises ou de relations. V65 ajoute [l’errance triste et la catharsis](mental-break.md). [Sources et écarts](../research/mood-reference.md), [preuves](../history/validation-mood-v64.md).

## Règles présentes

Base neutre 32 ; le profil de camp à attentes extrêmement basses apporte +30. Ce profil est **fixe**, partagé avec le contrat de loisirs, pas un calcul de richesse. La cible est la somme de la base et des causes actives, bornée à 0–100. L’humeur s’en rapproche au plus de +12 ou −8 points par heure de jeu, sans dépassement. Intégration à chaque tick local de dix ticks Core : mêmes taux nominaux, cadence différente de l’intervalle Core de 150 ticks. L’humeur initiale de scénario reste 80 ; elle ne représente ni une pensée optimiste ni une parité du générateur de personnes Core.

| Cause | Seuil et effet |
|---|---|
| Faim | Sous 24 % : −6 ; sous 12 % : −12 ; à zéro : −20. Stades de malnutrition non simulés. |
| Fatigue | Sous 28 % : −6 ; sous 14 % : −12 ; sous 1 % : −18. |
| Confort | Sous 10 % : −3 ; à partir de 60/70/80/90 % : +4/+6/+8/+10. |
| Loisirs | Sous 1/15/30 % : −20/−10/−5 ; à partir de 70/85 % : +5/+10. |
| Douleur anatomique | Sous 0,0001 : aucune ; sous 15/40/80 % : −5/−10/−15 ; à partir de 80 % : −20. |
| Vêtement usé | Le plus faible ratio porté : strictement sous 50 % PV = −3 ; strictement sous 20 % = −5. Une seule pensée, jamais une pénalité par pièce. |
| Catharsis V65 | +40 pendant trois jours, au plus cinq occurrences avec multiplicateurs 1, 0,75, 0,75²… ; [conditions](mental-break.md). |
| Repas sans table / cru | Souvenirs −3 / −7 pendant un jour ; occurrence renouvelée sans cumul. Un bon repas n’efface pas l’ancien souvenir. |

Sommeil ordinaire, sommeil médical et perte de capacité d’éveil gèlent la jauge. **À terre ne signifie pas inconscient** : le blessé conscient peut encore voir son humeur évoluer. Le repos médical éveillé reste également sensible aux pensées. Les souvenirs expirent pendant le sommeil ; leur nettoyage continue sur les corps retenus après décès, sans faire évoluer leur humeur. Les pensées de situation n’ont pas d’échéance : retirer physiquement un vêtement fait cesser sa cause, réserver l’action ne suffit pas.

## Frontières et continuation

`src/sim/mood.ts` possède définitions et évaluation communes à la simulation et à l’inspection. Les faits viennent des besoins, du dossier anatomique, des pièces réellement portées et des deux souvenirs de repas. Les résultats de situation/cible ne sont pas persistés, aucun cache ne survit à une mutation du monde. L’évaluation réutilise la capacité corporelle calculée pour le tick ; la collecte des causes ne tourne pas par frame GPU. Les entrées de situation sont immuables ; la UI est mise à jour au rythme HUD, avec `textContent` et remplacement de liste seulement si ses valeurs changent.

`wellbeing.ts` conserve l’intégration du confort et la création des souvenirs ; `needs.ts` lui fournit la projection corporelle actuelle. `mood-inspection.ts` affiche cible/causes dans l’organisation existante, sans ajouter de commande simulée. Les phases de récolte, vêtements et vitesse ne changent pas de contrat de présentation.

V63 est strictement validée avant passage V64. Aucune nouvelle cause, mémoire, richesse ni histoire inventée : jauge, besoins, échéances, PRNG et tâches restent identiques au chargement. Les ticks suivants adoptent la nouvelle dynamique. La jauge conserve ses fractions dans la sauvegarde et les snapshots. Les limites/IDs des deux mémoires restent stricts. Pas de promesse de continuation identique entre règles V63 et V64 ; le rejeu V64 est exact.

## Limites assumées

Ce sont les premières causes explicables, pas le catalogue des pensées. Attentes selon richesse, difficulté configurable, traits, passions au travail, beauté/intérieur/pièces, sommeil au sol, nudité, qualité des repas avancés, deuil, opinions, interactions sociales, autres crises et inspirations restent absents. La nudité attend une couverture vestimentaire réellement représentée (pantalons encore cosmétiques). Famine sans progression de malnutrition conserve seulement le premier stade d’effet. Les règles générales de cumul social ne sont pas remplacées par le renouvellement simple des deux souvenirs présents.
