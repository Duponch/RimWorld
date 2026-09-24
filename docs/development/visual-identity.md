# Identité visuelle et inspection — V100

## Référence actuelle V100

La capture fournie le 25 septembre remplace l’habillage précédent : papier crème `#f8edd8`, papier ombré `#e9d7b8`, encre forêt `#293d39`, texte secondaire `#6e7161`, filet miel `#d8c7a6` et accent `#ab813d`. Titres Literata affirmés, texte Source Sans 3, cadres géométriques arrondis et boutons beige légèrement en relief. Les illustrations, atlas et curseurs existants sont réutilisés sans nouveau cadre raster étiré.

- **Ressources sans fond, bordure ou ombre de panneau**, largeur 216 px conservée. Icône, libellé et quantité ; un halo fin du texte garantit la lecture sur le paysage. Les anciens titre/pied et indications de chantier ne sont plus affichés dans ce registre.
- Barre inférieure crème, boutons individuels visibles, pictogrammes et libellés séparés. Les commandes futures restent grisées. Focus clavier intérieur discret, noms accessibles conservés.
- Inspecteur de case : illustration de catégorie, titre, position, faits avec valeurs fortes, état des ordres et actions. Environnement repliable ; aucune valeur ni action fictive reprise du contenu d’exemple.
- Dossiers humains/animaux : résumé, onglets, sections de lecture, commandes distinctes. Une seule lecture défilante pour le colon ; contexte de pièce rangé dans Besoins. Les nœuds et gestionnaires sont déplacés, sans copie.
- Travail/Horaires/Affectations peuvent couvrir le HUD pour disposer de toute la largeur. Colonnes stables, priorités alignées, sélection native personnalisée, Copier/Coller côte à côte, quatre couleurs sémantiques d’horaire. Architecte garde un cadre stable entre catégories.
- Accueil, création, chargement, recherche, commerce et dialogues utilisent la même palette. Les activations des événements historiques suivent le flux des alertes au lieu de positions fixes qui les recouvraient.

`visual-identity.css` définit les composants communs ; les feuilles des domaines gardent leur géométrie. `cell-inspector` ne reconstruit ses faits que quand le texte change. Aucun traitement DOM ajouté à la boucle de rendu par image, aucun flou d’arrière-plan requis par le nouveau thème. [Validation et limites](../history/validation-interface-v100.md).


V99 : [inspection animale et actions](interaction-feedback.md). Dossier Info/Santé cohérent avec les dossiers existants ; commandes de mobilisation en cases distinctes, sans superposition. Barre dorée proche et chemin bleu réel, adaptés au rendu 3D, sans DOM par acteur.

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
| `cursors-v95.png` | RGBA 1254×1254 | neuf formes sémantiques, une image par type |

V95 corrige l'interprétation de V94 : les outils Architecte partagent une **seule flèche normale**. Les autres images désignent une interaction : doigt pour un bouton/lien, sablier pendant la préparation, loupe pendant la molette, I pour le texte, main ouverte/fermée pour le déplacement, interdit pour un contrôle désactivé. Le redimensionnement diagonal est préparé pour une poignée qui en aurait besoin ; aucun panneau redimensionnable n'est ajouté.

L'atlas a été créé avec l'outil de génération d'images : neuf formes distinctes, fond transparent, ivoire/or/vert forêt, sans flèches supplémentaires ni point détaché. `tool-cursors.ts` découpe et recadre l'alpha une seule fois. La pointe opaque de la flèche et le bout du doigt servent de point actif ; les autres utilisent le centre ou le verre de la loupe. À 40 px, le point actif de la flèche est (2,1). `cursors.css` couvre les états réels de l'interface, avec repli CSS natif.

## Frontières

Cette couche ne crée ni objet, ni recette, ni règle de simulation. Le schéma du monde reste **91**. Les grandes sauvegardes restent compressées au stockage seulement et les anciens JSON bruts restent lisibles. Les plantes suivent le [contrat de paysage V95](gpu-landscape.md) et les mesures, échecs et limites sont consignés dans les [preuves V95](../history/validation-performance-v95.md).
