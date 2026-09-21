# Identité visuelle et inspection — V92

La référence visuelle fournie par l'utilisateur le 21 septembre 2026 est le HUD Lisière bois/parchemin, feuilles et fleurs, avec registre de ressources en haut à gauche, portraits en haut, inspection en bas à gauche, alertes et horloge à droite, barre de gestion au bas. Le fond planétaire fourni séparément gouverne l'accueil et la création de partie. Les futurs écrans suivent ce vocabulaire ; conserver les composants existants avant de créer un style indépendant.

## Vocabulaire partagé

- Parchemin crème `#ecd9b5`, texte brun `#463321`, bois sombre `#463b2c`, laiton, vert végétal. Corps lisible en Georgia ; les chiffres restent alignés. États sélectionnés crème/or, boutons désactivés atténués, focus clavier visible.
- Cadres illustrés découpés en neuf zones CSS : les angles conservent leurs dimensions pendant l'agrandissement. Les panneaux défilent intérieurement. La taille réelle de l'horloge détermine la position des alertes via `ResizeObserver`, sans lecture de disposition à chaque image.
- Onglets de gestion en bas. Dossiers d'une personne au-dessus de l'inspection : Bio, Besoins, Santé, Équipement, Social ; Prisonnier uniquement pour un captif. Les cinq premiers réutilisent les données et commandes réellement présentes. Recherche Core et captures : [référence V92](../research/colonist-interface-reference-v92.md).
- Le clic droit annule uniquement le menu contextuel du navigateur, sans arrêter sa propagation aux commandes du jeu. Le menu d'ordres demeure utilisable.
- Pictogrammes HUD et quatre curseurs d'outils partagent un atlas. Les curseurs 32² sont rasterisés une seule fois au chargement, pas par image. Les billboards du monde utilisent le même atlas via le GPU.

## Illustrations obtenues

Fichiers dans `public/assets/ui/lisiere/`, générés avec ImageGen puis contrôlés visuellement et par lecture de leurs métadonnées. Ils sont des créations pour Lisière, pas des assets extraits de RimWorld.

| Fichier | Format réel | Usage |
|---|---|---|
| `planet.png` | RGB 1672×941 | planète à gauche, espace sombre à droite ; régénération de la référence fournie |
| `panel-frame.png` | RGBA 1254², transparence réelle | cadre bois/laiton, lierre/fleurs, parchemin central |
| `icons.png` | RGBA 1122×1402, transparence réelle | atlas régulier 4×5 ; pioche/hache/faucille/cisailles en première rangée |
| `portraits.png` | RGB 1536×1024 | six portraits illustratifs 3×2 sur fond crème, Ada/Noé/Mina dans la première rangée |

Intentions des prompts : reprendre la chaleur et les matières de la référence, garder des silhouettes lisibles en petit, isoler régulièrement les pictogrammes et conserver la composition du fond. Les premiers essais d'icônes/portraits avaient un faux damier opaque : rejetés. L'atlas final et le cadre ont un vrai canal alpha ; les portraits emploient volontairement un fond crème. La demande de résolution supérieure n'a pas produit de sortie 4K : la dimension livrée du fond reste 1672×941, sans revendication d'upscale haute résolution.

Les six visages sont des illustrations de présentation, pas une génération complète de visage/âge/biographie. Les couleurs de vêtements et le gilet restent projetés depuis l'équipement réel. Les six visages ne prouvent pas une diversité démographique simulée. L'identité et les zones du mockup sont reprises ; une reproduction pixel pour pixel et toute l'interface Core ne sont pas revendiquées.

## Contrats et limites

Les nœuds d'inspection sont déplacés, jamais clonés : identifiants, écouteurs et références de commandes survivent. L'onglet actif est conservé lorsqu'on change de personne ; Prisonnier revient à Bio quand ce dossier n'existe plus. Navigation clavier par flèches, Home/End et rôles ARIA liés.

Les résolutions de bureau 1280×720, 1440×1000 et 1920×1080 ont des frontières vérifiées ; le petit écran reste une adaptation avec défilement, pas une certification mobile. Les contenus métier restent ceux de V91, schéma 91 conservé. L'herbe et les icônes suivent le [contrat GPU](gpu-landscape.md). Estimations fonctionnelles et calendrier uniquement dans [ROADMAP](../ROADMAP.md#estimation-davancement).
