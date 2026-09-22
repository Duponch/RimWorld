# V94 — plantes 3D et interface stable

Validation du 22 septembre 2026 depuis V93 `40b1049`, sur `main`, mode jour. Le schéma du monde reste **91**. G0 reste en consolidation, G1/G2/G3 partiels, G4 engagé et G5 absent ; aucun jalon fonctionnel global n'est clos.

## Livraison

- Suppression complète de `GpuGrassLayer` et du champ de brins V92. Les herbes courtes et hautes sont de nouveau des objets 3D verticaux : sept tiges fines par touffe, silhouettes et teintes déterministes, un seul lot instancié résident.
- Registre Ressources toujours complet à 216 px, noms des portraits visibles, survol uniforme et neuf curseurs issus du nouvel atlas `cursors-v94.png`, avec pointe de flèche comme point actif.
- Travail, Horaires et Affectations élargis sans débordement horizontal ; Copier/Coller harmonisés. Faune garde six colonnes fixes quand activité, santé ou position changent.
- Le bouton de fermeture d'Architecte conserve l'outil actif. La carte redevient disponible pour la désignation ; Échap et le changement de panneau rendent la sélection.
- Aucun contenu physique, règle, migration ou schéma de sauvegarde n'est ajouté.

## Contrôles regroupés

| Contrôle | Résultat |
|---|---|
| Contrats courts paysage/HUD/panneaux/travail/horaires/faune | **17/17**, six fichiers |
| Typage et build | Réussis, 504 modules ; avertissement de gros bundle conservé |
| Parcours natif principal | **Réussi en 1,1 min** : accueil, création 250², cinq dossiers, 1280×720 / 1440×1000 / 1920×1080, 60 outils PNG, neuf curseurs, vraie coupe, panneaux, clic droit, sauvegarde et restauration à froid |
| Commerce 1280×720 | **Réussi en 26,3 s**, dialogue borné et vrai contact, sans erreur |
| Paysage A/B et sauvegarde | **Réussi en 40,2 s**, 13 350 instances, un lot `plant-cluster-layer`, ancien champ absent, identité sauvegardée |
| Minage complet par vrais clics | **Réussi en 42,8 s**, dégât repris, granite, acier, composants, transports et restaurations |
| Netlify public | **Réussi** : HTTP 200, trois personnes, ressources 216 px, nom sélectionné visible, 60 outils, neuf curseurs, trois tableaux sans débordement, six colonnes Faune, deux fontes, sept assets et aucune erreur JS/GPU |

Rapports : [interface](../../artifacts/interface-native-v94.json), [commerce](../../artifacts/interface-trade-v94.json), [paysage](../../artifacts/landscape-native-v94.json), [déploiement](../../artifacts/netlify-v94.json), [site public](../../artifacts/netlify-smoke-v94.json).

## Corrections et échecs conservés

Le premier contrôle de minage ne pouvait pas atteindre une case cachée sous Architecte. Agrandir les gestes de caméra ne résolvait pas le défaut d'usage : le panneau couvrait la carte. La correction conserve maintenant l'outil quand le joueur ferme Architecte, et les pilotes utilisent ce vrai bouton. Le scénario de minage complet passe ensuite ; aucune assertion métier n'a été retirée.

Le vieux scénario de priorité de chantier a révélé une lacune distincte : après coupe de l'arbre et livraison des douze bois, le cadre de lit reste en attente quand l'ordre forcé se libère et que Construction vaut zéro. Ce problème antérieur n'est pas masqué par une attente plus longue et reste à traiter avec la boucle des ordres prioritaires ; il n'invalide pas les désignations de coupe ou de minage vérifiées séparément.

Le parcours paysage initial cherchait une cible sous une canopée avec un point de clic devenu ambigu. La validation finale sépare l'observation A/B du rendu et les vraies désignations contrôlées. Les rapports réussis ne réécrivent pas les traces d'échecs locales.

## Mesures et limites

Sur le départ 250×250, le parcours principal observe **811 images**, intervalle p95 **37,5 ms**, maximum **66,7 ms** et débit **5,54×** pour 6× demandé. Le parcours paysage observe p95 **41,7 ms**, maximum **216,6 ms** et **5,64×**. Les fenêtres sont courtes, instrumentées et non comparables causalement à V93 ; elles ne prouvent pas la fluidité parfaite.

L'alternance du lot de plantes masqué/visible garde un p95 de **8,4 ms** dans les quatre fenêtres en pause, mais la médiane visible finale atteint 8,3 ms contre 4,2 ms dans la fenêtre masquée précédente. L'unique lot évite le coût CPU par plante et la multiplication des appels, sans rendre le coût graphique nul.

Déploiement Netlify `6ab2c1b9f16a9132fb8ec39b`, état `ready`, 22 fichiers, sur [Lisière](https://lisiere-duponch.netlify.app). Les sauvegardes restent locales au navigateur ; aucun compte, cloud ou CI Git n'est ajouté.
