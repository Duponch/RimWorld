# Marques des ordres dans les champs — V437

19 octobre 2026, schéma263 inchangé. Correction visuelle demandée à partir
d’une capture de champ : certaines cases portaient un carré cyan comparable
à une sélection alors qu’elles n’étaient pas sélectionnées.

Le producteur commun des marqueurs dessinait encore ce fond pour les tâches
automatiques de semis. Les récoltes et coupes avaient déjà leurs pictogrammes
et ne produisaient pas ces carrés. Le fond des semis est supprimé, ainsi que
les fonds redondants des désignations ayant déjà un pictogramme : démontage,
désinstallation et retrait de sol. La liste est partagée avec la couche des
pictogrammes, sans modifier leur placement, leur taille ou leur admissibilité.

Le Core installé est RimWorld1.6.4871 rev590. Dans
`Data/Core/Defs/Misc/Designations/Designations.xml`, `CutPlant` et
`HarvestPlant` utilisent une texture dédiée et ciblent une `Thing` ; ce ne
sont pas des remplissages cyan de cellule. La catégorie des ordres et
l’outil de zone de culture sont distincts dans `DesignationCategories.xml`.
Il s’agit d’une vérification des définitions primaires locales, sans capture
native de leur raster ni revendication de correspondance exacte des pixels.
Aucun code ou asset propriétaire copié.

Les vraies sélections, survols et tracés temporaires restent distincts et
inchangés. Les plans, matériaux déposés, ossatures et progressions des
constructions gardent leur représentation. Les deux chemins de présentation,
monde complet et intentions confirmées, utilisent la même correction.
Aucune règle de travail, sauvegarde ou horloge modifiée ; aucun gain FPS
revendiqué et aucun banc FPS rejoué pour ce correctif cosmétique.

## Vérification

Relecture indépendante sans défaut identifié. Les quatre fichiers existants
de contrôles des marqueurs confirmés, pictogrammes, arbres et ponts donnent
20PASS/1RED en74,823s. Les cas de plans, phases, annulation, frontière de
découverte et géométrie des ponts passent. Le rouge est le survol de pont
V387 : sa source contient déjà `Support lÃ©ger uniquement` à la place de
`Support léger uniquement`. Ce texte est identique dans le HEAD précédent ;
aucune assertion ni source de survol modifiée. Le groupe n’est pas déclaré
entièrement vert. Journal conservé sous
`tmp/validation-runs/v436-markers-2026-10-19T20-54-37.857Z-29876/`
(libellé initial réutilisé avant constat du lot V436 déjà publié).

Contrôle graphique réel Chrome155/WebGPU AMD RDNA1 par le navigateur intégré :
départ de diagnostic32², zone de12cases tracée par l’interface, simulation
réelle puis pause. Les pictogrammes automatiques de défrichage restent
visibles, un ordre d’abattage explicite ajouté par clic affiche sa hache sans
fond cyan. Un plant de riz réellement semé est sélectionnable avec ses
crochets blancs et son inspection à0% ; la sélection réelle reste donc active.
Aucun avertissement ou erreur console capturé. Deux captures inspectées,
rapport `tmp/designation-ground-v437/browser-check.json`. Le chargement
graphique initial prend plusieurs minutes ; ce délai n’est pas amélioré par
ce correctif. Pas de sauvegarde humaine chargée, modifiée ou remplacée.

Typage et build Pages acquis ensemble en40,481s. Liens de documentation
acquis en3,688s après refus d’accès au lanceur Python dans le bac à sable ;
le premier reçu d’échec d’environnement est conservé.
