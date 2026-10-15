# Survol, ressources et commandes — V380

16 octobre 2026 — schéma 242 inchangé. Correctif d’interface, sans nouvelle mécanique : le survol cherche une place libre parmi les rectangles effectivement occupés. Les ressources et le dossier cèdent seulement leur surface déjà défilante pour garder les commandes accessibles. Aucun texte n’est supprimé faute de place.

## Comportement

Le texte entier est placé au-dessus des commandes si possible, puis dans une autre région libre. Un texte trop haut peut devenir défilant ; sous le minimum géométrique du HUD, un panneau de lecture explicite reste visible. La rétention de sa cellule est uniquement une donnée de présentation pendant cette lecture ; le vrai pointerleave du renderer continue à fonctionner. Sortie, perte de focus, Échap, outil, panneau et changement de carte la libèrent. Le passage à une lecture entière relâche focus et interception du clavier.

Les dimensions du texte sont mesurées à la largeur réellement appliquée. Un seul propriétaire compose plafonds et position du dock, avec l’écart CSS déclaré. Les anciens observateurs qui écrivaient une hauteur retardée sont retirés. Les demandes viennent des changements de contenu, visibilité, taille, police ou groupe de commandes, regroupées en microtâche et bornées à quatre largeurs de mesure. Aucun nouveau calcul de disposition dans RAF, aucun World modifié. Une rafale d’événements reste un coût réel ; aucun gain FPS général n’est prétendu.

## Qualification

- Ciblés initiaux 17 cas/3 fichiers PASS9,955s ; après correction de stabilité, 18 cas/3 fichiers PASS9,752s. Géométrie, limites explicites, rétention, largeur fractionnaire, libération scroll/panel→whole, indépendance du plafond à une ancienne position et notifications conservées. Les doubles DOM ne prouvent pas ResizeObserver ou la cascade.
- Typage toutes sources + tests changés PASS16,597s puis final13,458s. Build Pages PASS3,476s. Pas de nouvelle migration ; corpus et présentation communs V379 inchangés réutilisés, aucune campagne longue ou banc FPS répété.
- Natif01 RED8,671s : sandbox réseau refuse localhost à Chrome avant interaction. Reprise avec accès local autorisé ; aucun défaut produit attribué à ce refus.
- Natif02 RED55,424s : vraie commande Ordres instable. Diagnostic séparé34,679s, non qualifiant :80frames montrent dossier457/477px, dock.top39/59px et ancienne hauteur inversée. Le plafond se nourrissait de la position décalée par un autre ResizeObserver. La correction remplace les deux écrivains par un seul ordre cap→pose inspecteur→dock→ressources ; aucun clic forcé ni tolérance relâchée.
- Natif03 Chrome/WebGPU PASS45,562s : scène préparée32² avec stocks finis déclarés, ledger étendu, grand Bio puis vrais trays Ordres/Zones aux tailles1280×720,1600×900,1920×1080 et1024×768. Chaque clic doit être stable ; texte entier non tronqué, rectangles survol/ressources/dock disjoints, bascule de carte et remise à zéro acquises. Six captures, quatre inspectées ROOT ; erreurs[], aucun incident simulation/graphique.

Les trois modes observés aux tailles courantes sont entiers. Aucun passage natif en lecture défilante n’est revendiqué : ses transitions sont couvertes par les tests d’interaction, pas par un mode forcé dans le navigateur. Le tray ferme légalement la sélection ; Bio+tray simultanés ne sont pas une combinaison fabriquée pour les captures. Le chevauchement résiduel du pied d’inspection avec l’horloge à1024px reste distinct, sans promesse de séparation de tous les HUD à toute taille.

Sorties sous tmp/hover-v380/ et tmp/validation-runs/v380-* ; parents et rouges conservés. Sources gelées04 de3303fichiers, vérifiées à la clôture. Les références fonctionnelles/visuelles datées du lot V379 et notre charte sont conservées ; ce placement est une adaptation à notre HUD3D, aucune nouvelle parité visuelle Vanilla annoncée.

## Livraison

Correctif qualifié, à publier avec les incidents V379 et l’actualisation cohérente des Aulnes qui suit. Dernière production confirmée avant ce groupe : V378/e5ec566c. Les anciennes sauvegardes et parties personnelles restent intactes.
