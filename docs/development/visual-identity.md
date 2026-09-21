# Identité visuelle et inspection — V93

La référence fournie par l’utilisateur reste le HUD Lisière bois, papier et végétation : ressources en haut à gauche, portraits en haut, inspection en bas à gauche, alertes et temps à droite, gestion en bas. V93 en retient la hiérarchie et la chaleur sans étirer un décor raster autour de panneaux de tailles incompatibles. Le fond planétaire reste réservé à l’accueil et à la création de partie.

## Thème stable

- Les surfaces sont simples : papier ivoire `#f2eddf`, encre forêt `#28382f`, vert profond `#243c32`, traits gris végétal et ombres légères. Les panneaux, dialogues et menus emploient une bordure CSS stable. `panel-frame.png` est conservé comme création historique, mais n’est plus posé en `border-image` étirée.
- Source Sans 3 sert au texte courant et Literata aux titres. Les deux fontes WOFF2 sont embarquées sous `public/assets/fonts/`, avec leurs licences OFL (`SourceSans3-OFL.txt` et `Literata-OFL.txt`) ; le rendu ne dépend donc pas d’un service de fontes distant.
- Les tailles, états actifs, contrôles, listes déroulantes, tableaux et dialogues partagent le même contraste. Le panneau Architecte conserve trois responsabilités distinctes : catégories, grille d’outils et options. Ses zones se replient à largeur réduite sans changer les commandes.
- Le dossier d’un personnage garde ses onglets et son résumé fixes. `.colonist-inspector-pages` est la seule zone de contenu du dossier qui défile ; les actions physiques restent dans leur bloc inférieur borné. Les nœuds métier sont déplacés entre les pages, jamais clonés : identifiants, écouteurs et références de commandes sont conservés. Bio, Besoins, Santé, Équipement, Social et le dossier conditionnel Prisonnier restent ceux décrits dans la [référence d’interface](../research/colonist-interface-reference-v92.md).
- La hauteur réelle du panneau de temps continue de placer les alertes via `ResizeObserver`, sans lecture de disposition à chaque image. Le clic droit du canevas continue d’atteindre les commandes du jeu tout en masquant le menu contextuel du navigateur.

## Illustrations et pictogrammes

Les créations restent dans `public/assets/ui/lisiere/`. Elles ont été produites pour Lisière et ne proviennent pas des fichiers de RimWorld.

| Fichier | Format réel | Usage V93 |
|---|---|---|
| `planet.png` | RGB 1672×941 | accueil, planète à gauche et espace sombre à droite |
| `panel-frame.png` | RGBA 1254×1254 | asset historique préservé, sans étirement dans les panneaux courants |
| `icons.png` | RGBA 1122×1402 | atlas 4×5 du HUD, des désignations et des curseurs |
| `portraits.png` | RGB 1536×1024 | six portraits 3×2, Ada, Noé et Mina en première rangée |
| `architect-1.png` | RGBA 1374×1145 | 30 pictogrammes Architecte, grille 6×5 |
| `architect-2.png` | RGBA 1374×1145 | 30 pictogrammes Architecte, grille 6×5 |

Le fond demandé en haute résolution reste réellement livré en 1672×941, pas en 4K. Les six visages sont des illustrations de présentation ; les vêtements et le gilet restent projetés depuis l’équipement réel, et ces portraits ne prétendent pas simuler six biographies ou une diversité démographique complète.

Les deux nouveaux atlas donnent un pictogramme PNG à chacun des 60 outils déclarés par Architecte : sols et retraits, ordres, structure, meubles, température, loisirs, production, énergie et zones. `ARCHITECT_ICON_MAPPING` expose l’ordre exact des cellules. `installArchitectIcons` s’exécute après `installVisualIdentity`, remplace les anciens caractères par l’image correspondante et rend l’illustration muette pour l’accessibilité ; le bouton conserve son libellé accessible et sa commande. Les atlas HUD et portraits existants restent inchangés.

Les outils utilisent désormais neuf curseurs cohérents : sélection, minage, abattage, récolte, coupe, construction, déconstruction, zones et annulation. Ils sont rasterisés une seule fois depuis `icons.png` sur des surfaces 40×40, avec un point actif commun en `(4, 4)`. Déconstruction et annulation ajoutent leur badge au chargement ; les replis CSS restent utilisables si l’atlas échoue. Cette organisation remplace l’ancienne description de quatre curseurs, devenue inexacte.

## Architecture et périmètre

Le thème demeure une couche de présentation : `visual-identity.css` normalise les surfaces et les contrôles, `colonist-inspector.css` organise le dossier, `tool-cursors.ts` traduit l’outil actif en curseur, et `architect-icons.ts` installe les pictogrammes. Le HTML métier, les gestionnaires de commandes et les sélecteurs existants restent l’autorité. Les nouveaux assets n’ajoutent aucun outil et ne rendent disponible aucun contenu grisé.

V93 ne modifie ni règles de simulation, ni commandes, ni migrations du monde. Le schéma reste 91. Le stockage navigateur compresse désormais les grands instantanés sans perte, tout en lisant les anciens JSON : voir le [contrat de stockage](save-storage.md). L’herbe et les désignations dans le monde suivent séparément le [contrat GPU](gpu-landscape.md). Les [preuves V93](../history/validation-interface-v93.md) distinguent les corrections observées, les contrôles et leurs limites.
