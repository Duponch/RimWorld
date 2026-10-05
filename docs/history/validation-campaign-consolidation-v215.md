# Validation V215 — conservation, défense et entretien des campagnes

5 octobre2026. Base des campagnes initiales : V214 `c82c2040`, schéma195. [Contrat](../development/campaign-consolidation-v215.md), [référence et producteurs](../research/campaign-consolidation-v215.md). Le schéma reste195 ; aucun payload historique n'est régénéré.

## Ce qui est corrigé

- Défense automatique : un contact diagonal autorisé par `meleeContact` ne subit plus le second refus du rayon de tir. L'approche distante garde sa visibilité, et deux flancs fermés restent refusés. Le vrai producteur tente un coup ; hostilité, outils, incapacités, arêtes et récupération sont conservés.
- Namespace familial : les noms bruts de1à80caractères déjà admis par la shape Pawn restent valides et identiques avec famille, offres, sauvegarde et transport. Les gardes propriétaires des archives restent strictes.
- Pilotes : réponse de mêlée admissible au vrai contact et repli du pacifiste ; extension du Foyer aux empreintes des appareils installés ; déduplication des commandes Home dans le lot Environnement. Aucun incident, dégât, coefficient, stock ou compétence de campagne n'est forcé.
- Bilans : rendement humain des arbres vérifié au vrai producteur, avec ensemble indépendant des deux arrondis, quantité réelle créée et source consommée une seule fois. Pâture/repousse et pertes physiques sont suivies séparément. Un composant dépensé par `advanceBreakdownFix` est compté après vérification de sa pile livrée et de son retrait exact, en succès comme en échec. Perte étrangère, refus et travail inachevé ne gagnent aucun crédit.
- Reprises de pilote : carnets externes bois et réparation révisionnés dans les checkpoints, rapports et échecs bruts. Les anciens carnets sans cette instrumentation sont refusés ; aucun bonus ni entretien historique n'est reconstruit depuis un écart global.

## Cohorte longue initiale : rouge et conservée

Commande `post-v214-campaign`, de07:29:36à08:30:48Paris :3672,529s sur les sources et tests gelés de `c82c2040`. Treize fichiers,36cas réussis, sept échoués, deux ignorés. Huit fichiers passent : Simulation, Raid, Habitat habillement naturel et colonie, Colony player, Infection, Textile, Cooler. Cinq échouent :

| Campagne | Frontière observée | Diagnostic établi |
|---|---|---|
| Survivants, trois graines | Ticks250,2250,4250 ; excédents bois1,1,2 | Oracle nominal incompatible avec le bonus Plantes ; aucune duplication établie. |
| Atterrissage, graine42 | Tick3181 ; bois produit supérieur au nominal | Même oracle ; les deux autres cas courts passent. |
| Énergie | Tick275640, Ada à terre après un lièvre en rage | Contradiction de contact humain/animal et pilote répétant un tir inadmissible au contact. Recherche solaire, froid, batterie, nuit et coupure avaient été atteints. |
| Prison | Tick355989 ; cuisine non alimentée | Cuisine réelle en panne hors Foyer. Soins, alimentation et recrutement atteints ; le moteur refuse correctement cet entretien hors zone. |
| Environnement | Tick530750 ; composants33au lieu de34 | Remplacement effectivement accompli par Noé au tick530677, dépense ignorée par l'ancien bilan. L'identité précise de l'appareil n'est pas certifiée par le seul message. |

Les sept checkpoints d'échec sont copiés avec SHA256 et dates sous `tmp/validation-artifacts/post-v214-campaign/failed-checkpoints.json`. Journaux complets : `tmp/test-runs/post-v214-campaign-2026-10-05T05-29-36.122Z-10080/`. Le statut rouge initial n'est pas remplacé par un contrôle court.

## Contrôles finaux

- Quinze nouveaux cas dans cinq fichiers passent ensemble (`v215-producers-r2`,12,231s) : sortie/refus/perte étrangère bois, réparation avec continuation de World et carnet, succès/échec/pièce exacte, Home physique et couture de la vraie continuation V85, défense/pacifiste et noms historiques. Le contrôle voisin combat/mêlée/pannes passe37cas dans cinq fichiers (`v215-defense-cohort`,13,030s).
- Prévols réels des cinq campagnes : huit cas passent au premier contrôle ; le doublon Home Environnement est ensuite corrigé et son neuvième cas passe (`v215-environment-preflight-r2`,15,890s). Ces prévols ne sont pas des campagnes complètes.
- Typage final4,502s et build client1,704s passent. La régression générale **hors treize campagnes longues** passe542fichiers,2457cas et un ignoré (`v215-regression`,427,457s). Importation36% et tests61% des durées cumulées suivies par Vitest ; ces pourcentages ne sont pas une attribution du temps total de développement.
- Pas de nouveau rendu, shader, appareil ou format de partie. Aucun contrôle natif/presentation supplémentaire, fréquence naturelle, coût CPU/GPU général ou accélération du jeu complet n'est revendiqué.

Les premières préparations courtes ont échoué avant leurs objectifs : nutrition du lièvre hors plafond, Home vide, import `vi.hoisted` exporté, réseau incomplet, mauvais scénario pour le pilote complet, retrait Home sans cellule présente et deux erreurs de typage. Le prévol Environnement a aussi trouvé un vrai doublon de commandes du pilote. Ces journaux restent conservés ; leurs corrections ne détendent pas les gardes de production.

## Temps et suite

Avant le dernier contrôle documentaire, les18commandes `v215-*` enregistrent550,339s, soit9min10s ; neuf tentatives initiales échouent, puis les contrôles finaux passent. La cohorte initiale ajoute61min12s. Les commandes représentent donc une charge mesurée importante ; préparation, lectures, intégration, rédaction et coordination restent distinctes, et une partie de la future boucle monde est préparée pendant la cohorte. Aucun débit de génération en tokens/seconde n'est mesuré.

Une nouvelle cohorte longue doit partir des vraies préparations initiales et des sources finales, avec carnets nouveaux. Elle utilisera une copie figée du commit, dont chaque fichier suivi est haché, pour permettre la poursuite du développement sans modifier les sources en cours de contrôle. Son résultat sera consigné séparément. **Les cinq parcours complets corrigés ne sont pas encore déclarés verts dans cette preuve.** Aucun jalon G0–G5 n'est clos.
