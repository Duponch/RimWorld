# Identité visuelle et inspection — V94

V94 conserve la structure de jeu introduite en V93 — ressources, portraits, dossiers, alertes, temps et barre de gestion — puis corrige les éléments qui se comportaient encore comme une page web. Les surfaces restent en papier ivoire et encre forêt, avec Source Sans 3 et Literata embarquées. Aucun cadre raster n'est étiré et les panneaux papier ne reçoivent pas de second fond sombre.

## HUD stable

- Le registre Ressources mesure toujours **216 px** de large. Il ne se compacte, ne masque ses libellés et ne disparaît plus lorsqu'un dossier ou un panneau de gestion est ouvert. Un chevauchement est admis sur une petite fenêtre, conformément au choix utilisateur.
- Les portraits gardent leurs noms visibles dans l'état sélectionné. Le survol s'applique à chaque portrait, sélectionné ou non, sans déplacer les autres cartes.
- Travail, Horaires et Affectations partagent une largeur de bureau stable et des colonnes fixes. Les tableaux n'ont pas de barre horizontale dans les trois résolutions vérifiées ; Copier/Coller ont la même largeur et un espacement constant.
- Faune utilise six colonnes fixes : chasse, animal, sexe, activité, position et actions. La santé reste une seconde ligne de la cellule Animal ; changement d'activité ou de position ne décale donc plus les commandes.
- Architecte conserve ses trois zones et ses 60 outils PNG. La fermeture par son bouton garde maintenant l'outil actif : le panneau libère la carte avant la désignation, puis Échap ou un autre panneau rend le curseur de sélection.
- Les dossiers Bio, Besoins, Santé, Équipement, Social et Prisonnier conditionnel déplacent toujours les vrais contrôles, sans dupliquer leurs identifiants ni leurs gestionnaires.

## Illustrations, atlas et curseurs

Les créations restent dans `public/assets/ui/lisiere/` et ne proviennent pas des fichiers de RimWorld.

| Fichier | Format réel | Usage courant |
|---|---|---|
| `planet.png` | RGB 1672×941 | accueil et création |
| `panel-frame.png` | RGBA 1254×1254 | création historique conservée, non étirée |
| `icons.png` | RGBA 1122×1402 | pictogrammes HUD et désignations |
| `portraits.png` | RGB 1536×1024 | six portraits 3×2 |
| `architect-1.png`, `architect-2.png` | RGBA 1374×1145 chacun | 60 outils Architecte |
| `cursors-v94.png` | RGBA 1312×1199 | neuf curseurs illustrés en grille 3×3 |

`cursors-v94.png` a été généré pour Lisière à partir d'un prompt demandant une planche 3×3 transparente de flèches normales, lisibles et cohérentes avec le papier/forêt : sélection, pioche, hache ; récolte, coupe, construction ; déconstruction, zones et annulation. La flèche seule porte le point actif ; aucun point ou réticule séparé n'est dessiné.

`tool-cursors.ts` découpe l'atlas une seule fois dans des canevas locaux, recadre l'alpha et calcule le point actif depuis la pointe opaque la plus haute. Chaque outil reçoit un vrai curseur distinct et un repli CSS utilisable. Le point actif observé reste dans les six premiers pixels horizontaux et les trois premiers verticaux du fragment recadré.

## Frontières

Cette couche ne crée ni objet, ni recette, ni règle de simulation. Le schéma du monde reste **91**. Les grandes sauvegardes restent compressées au stockage seulement et les anciens JSON bruts restent lisibles. Les plantes suivent le [contrat de paysage V94](gpu-landscape.md) et les mesures, échecs et limites sont consignés dans les [preuves V94](../history/validation-interface-v94.md).
