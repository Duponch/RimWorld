# Validation courante — croissance thermique et critères de partie V39

15 septembre 2026. [Contrat V39](../development/plant-temperature.md), [recherche](../research/plant-temperature-reference.md), [retour d’expérience](../development/playability-validation.md), [bilan joueur](../gameplay/implementation-status.md). Le correctif des vitesses et ses mesures sont conservés dans l’[archive V38](../history/validation-v38-speed-response.md).

## Simulation et reprise

Le lot agricole, thermique, bridge et pilote passe : **12 tests dans quatre fichiers, 120,41 s**, comprenant cinq à huit jours sur trois cartes naturelles. Les bilans de nourriture, bois, constructions, repos et production demeurent cohérents ; le profil quotidien tempéré n’introduit aucun checkpoint thermique végétal inutile. Le pilote expose maintenant ralentissements et ancres des plantes.

Le lot final de migrations et de critères de présentation passe : **47 tests dans treize fichiers, 7,89 s**. Les deux nombres se recouvrent : ce n’est pas un total de tests indépendants. Un oracle de croissance par tick ne réutilise ni l’intégrale ni le calcul de taux du moteur. Il traverse froid, chaleur, retour normal, lectures irrégulières, toit, ouverture d’enceinte, sauvegarde et deltas. Les semis non acceptés sont refusés/supprimés hors plage ; un semis engagé se termine ; le riz mûr reste récoltable. V38 est strictement validée avant V39, les facteurs illégaux et anciens champs ajoutés sont refusés.

La revue a aussi étendu le refus aux anciens défrichages agricoles non acceptés devenus incompatibles avec le froid ; les neuf tests thermiques/agricoles ont été rejoués et passent en 2,77 s.

Les quatre familles restantes dont les attentes de migration ont changé (priorités, toiture, simulation et génération) passent aussi : **18 tests en 38,57 s**.

Le test des métriques emploie les mêmes assertions que le banc natif et exige le rejet des délais historiques de 416–424 ms. Il accepte les traces corrigées puis refuse observations manquantes, famine de snapshots, saut et retrait anticipé. L’oracle ne déduit pas la réactivité attendue du buffer interne.

`npm run build` passe : 198 modules, worker environ 232 kB, bundle principal 1 078,59 kB / gzip environ 303 kB. L’avertissement existant de bundle supérieur à 500 kB demeure. La partie UI de trois jours n’a pas été rejouée : la nouvelle interaction est couverte par le parcours thermique ciblé, et le pilote cœur complet a été exécuté.

## Parcours navigateur et observation

Chromium natif WebGPU, AMD RDNA-1 / Ryzen 5 3600, 1440×1000. Culture/semis/récolte/sauvegarde : **10,2 s**, buisson persistant/récolte/coupe : **11,4 s**. Le premier essai de pièce froide a été refusé par le contrôle de hit-test : le tracé visait une carte de colon dans l’UI. La fixture a été recentrée, sans injecter la commande à la place du geste.

Le parcours froid final charge seulement son air initial synthétique. Il trace un champ par l’UI, constate zéro croissance et zéro nouveau semis pendant 60 ticks froids, construit et ravitaille un feu, puis constate reprise du semis et progression affichée de 20 à 21 %. Une continuation sans feu confirme une température au moins 3 °C plus basse au même tick ; le soleil seul ne suffit donc pas à expliquer le réchauffement observé. Sauvegarde/rechargement et absence d’erreur sont vérifiés. Les captures froide et réchauffée ont été inspectées. Le dernier passage dure **11,4 s** (12,5 s avec lancement du runner).

Le [contrôle natif de présentation](../../artifacts/harvest-sync-v39-validation.json), désormais inclus dans `npm run check`, passe avec les deux zones naturelles de 45 s et **44 changements** de vitesse. Réponse observée **8,1–54,3 ms**, zéro saut, pénétration dans roche affichée, frame affamée après amorçage ou retrait prématuré détecté. Frames p95/p99 : **4,3/8,4 ms** ; maxima 16,8 ms pour le minage et 37,6 ms pour l’abattage. Les conditions diffèrent des scènes synthétiques agricoles et ne garantissent pas les mêmes résultats sur d’autres charges.

## Audit agricole CPU

[Rapport brut](../../artifacts/plant-temperature-cpu-v39.json), [script](../../scripts/plant-temperature-bench.ts). Node 24.11.1, Ryzen 5 3600, sans rendu concurrent. Carte synthétique 250², 3/30/100 cultivateurs et autant de pièces de 16 cellules, trois ouvertures de toit par pièce ; un riz présent et deux semis réels par colon. Air initial 21 ou 3 °C, puis échange thermique normal pendant 900 ticks. Toutes les cultures attendues existent : **9, 90 et 300 plants** ; pic de travailleurs engagés : 3, 30 et 92. Reprise exacte vérifiée.

| Colons | Tick p95 à 21 °C | Tick p95 à 3 °C | Maximum froid | Clonage p95 froid |
|---|---:|---:|---:|---:|
| 3 | 0,403 ms | 0,855 ms | 17,090 ms | 0,579 ms |
| 30 | 1,597 ms | 1,592 ms | 14,475 ms | 2,043 ms |
| 100 | 20,339 ms | 20,560 ms | 36,986 ms | 5,526 ms |

Les plantes initiales à 21 °C restent inchangées dans leur stockage. Le froid ne parcourt que les groupes dont le facteur varie. Ces résultats ne sont pas un benchmark isolé de cette fonction : ils incluent travail, navigation et thermique. À cent colons, les pointes de décisions simultanées restent importantes et peuvent réduire la vitesse effective maximale. Le maximum de clonage inclut le premier checkpoint complet (jusqu’à 54,14 ms), distinct de la cadence courante. Ce banc sans forêt ni rendu ne prouve pas une fluidité graphique à cent cultivateurs.

## État et limites

G0 en consolidation, G1 partiel, G2 en cours. Croissance thermique et suspension des nouveaux semis sont livrées ; mortalité/feuillage, saisons, autres biomes et cultures restent absents. La prochaine étape est le refroidissement passif. Aucun appareil froid n’est implicitement livré par une fixture glacée. Les coûts des snapshots fréquents et de grandes décisions simultanées restent des points de performance suivis.
